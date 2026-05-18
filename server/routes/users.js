const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { auth } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

// Configure upload directory for profile pictures
const uploadProfileDir = path.join(__dirname, '..', '..', 'uploads', 'profiles');
if (!fs.existsSync(uploadProfileDir)) {
  fs.mkdirSync(uploadProfileDir, { recursive: true });
}

const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadProfileDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const profileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed'), false);
  }
};

const uploadProfile = multer({
  storage: profileStorage,
  fileFilter: profileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// GET /api/users - List all employees
router.get('/', auth, async (req, res) => {
  try {
    const { search, department } = req.query;
    let query = 'SELECT id, emp_id, name, age, salary, email, department, designation, role, photo_path, created_at FROM users WHERE 1=1';
    const params = [];

    if (search) {
      query += ' AND (name LIKE ? OR emp_id LIKE ? OR email LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (department) {
      query += ' AND department = ?';
      params.push(department);
    }

    query += ' ORDER BY name ASC';

    const [users] = await pool.query(query, params);
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/users/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, emp_id, name, age, salary, email, department, designation, role, photo_path, created_at FROM users WHERE id = ?',
      [req.params.id]
    );
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(users[0]);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/users - Add a new employee
router.post('/', auth, uploadProfile.single('photo'), async (req, res) => {
  try {
    const { name, email, age, salary, department, designation, role, custom_emp_id } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required fields.' });
    }

    // Check if email already exists
    const [existingEmail] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existingEmail.length > 0) {
      return res.status(400).json({ error: 'An employee with this email already exists.' });
    }

    // Determine or generate emp_id
    let empId = custom_emp_id;
    if (!empId) {
      const [userCount] = await pool.query('SELECT COUNT(*) as count FROM users');
      const nextNum = userCount[0].count + 1;
      empId = `EMP${String(nextNum).padStart(3, '0')}`;
    }

    // Check if emp_id already exists
    const [existingEmpId] = await pool.query('SELECT id FROM users WHERE emp_id = ?', [empId]);
    if (existingEmpId.length > 0) {
      if (custom_emp_id) {
        return res.status(400).json({ error: 'An employee with this ID already exists.' });
      } else {
        let attempts = 0;
        let candidateId = empId;
        while (attempts < 100) {
          const [exists] = await pool.query('SELECT id FROM users WHERE emp_id = ?', [candidateId]);
          if (exists.length === 0) {
            empId = candidateId;
            break;
          }
          const randomNum = Math.floor(100 + Math.random() * 900);
          candidateId = `EMP${randomNum}`;
          attempts++;
        }
      }
    }

    // Hash default password
    const passwordHash = await bcrypt.hash('Password@123', 10);
    const parsedAge = age ? parseInt(age) : null;
    const parsedSalary = salary ? parseFloat(salary) : 0;
    const userRole = role || 'employee';

    // File path relative to static upload directory
    let photoPath = null;
    if (req.file) {
      photoPath = `/profiles/${req.file.filename}`;
    }

    const userDesignation = designation || 'Associate';
    
    let joinDate = new Date();
    if (req.body.created_at) {
      joinDate = new Date(req.body.created_at);
    }

    const [result] = await pool.query(
      'INSERT INTO users (emp_id, name, age, salary, email, department, designation, password_hash, role, photo_path, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [empId, name, parsedAge, parsedSalary, email, department || 'General', userDesignation, passwordHash, userRole, photoPath, joinDate]
    );

    const newUser = {
      id: result.insertId,
      emp_id: empId,
      name,
      age: parsedAge,
      salary: parsedSalary,
      email,
      department: department || 'General',
      designation: userDesignation,
      role: userRole,
      photo_path: photoPath,
      created_at: joinDate
    };

    res.status(201).json(newUser);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
