const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { auth, adminOnly } = require('../middleware/auth');

// POST /api/returns - Return an allocated asset
router.post('/', auth, adminOnly, async (req, res) => {
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

module.exports = router;
