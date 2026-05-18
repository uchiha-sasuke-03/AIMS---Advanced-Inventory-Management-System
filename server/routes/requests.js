const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { auth } = require('../middleware/auth');

// GET /api/requests - Get all requests (or own requests for employees)
router.get('/', auth, async (req, res) => {
  try {
    let query = `
      SELECT r.*, 
             u.name as user_name, u.email as user_email, u.department as user_department,
             c.name as category_name,
             a.name as asset_name, a.serial_number as asset_serial
      FROM asset_requests r
      JOIN users u ON r.user_id = u.id
      JOIN asset_categories c ON r.category_id = c.id
      LEFT JOIN assets a ON r.asset_id = a.id
    `;
    const params = [];

    if (req.user.role !== 'admin') {
      query += ` WHERE r.user_id = ?`;
      params.push(req.user.id);
    }

    query += ` ORDER BY r.created_at DESC`;

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching requests:', error);
    res.status(500).json({ error: 'Server error fetching requests' });
  }
});

// POST /api/requests - Create a new request (Employee)
router.post('/', auth, async (req, res) => {
  try {
    const { category_id, asset_id, request_reason } = req.body;
    const user_id = req.user.id;

    if (!category_id || !request_reason) {
      return res.status(400).json({ error: 'Category and reason are required' });
    }

    const [result] = await pool.query(
      `INSERT INTO asset_requests (user_id, category_id, asset_id, request_reason, status) 
       VALUES (?, ?, ?, ?, 'pending')`,
      [user_id, category_id, asset_id || null, request_reason]
    );

    res.status(201).json({ 
      message: 'Request submitted successfully', 
      requestId: result.insertId 
    });
  } catch (error) {
    console.error('Error creating request:', error);
    res.status(500).json({ error: 'Server error submitting request' });
  }
});

// PUT /api/requests/:id - Approve or Reject request (Admin Only)
router.put('/:id', auth, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Unauthorized access' });
  }

  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const { status, admin_notes, asset_id } = req.body; // status can be 'approved' or 'rejected'

    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Valid status is required' });
    }

    await connection.beginTransaction();

    // 1. Get the request details
    const [requests] = await connection.query(
      'SELECT * FROM asset_requests WHERE id = ?', [id]
    );
    if (requests.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Request not found' });
    }
    const request = requests[0];

    // Check if request is already processed
    if (request.status !== 'pending') {
      await connection.rollback();
      return res.status(400).json({ error: 'Request has already been processed' });
    }

    // Determine target asset id (either provided in PUT body or in original request)
    const targetAssetId = asset_id || request.asset_id;

    if (status === 'approved') {
      if (!targetAssetId) {
        await connection.rollback();
        return res.status(400).json({ error: 'Asset allocation is required to approve the request' });
      }

      // Check asset availability
      const [assets] = await connection.query(
        'SELECT status, name FROM assets WHERE id = ?', [targetAssetId]
      );
      if (assets.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: 'Asset not found' });
      }
      if (assets[0].status !== 'in_stock') {
        await connection.rollback();
        return res.status(400).json({ error: `Asset is not in stock (current status: ${assets[0].status})` });
      }

      // Calculate return date (default 1 year from now)
      const expectedReturnDate = new Date();
      expectedReturnDate.setFullYear(expectedReturnDate.getFullYear() + 1);

      // Create allocation record
      await connection.query(
        `INSERT INTO allocations (asset_id, user_id, expected_return_date, allocated_by, notes) 
         VALUES (?, ?, ?, ?, ?)`,
        [targetAssetId, request.user_id, expectedReturnDate, req.user.id, admin_notes || 'Allocated via approved request']
      );

      // Update asset status to allocated
      await connection.query(
        'UPDATE assets SET status = "allocated" WHERE id = ?', [targetAssetId]
      );
    }

    // Update request state
    await connection.query(
      `UPDATE asset_requests 
       SET status = ?, admin_notes = ?, actioned_by = ?, asset_id = ?
       WHERE id = ?`,
      [status, admin_notes || null, req.user.id, targetAssetId || null, id]
    );

    await connection.commit();
    res.json({ message: `Request successfully ${status}` });

  } catch (error) {
    await connection.rollback();
    console.error('Error actioning request:', error);
    res.status(500).json({ error: 'Server error processing request' });
  } finally {
    connection.release();
  }
});

module.exports = router;
