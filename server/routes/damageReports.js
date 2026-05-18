const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { auth, adminOnly } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Run automatic schema upgrade for AI triage columns on startup
(async () => {
  try {
    const connection = await pool.getConnection();
    // Helper to safely add column if it doesn't exist
    const addColumnSafe = async (columnName, columnDef) => {
      try {
        await connection.query(`ALTER TABLE damage_reports ADD COLUMN ${columnName} ${columnDef}`);
        console.log(`✅ Database migration: Added column ${columnName} to damage_reports`);
      } catch (err) {
        // If column exists, MySQL throws code ER_DUP_FIELDNAME (1060)
        if (err.errno !== 1060) {
          console.error(`Error adding column ${columnName}:`, err.message);
        }
      }
    };

    await addColumnSafe('ai_triage_action', "VARCHAR(50) DEFAULT NULL");
    await addColumnSafe('ai_estimated_cost', "DECIMAL(12,2) DEFAULT NULL");
    await addColumnSafe('ai_recommendation', "TEXT DEFAULT NULL");

    connection.release();
  } catch (err) {
    console.error('❌ Failed to run AI triage schema migration:', err.message);
  }
})();

// Helper to run AI triage using NVIDIA Llama 3.1 API
async function performAITriage(asset, description, severity) {
  if (!process.env.NVIDIA_API_KEY) {
    console.log('NVIDIA_API_KEY not configured, skipping AI Triage.');
    return { action: null, estimated_cost: null, recommendation: null };
  }

  try {
    const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.NVIDIA_API_KEY}`
      },
      body: JSON.stringify({
        model: "meta/llama-3.1-70b-instruct",
        messages: [
          {
            role: "system",
            content: "You are an expert IT Hardware Triage AI assistant for an Indian corporate office. You return ONLY a raw, clean JSON response with no markdown backticks, explanations, or code blocks."
          },
          {
            role: "user",
            content: `Analyze this corporate asset damage report and provide triage:
Category: ${asset.category_name}
Asset Name: ${asset.name}
Model/Specs: ${asset.model || 'Unknown specs'}
Office Location: ${asset.location || 'India Office'}
Severity of Damage: ${severity}
Description of damage: ${description}

Based on this, estimate the repair cost in Indian Rupees (INR) and suggest the best action:
- "repair": If it's a minor or moderate issue that can be serviced cost-effectively.
- "replace": If it's highly impaired or severely damaged and it's better to assign a new in-stock unit.
- "retire": If the asset is completely broken, end-of-life, or repair cost exceeds its residual value.

Generate localized advice mentioning official service providers or local centers in their city (${asset.location || 'nearest tech hub'}).

You MUST respond with a single JSON object matching this structure EXACTLY:
{
  "action": "repair" | "replace" | "retire",
  "estimated_cost": number_value_in_inr,
  "recommendation": "detailed localized recommendation string"
}`
          }
        ],
        temperature: 0.1,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      throw new Error(`NVIDIA API response error: ${response.statusText}`);
    }

    const result = await response.json();
    let rawText = result.choices[0].message.content.trim();
    
    // Clean up any markdown code blocks
    rawText = rawText.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
    
    const parsed = JSON.parse(rawText);
    return {
      action: parsed.action || 'repair',
      estimated_cost: parseFloat(parsed.estimated_cost) || 0.00,
      recommendation: parsed.recommendation || 'AI recommendation completed.'
    };
  } catch (err) {
    console.error('❌ AI Triage failure:', err.message);
    return {
      action: 'repair',
      estimated_cost: 0.00,
      recommendation: `Manual triage required. Error generating AI assessment: ${err.message}`
    };
  }
}

// GET /api/damage-reports - List all damage reports
router.get('/', auth, async (req, res) => {
  try {
    const { resolved } = req.query;
    let query = `
      SELECT dr.*, 
        a.name as asset_name, a.serial_number, a.model, a.location,
        u.name as reported_by_name
      FROM damage_reports dr
      LEFT JOIN assets a ON dr.asset_id = a.id
      LEFT JOIN users u ON dr.reported_by = u.id
    `;

    const params = [];
    if (resolved !== undefined) {
      query += ' WHERE dr.resolved = ?';
      params.push(resolved === 'true' ? 1 : 0);
    }

    query += ' ORDER BY dr.reported_at DESC';

    const [reports] = await pool.query(query, params);
    res.json(reports);
  } catch (error) {
    console.error('Get damage reports error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/damage-reports - Create damage report with photo + AI Triage
router.post('/', auth, upload.single('photo'), async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { asset_id, description, severity } = req.body;

    if (!asset_id || !description || !severity) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({ error: 'asset_id, description, and severity are required.' });
    }

    if (description.length < 20) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({ error: 'Description must be at least 20 characters long.' });
    }

    const validSeverities = ['low', 'medium', 'high', 'critical'];
    if (!validSeverities.includes(severity)) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({ error: `Severity must be one of: ${validSeverities.join(', ')}` });
    }

    // Check asset exists and fetch its details for AI triage
    const [assets] = await connection.query(`
      SELECT a.*, c.name as category_name 
      FROM assets a 
      LEFT JOIN asset_categories c ON a.category_id = c.id 
      WHERE a.id = ?
    `, [asset_id]);

    if (assets.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ error: 'Asset not found.' });
    }

    const asset = assets[0];
    const photo_path = req.file ? req.file.filename : null;

    // Run AI Triage in parallel or before insert
    console.log(`🤖 Invoking NVIDIA Llama 3.1 for damage report triage...`);
    const aiResults = await performAITriage(asset, description, severity);

    const [result] = await connection.query(
      `INSERT INTO damage_reports 
        (asset_id, reported_by, description, photo_path, severity, ai_triage_action, ai_estimated_cost, ai_recommendation) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        asset_id, 
        req.user.id, 
        description, 
        photo_path, 
        severity, 
        aiResults.action, 
        aiResults.estimated_cost, 
        aiResults.recommendation
      ]
    );

    // Update asset status to damaged (or retired based on triage recommendation if critical)
    const finalAssetStatus = aiResults.action === 'retire' ? 'retired' : 'damaged';
    await connection.query("UPDATE assets SET status = ? WHERE id = ?", [finalAssetStatus, asset_id]);

    await connection.commit();
    connection.release();

    const [newReport] = await pool.query('SELECT * FROM damage_reports WHERE id = ?', [result.insertId]);
    res.status(201).json(newReport[0]);
  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error('Create damage report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/damage-reports/:id - Resolve damage report
router.put('/:id', auth, adminOnly, async (req, res) => {
  try {
    const { resolution_note } = req.body;

    const [existing] = await pool.query('SELECT * FROM damage_reports WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Damage report not found.' });
    }

    await pool.query(
      'UPDATE damage_reports SET resolved = TRUE, resolution_note = ? WHERE id = ?',
      [resolution_note || null, req.params.id]
    );

    // Check if asset has other unresolved damage reports
    const [unresolvedReports] = await pool.query(
      'SELECT id FROM damage_reports WHERE asset_id = ? AND resolved = FALSE AND id != ?',
      [existing[0].asset_id, req.params.id]
    );

    // If no more unresolved reports, set asset back to in_stock
    if (unresolvedReports.length === 0) {
      // Check if asset is not currently allocated
      const [activeAlloc] = await pool.query(
        'SELECT id FROM allocations WHERE asset_id = ? AND returned_at IS NULL',
        [existing[0].asset_id]
      );
      if (activeAlloc.length === 0) {
        await pool.query("UPDATE assets SET status = 'in_stock' WHERE id = ?", [existing[0].asset_id]);
      }
    }

    res.json({ message: 'Damage report resolved successfully' });
  } catch (error) {
    console.error('Resolve damage report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
