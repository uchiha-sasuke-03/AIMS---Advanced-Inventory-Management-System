const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { emp_id, name, age, salary, email, department, password } = req.body;

    if (!emp_id || !name || !email || !password) {
      return res.status(400).json({ error: 'emp_id, name, email, and password are required.' });
    }

    // Check if user already exists
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ? OR emp_id = ?', [email, emp_id]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'User with this email or emp_id already exists.' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      'INSERT INTO users (emp_id, name, age, salary, email, department, password_hash, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [emp_id, name, age || null, salary || null, email, department || null, password_hash, 'employee']
    );

    const token = jwt.sign(
      { id: result.insertId, emp_id, email, role: 'employee', name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.status(201).json({ message: 'User registered successfully', token, user: { id: result.insertId, emp_id, name, email, role: 'employee' } });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { id: user.id, emp_id: user.emp_id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, emp_id: user.emp_id, name: user.name, email: user.email, role: user.role, department: user.department }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
