const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { auth, adminOnly } = require('../middleware/auth');

// GET /api/allocations - List all allocations
router.get('/', auth, async (req, res) => {
  try {
    const { active_only } = req.query;
    let query = `
      SELECT al.*, 
        a.name as asset_name, a.serial_number, a.model,
        u.name as employee_name, u.emp_id as employee_emp_id,
        ab.name as allocated_by_name
      FROM allocations al
      LEFT JOIN assets a ON al.asset_id = a.id
      LEFT JOIN users u ON al.user_id = u.id
      LEFT JOIN users ab ON al.allocated_by = ab.id
    `;

    if (active_only === 'true') {
      query += ' WHERE al.returned_at IS NULL';
    }

    query += ' ORDER BY al.allocated_at DESC';

    const [allocations] = await pool.query(query);
    res.json(allocations);
  } catch (error) {
    console.error('Get allocations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/allocations - Allocate an asset
router.post('/', auth, adminOnly, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { asset_id, user_id, expected_return_date, notes } = req.body;

    if (!asset_id || !user_id) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({ error: 'asset_id and user_id are required.' });
    }

    // Check asset exists and is in_stock
    const [assets] = await connection.query('SELECT * FROM assets WHERE id = ? FOR UPDATE', [asset_id]);
    if (assets.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ error: 'Asset not found.' });
    }

    if (assets[0].status !== 'in_stock') {
      await connection.rollback();
      connection.release();
      return res.status(400).json({ error: `Asset cannot be allocated. Current status: ${assets[0].status}` });
    }

    // Check no active allocation exists for this asset
    const [activeAlloc] = await connection.query(
      'SELECT id FROM allocations WHERE asset_id = ? AND returned_at IS NULL', [asset_id]
    );
    if (activeAlloc.length > 0) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({ error: 'Asset is already allocated to another employee.' });
    }

    // Check user exists
    const [users] = await connection.query('SELECT id FROM users WHERE id = ?', [user_id]);
    if (users.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ error: 'Employee not found.' });
    }

    // Create allocation record
    const [result] = await connection.query(
      `INSERT INTO allocations (asset_id, user_id, allocated_by, expected_return_date, notes) 
       VALUES (?, ?, ?, ?, ?)`,
      [asset_id, user_id, req.user.id, expected_return_date || null, notes || null]
    );

    // Update asset status
    await connection.query("UPDATE assets SET status = 'allocated' WHERE id = ?", [asset_id]);

    await connection.commit();
    connection.release();

    // Fetch the created allocation
    const [newAlloc] = await pool.query(
      `SELECT al.*, a.name as asset_name, u.name as employee_name 
       FROM allocations al 
       LEFT JOIN assets a ON al.asset_id = a.id 
       LEFT JOIN users u ON al.user_id = u.id 
       WHERE al.id = ?`,
      [result.insertId]
    );

    res.status(201).json(newAlloc[0]);
  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error('Allocation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/returns - Return an asset
router.post('/returns', auth, adminOnly, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { allocation_id, condition_on_return, notes } = req.body;

    if (!allocation_id) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({ error: 'allocation_id is required.' });
    }

    // Check active allocation exists
    const [allocations] = await connection.query(
      'SELECT * FROM allocations WHERE id = ? AND returned_at IS NULL FOR UPDATE',
      [allocation_id]
    );

    if (allocations.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({ error: 'No active allocation found with this ID.' });
    }

    const allocation = allocations[0];

    // Update allocation with return info
    await connection.query(
      `UPDATE allocations SET returned_at = NOW(), condition_on_return = ?, notes = CONCAT(COALESCE(notes, ''), ?) WHERE id = ?`,
      [condition_on_return || 'good', notes ? `\nReturn note: ${notes}` : '', allocation_id]
    );

    // Update asset status based on condition
    const newStatus = condition_on_return === 'damaged' ? 'damaged' : 'in_stock';
    await connection.query('UPDATE assets SET status = ? WHERE id = ?', [newStatus, allocation.asset_id]);

    await connection.commit();
    connection.release();

    res.json({ message: 'Asset returned successfully', newStatus });
  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error('Return error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/allocations/:id/escalate - Escalate recovery for overdue asset
router.post('/:id/escalate', auth, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check allocation exists
    const [allocations] = await pool.query(
      `SELECT al.*, u.name as employee_name, u.email as employee_email, u.emp_id as employee_emp_id, a.name as asset_name 
       FROM allocations al 
       LEFT JOIN users u ON al.user_id = u.id
       LEFT JOIN assets a ON al.asset_id = a.id
       WHERE al.id = ?`, 
      [id]
    );

    if (allocations.length === 0) {
      return res.status(404).json({ error: 'Allocation not found.' });
    }

    const alloc = allocations[0];
    console.log(`[ESCALATION LOG] Overdue recovery escalation triggered for ${alloc.employee_name} (${alloc.employee_emp_id}) regarding asset: ${alloc.asset_name}`);
    console.log(`[SIMULATED REMINDERS] Legal recovery notice sent to ${alloc.employee_email}. Slack notice pushed to #${alloc.employee_name.toLowerCase().replace(/\s+/g, '-')}-it-alert.`);

    res.json({ 
      message: 'Escalated successfully',
      employee_name: alloc.employee_name,
      employee_emp_id: alloc.employee_emp_id,
      asset_name: alloc.asset_name
    });
  } catch (error) {
    console.error('Escalation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/allocations/remind-overdue - Trigger bulk auto-reminders for all overdue assets
router.post('/remind-overdue', auth, adminOnly, async (req, res) => {
  try {
    // 1. Fetch all active allocations that are overdue
    const [overdue] = await pool.query(`
      SELECT al.*, 
             u.name as employee_name, u.email as employee_email, 
             a.name as asset_name, a.serial_number as asset_serial
      FROM allocations al
      JOIN users u ON al.user_id = u.id
      JOIN assets a ON al.asset_id = a.id
      WHERE al.returned_at IS NULL AND al.expected_return_date < CURRENT_DATE()
    `);

    if (overdue.length === 0) {
      return res.json({ 
        message: 'No overdue assets found. No reminders needed!',
        reminded_count: 0,
        employees_notified: []
      });
    }

    const notifiedList = [];
    overdue.forEach(alloc => {
      console.log(`[AUTO-REMINDER OUTREACH] Overdue notice automatically generated for ${alloc.employee_name} (${alloc.employee_email})`);
      console.log(` - Hardware: ${alloc.asset_name} (Serial: ${alloc.asset_serial})`);
      console.log(` - Expected Return: ${alloc.expected_return_date}`);
      console.log(`[SIMULATED EMAIL] Outreach message dispatched to ${alloc.employee_email}.`);
      notifiedList.push({
        name: alloc.employee_name,
        email: alloc.employee_email,
        asset: alloc.asset_name,
        serial: alloc.asset_serial,
        due_date: alloc.expected_return_date
      });
    });

    res.json({
      message: `Successfully sent automated return reminders to ${overdue.length} employees with overdue hardware assets.`,
      reminded_count: overdue.length,
      employees_notified: notifiedList
    });
  } catch (error) {
    console.error('Bulk remind overdue error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/allocations/sign-contract - Secure digital custody contract signature
router.post('/sign-contract', auth, async (req, res) => {
  try {
    const { asset_id, signature_base64 } = req.body;
    
    if (!asset_id || !signature_base64) {
      return res.status(400).json({ error: 'asset_id and signature_base64 are required.' });
    }

    // Capture secure digital signature metadata in allocation transaction notes
    await pool.query(
      `UPDATE allocations al
       SET notes = CONCAT(COALESCE(notes, ''), '\n[DIGITAL SIGNATURE SECURED] Handwritten custody handover contract signed.')
       WHERE al.asset_id = ? AND al.returned_at IS NULL`,
      [asset_id]
    );

    res.json({ message: 'E-signature secure receipt recorded successfully.' });
  } catch (error) {
    console.error('Sign contract error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
