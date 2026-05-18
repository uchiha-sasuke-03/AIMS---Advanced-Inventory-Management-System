const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { auth, adminOnly } = require('../middleware/auth');

// Run automatic schema upgrade for scan_logs table on startup
(async () => {
  try {
    const connection = await pool.getConnection();
    await connection.query(`
      CREATE TABLE IF NOT EXISTS scan_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        asset_id INT NOT NULL,
        scanned_by INT NULL,
        scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
        FOREIGN KEY (scanned_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('✅ Database migration: scan_logs table verified');
    connection.release();
  } catch (err) {
    console.error('❌ Failed to run scan_logs schema migration:', err.message);
  }
})();

// GET /api/assets - List all assets with filters
router.get('/', auth, async (req, res) => {
  try {
    const { status, location, category_id, search, page = 1, limit = 20 } = req.query;
    let query = `
      SELECT a.id, a.category_id, a.name, a.model, a.serial_number, a.purchase_date, a.price, a.location, a.created_at, a.updated_at,
             CASE
               WHEN a.status = 'retired' THEN 'retired'
               WHEN EXISTS (SELECT 1 FROM allocations al WHERE al.asset_id = a.id AND al.returned_at IS NULL) THEN 'allocated'
               WHEN EXISTS (SELECT 1 FROM damage_reports dr WHERE dr.asset_id = a.id AND dr.resolved = 0) THEN 'damaged'
               ELSE 'in_stock'
             END AS status,
             ac.name as category_name,
             u.name as allocated_to_name, u.emp_id as allocated_to_emp_id
      FROM assets a 
      LEFT JOIN asset_categories ac ON a.category_id = ac.id 
      LEFT JOIN allocations al ON al.asset_id = a.id AND al.returned_at IS NULL
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    let countQuery = `
      SELECT COUNT(*) as total 
      FROM assets a 
      LEFT JOIN asset_categories ac ON a.category_id = ac.id 
      LEFT JOIN allocations al ON al.asset_id = a.id AND al.returned_at IS NULL
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      let statusFilter = '';
      if (status === 'retired') {
        statusFilter = " AND a.status = 'retired'";
      } else if (status === 'allocated') {
        statusFilter = " AND EXISTS (SELECT 1 FROM allocations al WHERE al.asset_id = a.id AND al.returned_at IS NULL) AND a.status != 'retired'";
      } else if (status === 'damaged') {
        statusFilter = " AND EXISTS (SELECT 1 FROM damage_reports dr WHERE dr.asset_id = a.id AND dr.resolved = 0) AND a.status != 'retired'";
      } else if (status === 'in_stock') {
        statusFilter = " AND NOT EXISTS (SELECT 1 FROM allocations al WHERE al.asset_id = a.id AND al.returned_at IS NULL) AND NOT EXISTS (SELECT 1 FROM damage_reports dr WHERE dr.asset_id = a.id AND dr.resolved = 0) AND a.status != 'retired'";
      }
      query += statusFilter;
      countQuery += statusFilter;
    }
    if (location) {
      const locFilter = ' AND a.location = ?';
      query += locFilter;
      countQuery += locFilter;
      params.push(location);
    }
    if (category_id) {
      const catFilter = ' AND a.category_id = ?';
      query += catFilter;
      countQuery += catFilter;
      params.push(parseInt(category_id));
    }
    if (search) {
      const searchFilter = ' AND (a.name LIKE ? OR a.model LIKE ? OR a.serial_number LIKE ?)';
      query += searchFilter;
      countQuery += searchFilter;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // Count total
    const [countResult] = await pool.query(countQuery, params);
    const total = countResult[0].total;

    // Pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [assets] = await pool.query(query, params);

    res.json({
      assets,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get assets error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/assets/:id - Single asset with details
router.get('/:id', auth, async (req, res) => {
  try {
    const [assets] = await pool.query(
      `SELECT a.id, a.category_id, a.name, a.model, a.serial_number, a.purchase_date, a.price, a.location, a.created_at, a.updated_at,
              CASE
                WHEN a.status = 'retired' THEN 'retired'
                WHEN EXISTS (SELECT 1 FROM allocations al WHERE al.asset_id = a.id AND al.returned_at IS NULL) THEN 'allocated'
                WHEN EXISTS (SELECT 1 FROM damage_reports dr WHERE dr.asset_id = a.id AND dr.resolved = 0) THEN 'damaged'
                ELSE 'in_stock'
              END AS status,
              ac.name as category_name 
       FROM assets a 
       LEFT JOIN asset_categories ac ON a.category_id = ac.id 
       WHERE a.id = ?`,
      [req.params.id]
    );

    if (assets.length === 0) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    res.json(assets[0]);
  } catch (error) {
    console.error('Get asset error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/assets - Create new asset
router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const { category_id, name, model, serial_number, purchase_date, price, location } = req.body;

    if (!category_id || !name || !serial_number) {
      return res.status(400).json({ error: 'category_id, name, and serial_number are required.' });
    }

    // Check unique serial number
    const [existing] = await pool.query('SELECT id FROM assets WHERE serial_number = ?', [serial_number]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'An asset with this serial number already exists.' });
    }

    const [result] = await pool.query(
      `INSERT INTO assets (category_id, name, model, serial_number, purchase_date, price, status, location) 
       VALUES (?, ?, ?, ?, ?, ?, 'in_stock', ?)`,
      [category_id, name, model || null, serial_number, purchase_date || null, price || null, location || null]
    );

    const [newAsset] = await pool.query('SELECT * FROM assets WHERE id = ?', [result.insertId]);
    res.status(201).json(newAsset[0]);
  } catch (error) {
    console.error('Create asset error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/assets/:id - Update asset
router.put('/:id', auth, adminOnly, async (req, res) => {
  try {
    const { category_id, name, model, serial_number, purchase_date, price, location } = req.body;

    // Check if asset exists
    const [existing] = await pool.query('SELECT id FROM assets WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    // Check serial number uniqueness if changed
    if (serial_number) {
      const [dup] = await pool.query('SELECT id FROM assets WHERE serial_number = ? AND id != ?', [serial_number, req.params.id]);
      if (dup.length > 0) {
        return res.status(409).json({ error: 'Another asset with this serial number already exists.' });
      }
    }

    await pool.query(
      `UPDATE assets SET category_id = COALESCE(?, category_id), name = COALESCE(?, name), 
       model = COALESCE(?, model), serial_number = COALESCE(?, serial_number), 
       purchase_date = COALESCE(?, purchase_date), price = COALESCE(?, price), 
       location = COALESCE(?, location) WHERE id = ?`,
      [category_id, name, model, serial_number, purchase_date, price, location, req.params.id]
    );

    const [updated] = await pool.query('SELECT * FROM assets WHERE id = ?', [req.params.id]);
    res.json(updated[0]);
  } catch (error) {
    console.error('Update asset error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/assets/:id - Retire asset
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    const [existing] = await pool.query('SELECT * FROM assets WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    if (existing[0].status === 'allocated') {
      return res.status(400).json({ error: 'Cannot retire an allocated asset. Return it first.' });
    }

    await pool.query("UPDATE assets SET status = 'retired' WHERE id = ?", [req.params.id]);
    res.json({ message: 'Asset retired successfully' });
  } catch (error) {
    console.error('Delete asset error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/assets/categories/list - List all categories
router.get('/categories/list', auth, async (req, res) => {
  try {
    const [categories] = await pool.query('SELECT * FROM asset_categories ORDER BY name');
    res.json(categories);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/assets/:id/history - Get asset QR scan details and full assignment/damage logs
router.get('/:id/history', auth, async (req, res) => {
  try {
    const assetId = req.params.id;

    // 1. Fetch asset details
    const [assets] = await pool.query(`
      SELECT a.id, a.category_id, a.name, a.model, a.serial_number, a.purchase_date, a.price, a.location, a.created_at, a.updated_at,
             CASE
               WHEN a.status = 'retired' THEN 'retired'
               WHEN EXISTS (SELECT 1 FROM allocations al WHERE al.asset_id = a.id AND al.returned_at IS NULL) THEN 'allocated'
               WHEN EXISTS (SELECT 1 FROM damage_reports dr WHERE dr.asset_id = a.id AND dr.resolved = 0) THEN 'damaged'
               ELSE 'in_stock'
             END AS status,
             c.name as category_name
      FROM assets a
      JOIN asset_categories c ON a.category_id = c.id
      WHERE a.id = ?
    `, [assetId]);

    if (assets.length === 0) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    const asset = assets[0];

    // Log the QR view event
    const userId = req.user ? req.user.id : null;
    await pool.query(
      'INSERT INTO scan_logs (asset_id, scanned_by) VALUES (?, ?)',
      [assetId, userId]
    );

    // 2. Fetch active and past allocations
    const [allocations] = await pool.query(`
      SELECT al.*, 
             u.name as user_name, u.email as user_email, u.department as user_department, u.designation as user_designation, u.photo_path as user_photo,
             ab.name as allocated_by_name
      FROM allocations al
      JOIN users u ON al.user_id = u.id
      LEFT JOIN users ab ON al.allocated_by = ab.id
      WHERE al.asset_id = ?
      ORDER BY al.allocated_at DESC
    `, [assetId]);

    // Separate active and past allocations
    const activeAllocation = allocations.find(al => al.returned_at === null) || null;
    const allocationHistory = allocations.filter(al => al.returned_at !== null);

    // 3. Fetch damage reports
    const [damageReports] = await pool.query(`
      SELECT dr.*,
             u.name as reported_by_name, u.email as reported_by_email, u.department as reported_by_department
      FROM damage_reports dr
      JOIN users u ON dr.reported_by = u.id
      WHERE dr.asset_id = ?
      ORDER BY dr.reported_at DESC
    `, [assetId]);

    // 4. Fetch scan history
    const [scanHistory] = await pool.query(`
      SELECT sl.*, u.name as scanned_by_name, u.email as scanned_by_email, u.emp_id as scanned_by_emp_id
      FROM scan_logs sl
      LEFT JOIN users u ON sl.scanned_by = u.id
      WHERE sl.asset_id = ?
      ORDER BY sl.scanned_at DESC
    `, [assetId]);

    res.json({
      asset,
      activeAllocation,
      allocationHistory,
      damageReports,
      scanHistory
    });
  } catch (error) {
    console.error('Error fetching asset history details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/assets/import - Bulk import assets from a CSV file
const multer = require('multer');
const uploadCsv = multer({ storage: multer.memoryStorage() });

router.post('/import', auth, adminOnly, uploadCsv.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please upload a CSV file.' });
    }

    const csvContent = req.file.buffer.toString('utf-8');
    const lines = csvContent.split(/\r?\n/).filter(line => line.trim() !== '');

    if (lines.length <= 1) {
      return res.status(400).json({ error: 'CSV file is empty or missing headers.' });
    }

    // Parse headers
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    // Map header indices
    const nameIndex = headers.indexOf('name');
    const categoryIndex = headers.indexOf('category');
    const modelIndex = headers.indexOf('model');
    const serialIndex = headers.indexOf('serial_number');
    const purchaseDateIndex = headers.indexOf('purchase_date');
    const priceIndex = headers.indexOf('price');
    const locationIndex = headers.indexOf('location');

    if (nameIndex === -1 || categoryIndex === -1 || serialIndex === -1) {
      return res.status(400).json({ error: 'CSV must contain name, category, and serial_number columns.' });
    }

    const connection = await pool.getConnection();
    let successCount = 0;
    let skipCount = 0;
    const errors = [];

    try {
      await connection.beginTransaction();

      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',').map(cell => cell.trim());
        if (row.length < headers.length) continue; // skip incomplete rows

        const name = row[nameIndex];
        const categoryName = row[categoryIndex];
        const serialNumber = row[serialIndex];
        const model = modelIndex !== -1 ? row[modelIndex] : null;
        const purchaseDate = purchaseDateIndex !== -1 ? row[purchaseDateIndex] : null;
        const price = priceIndex !== -1 ? parseFloat(row[priceIndex]) : null;
        const location = locationIndex !== -1 ? row[locationIndex] : null;

        if (!name || !categoryName || !serialNumber) {
          skipCount++;
          errors.push(`Row ${i + 1}: Missing name, category, or serial number`);
          continue;
        }

        // Check if serial number already exists in DB
        const [existing] = await connection.query('SELECT id FROM assets WHERE serial_number = ?', [serialNumber]);
        if (existing.length > 0) {
          skipCount++;
          errors.push(`Row ${i + 1}: Serial number '${serialNumber}' already exists`);
          continue;
        }

        // Resolve Category ID
        let categoryId = null;
        const [categories] = await connection.query('SELECT id FROM asset_categories WHERE name = ?', [categoryName]);
        if (categories.length > 0) {
          categoryId = categories[0].id;
        } else {
          // Create category dynamically
          const [newCat] = await connection.query('INSERT INTO asset_categories (name, description) VALUES (?, ?)', [categoryName, `Automatically created during bulk CSV import`]);
          categoryId = newCat.insertId;
        }

        // Insert Asset
        await connection.query(
          `INSERT INTO assets (category_id, name, model, serial_number, purchase_date, price, status, location)
           VALUES (?, ?, ?, ?, ?, ?, 'in_stock', ?)`,
          [categoryId, name, model || null, serialNumber, purchaseDate || null, isNaN(price) ? null : price, location || null]
        );

        successCount++;
      }

      await connection.commit();
      res.json({
        message: 'Bulk CSV import finished.',
        successCount,
        skipCount,
        errors
      });
    } catch (err) {
      await connection.rollback();
      console.error('Import transaction error:', err);
      res.status(500).json({ error: 'Database transaction error during CSV import' });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Import CSV error:', error);
    res.status(500).json({ error: 'Server error parsing CSV file' });
  }
});

// POST /api/assets/mdm-sync-simulate - Simulate MDM Synchronization
router.post('/mdm-sync-simulate', auth, async (req, res) => {
  try {
    res.json({ message: 'MDM diagnostics synchronization successfully completed.' });
  } catch (error) {
    console.error('MDM Sync Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
