const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { auth } = require('../middleware/auth');
const { askLlama } = require('../utils/aiAgent');

// GET /api/reports/stock - Stock summary by category (derived from event tables)
router.get('/stock', auth, async (req, res) => {
  try {
    const [summary] = await pool.query(`
      WITH asset_derived AS (
        SELECT 
          a.id,
          a.category_id,
          a.price,
          CASE
            WHEN a.status = 'retired' THEN 'retired'
            WHEN EXISTS (SELECT 1 FROM allocations al WHERE al.asset_id = a.id AND al.returned_at IS NULL) THEN 'allocated'
            WHEN EXISTS (SELECT 1 FROM damage_reports dr WHERE dr.asset_id = a.id AND dr.resolved = 0) THEN 'damaged'
            ELSE 'in_stock'
          END AS status
        FROM assets a
      )
      SELECT 
        ac.id as category_id,
        ac.name as category_name,
        COUNT(ad.id) as total_assets,
        SUM(CASE WHEN ad.status = 'in_stock' THEN 1 ELSE 0 END) as in_stock,
        SUM(CASE WHEN ad.status = 'allocated' THEN 1 ELSE 0 END) as allocated,
        SUM(CASE WHEN ad.status = 'damaged' THEN 1 ELSE 0 END) as damaged,
        SUM(CASE WHEN ad.status = 'retired' THEN 1 ELSE 0 END) as retired,
        SUM(ad.price) as total_value
      FROM asset_categories ac
      LEFT JOIN asset_derived ad ON ac.id = ad.category_id
      GROUP BY ac.id, ac.name
      ORDER BY ac.name
    `);

    // Low stock warnings (categories with less than 3 in_stock items)
    const lowStock = summary.filter(s => s.in_stock < 3);

    // Overall stats
    const [overallStats] = await pool.query(`
      WITH asset_derived AS (
        SELECT 
          price,
          CASE
            WHEN status = 'retired' THEN 'retired'
            WHEN EXISTS (SELECT 1 FROM allocations al WHERE al.asset_id = id AND al.returned_at IS NULL) THEN 'allocated'
            WHEN EXISTS (SELECT 1 FROM damage_reports dr WHERE dr.asset_id = id AND dr.resolved = 0) THEN 'damaged'
            ELSE 'in_stock'
          END AS status
        FROM assets
      )
      SELECT 
        COUNT(*) as total_assets,
        SUM(CASE WHEN status = 'in_stock' THEN 1 ELSE 0 END) as in_stock,
        SUM(CASE WHEN status = 'allocated' THEN 1 ELSE 0 END) as allocated,
        SUM(CASE WHEN status = 'damaged' THEN 1 ELSE 0 END) as damaged,
        SUM(CASE WHEN status = 'retired' THEN 1 ELSE 0 END) as retired,
        SUM(price) as total_value
      FROM asset_derived
    `);

    // Fetch active assets details to calculate overall depreciated Book Value (WDV)
    const [allAssets] = await pool.query(`
      SELECT a.price, a.purchase_date, ac.name as category_name
      FROM assets a
      LEFT JOIN asset_categories ac ON a.category_id = ac.id
      WHERE a.status != 'retired'
    `);

    let totalBookValue = 0;
    let eolCount = 0;
    let approachingEolCount = 0;

    allAssets.forEach(asset => {
      const price = parseFloat(asset.price);
      if (!price) return;
      
      const purchaseDate = new Date(asset.purchase_date);
      const currentDate = new Date();
      if (isNaN(purchaseDate.getTime()) || purchaseDate > currentDate) {
        totalBookValue += price;
        return;
      }

      const msDiff = currentDate - purchaseDate;
      const yearsElapsed = msDiff / (1000 * 60 * 60 * 24 * 365.25);
      const monthsElapsed = yearsElapsed * 12;

      if (monthsElapsed >= 36) {
        eolCount += 1;
      } else if (monthsElapsed >= 30) {
        approachingEolCount += 1;
      }

      const cat = (asset.category_name || '').toLowerCase();
      let rate = 0.15; // default standard rate (15%) for equipment/monitors/phones
      if (cat.includes('laptop') || cat.includes('computer') || cat.includes('software')) {
        rate = 0.40; // 40% for laptops/computers
      } else if (cat.includes('furniture')) {
        rate = 0.10; // 10% for furniture
      }

      // WDV formula
      let bookValue = price * Math.pow(1 - rate, yearsElapsed);

      // 5% scrap floor
      const scrapFloor = price * 0.05;
      if (bookValue < scrapFloor) {
        bookValue = scrapFloor;
      }

      totalBookValue += bookValue;
    });

    const overall = overallStats[0];
    overall.total_book_value = totalBookValue;
    overall.eol_count = eolCount;
    overall.approaching_eol_count = approachingEolCount;

    // Calculate ESG Carbon Footprint Metrics
    let totalCarbonDebt = 0;
    allAssets.forEach(asset => {
      const cat = (asset.category_name || '').toLowerCase();
      if (cat.includes('laptop') || cat.includes('computer')) {
        totalCarbonDebt += 350; // 350kg CO2 per laptop
      } else if (cat.includes('monitor') || cat.includes('screen')) {
        totalCarbonDebt += 150; // 150kg CO2 per monitor
      } else if (cat.includes('phone') || cat.includes('mobile')) {
        totalCarbonDebt += 80;  // 80kg CO2 per phone
      } else {
        totalCarbonDebt += 15;  // 15kg CO2 per accessory
      }
    });

    const treesOffset = Math.round(totalCarbonDebt / 22); // A tree absorbs ~22kg CO2/year
    const activeCount = overall.total_assets - overall.retired;
    const ewasteRate = overall.total_assets > 0 
      ? Math.round((activeCount / overall.total_assets) * 100)
      : 100;

    // Calculate CapEx Procurement Forecast
    let capexReplacementsBudget = 0;
    let capexReplacementsCount = 0;

    // 1. Cost of EOL assets needing replacement
    allAssets.forEach(asset => {
      const price = parseFloat(asset.price);
      if (!price) return;
      
      const purchaseDate = new Date(asset.purchase_date);
      const currentDate = new Date();
      if (!isNaN(purchaseDate.getTime()) && purchaseDate <= currentDate) {
        const msDiff = currentDate - purchaseDate;
        const yearsElapsed = msDiff / (1000 * 60 * 60 * 24 * 365.25);
        const monthsElapsed = yearsElapsed * 12;
        if (monthsElapsed >= 36) {
          capexReplacementsBudget += price;
          capexReplacementsCount += 1;
        }
      }
    });

    // 2. Cost of replenishing low-stock categories to safety stock of 3 units
    summary.forEach(cat => {
      if (cat.in_stock < 3) {
        const needed = 3 - cat.in_stock;
        const avgPrice = cat.total_assets > 0 ? (cat.total_value / cat.total_assets) : 50000;
        capexReplacementsBudget += (needed * avgPrice);
        capexReplacementsCount += needed;
      }
    });

    // 3. Fast Static CFO Justification Fallback (AI generated asynchronously on front-end)
    const justificationText = `Requesting procurement budget of ₹${Math.round(capexReplacementsBudget).toLocaleString('en-IN')} for next quarter to replace ${eolCount} EOL hardware units and replenish low safety stock levels across Noida and Bengaluru campuses, ensuring development productivity remains unhindered.`;

    // Recent allocations
    const [recentAllocations] = await pool.query(`
      SELECT al.*, a.name as asset_name, u.name as employee_name
      FROM allocations al
      LEFT JOIN assets a ON al.asset_id = a.id
      LEFT JOIN users u ON al.user_id = u.id
      ORDER BY al.allocated_at DESC
      LIMIT 5
    `);

    // Location breakdown
    const [locationBreakdown] = await pool.query(`
      WITH asset_derived AS (
        SELECT 
          location,
          CASE
            WHEN status = 'retired' THEN 'retired'
            WHEN EXISTS (SELECT 1 FROM allocations al WHERE al.asset_id = id AND al.returned_at IS NULL) THEN 'allocated'
            WHEN EXISTS (SELECT 1 FROM damage_reports dr WHERE dr.asset_id = id AND dr.resolved = 0) THEN 'damaged'
            ELSE 'in_stock'
          END AS status
        FROM assets
        WHERE location IS NOT NULL
      )
      SELECT 
        location,
        COUNT(*) as count,
        SUM(CASE WHEN status = 'in_stock' THEN 1 ELSE 0 END) as in_stock
      FROM asset_derived
      GROUP BY location
      ORDER BY count DESC
    `);

    // 1. Fetch requests breakdown
    let requestsBreakdown = [];
    try {
      const [reqRows] = await pool.query('SELECT status, COUNT(*) as count FROM requests GROUP BY status');
      requestsBreakdown = reqRows;
    } catch (err) {
      console.warn('Error fetching requests breakdown for dashboard:', err.message);
    }

    // 2. Fetch returns breakdown
    let returnsBreakdown = [];
    try {
      const [retRows] = await pool.query(`
        SELECT COALESCE(condition_on_return, 'good') as condition_on_return, COUNT(*) as count 
        FROM allocations 
        WHERE returned_at IS NOT NULL 
        GROUP BY condition_on_return
      `);
      returnsBreakdown = retRows;
    } catch (err) {
      console.warn('Error fetching returns breakdown for dashboard:', err.message);
    }

    // 3. Fetch damage severity breakdown
    let damageSeverityBreakdown = [];
    try {
      const [dmgRows] = await pool.query('SELECT severity, COUNT(*) as count FROM damage_reports GROUP BY severity');
      damageSeverityBreakdown = dmgRows;
    } catch (err) {
      console.warn('Error fetching damage breakdown for dashboard:', err.message);
    }

    // 4. Fetch SaaS / Cloud subscriptions breakdown
    let saasBreakdown = [];
    try {
      const [saasRows] = await pool.query('SELECT category, COUNT(*) as count, SUM(cost_per_seat) as total_cost FROM saas_licenses GROUP BY category');
      saasBreakdown = saasRows;
    } catch (err) {
      console.warn('Error fetching saas breakdown for dashboard:', err.message);
    }    // 5. Fetch Unified Live Activities (Real-Time Platform Event Feed)
    let liveActivity = [];
    try {
      const [allocs] = await pool.query(`
        SELECT al.id, al.allocated_at as event_time, 'allocation' as type, u.name as employee_name, a.name as asset_name 
        FROM allocations al 
        JOIN users u ON al.user_id = u.id 
        JOIN assets a ON al.asset_id = a.id 
        ORDER BY al.allocated_at DESC LIMIT 6
      `);
      
      const [returns] = await pool.query(`
        SELECT al.id, al.returned_at as event_time, 'return' as type, u.name as employee_name, a.name as asset_name 
        FROM allocations al 
        JOIN users u ON al.user_id = u.id 
        JOIN assets a ON al.asset_id = a.id 
        WHERE al.returned_at IS NOT NULL 
        ORDER BY al.returned_at DESC LIMIT 6
      `);

      const [damages] = await pool.query(`
        SELECT dr.id, dr.reported_at as event_time, 'damage' as type, u.name as employee_name, a.name as asset_name, dr.severity 
        FROM damage_reports dr 
        LEFT JOIN users u ON dr.reported_by = u.id 
        JOIN assets a ON dr.asset_id = a.id 
        ORDER BY dr.reported_at DESC LIMIT 6
      `);

      const [scans] = await pool.query(`
        SELECT sl.id, sl.scanned_at as event_time, 'scan' as type, u.name as employee_name, a.name as asset_name 
        FROM scan_logs sl 
        LEFT JOIN users u ON sl.scanned_by = u.id 
        JOIN assets a ON sl.asset_id = a.id 
        ORDER BY sl.scanned_at DESC LIMIT 6
      `);

      // Merge and sort
      liveActivity = [
        ...allocs.map(e => ({ ...e, detail: `Handed over ${e.asset_name} to ${e.employee_name}` })),
        ...returns.map(e => ({ ...e, detail: `Returned ${e.asset_name} from ${e.employee_name}` })),
        ...damages.map(e => ({ ...e, detail: `Reported [${e.severity}] damage for ${e.asset_name}` })),
        ...scans.map(e => ({ ...e, detail: `${e.employee_name || 'System Auditor'} scanned QR code of ${e.asset_name}` }))
      ].sort((a, b) => new Date(b.event_time) - new Date(a.event_time)).slice(0, 10);
    } catch (err) {
      console.warn('Error compiling live activities for dashboard:', err.message);
    }

    res.json({
      summary,
      overall,
      lowStockWarnings: lowStock,
      recentAllocations,
      locationBreakdown,
      liveActivity,
      requestsBreakdown,
      returnsBreakdown,
      damageSeverityBreakdown,
      saasBreakdown,
      esg: {
        total_carbon_debt: totalCarbonDebt,
        trees_offset_needed: treesOffset,
        ewaste_avoidance_rate: ewasteRate
      },
      capex: {
        replacements_budget: Math.round(capexReplacementsBudget),
        replacements_count: capexReplacementsCount,
        ai_justification: justificationText
      }
    });
  } catch (error) {
    console.error('Stock report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/reports/employee/:id - All allocations for an employee
router.get('/employee/:id', auth, async (req, res) => {
  try {
    const [user] = await pool.query('SELECT id, emp_id, name, email, department, designation, photo_path, role, is_active, created_at FROM users WHERE id = ?', [req.params.id]);
    if (user.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const [allocations] = await pool.query(`
      SELECT al.*, 
        a.name as asset_name, a.serial_number, a.model, ac.name as category_name,
        ab.name as allocated_by_name
      FROM allocations al
      LEFT JOIN assets a ON al.asset_id = a.id
      LEFT JOIN asset_categories ac ON a.category_id = ac.id
      LEFT JOIN users ab ON al.allocated_by = ab.id
      WHERE al.user_id = ?
      ORDER BY al.allocated_at DESC
    `, [req.params.id]);

    const [damageReports] = await pool.query(`
      SELECT dr.*, a.name as asset_name
      FROM damage_reports dr
      LEFT JOIN assets a ON dr.asset_id = a.id
      WHERE dr.reported_by = ?
      ORDER BY dr.reported_at DESC
    `, [req.params.id]);

    res.json({
      employee: user[0],
      allocations,
      damageReports,
      stats: {
        totalAllocations: allocations.length,
        activeAllocations: allocations.filter(a => !a.returned_at).length,
        returnedAllocations: allocations.filter(a => a.returned_at).length
      }
    });
  } catch (error) {
    console.error('Employee report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/reports/asset/:id - Full lifecycle history for an asset
router.get('/asset/:id', auth, async (req, res) => {
  try {
    const [asset] = await pool.query(`
      SELECT a.*, ac.name as category_name 
      FROM assets a 
      LEFT JOIN asset_categories ac ON a.category_id = ac.id 
      WHERE a.id = ?
    `, [req.params.id]);

    if (asset.length === 0) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    const [allocations] = await pool.query(`
      SELECT al.*, 
        u.name as employee_name, u.emp_id as employee_emp_id,
        ab.name as allocated_by_name
      FROM allocations al
      LEFT JOIN users u ON al.user_id = u.id
      LEFT JOIN users ab ON al.allocated_by = ab.id
      WHERE al.asset_id = ?
      ORDER BY al.allocated_at DESC
    `, [req.params.id]);

    const [damageReports] = await pool.query(`
      SELECT dr.*, u.name as reported_by_name
      FROM damage_reports dr
      LEFT JOIN users u ON dr.reported_by = u.id
      WHERE dr.asset_id = ?
      ORDER BY dr.reported_at DESC
    `, [req.params.id]);

    const [scanLogs] = await pool.query(`
      SELECT sl.*, u.name as scanned_by_name
      FROM scan_logs sl
      LEFT JOIN users u ON sl.scanned_by = u.id
      WHERE sl.asset_id = ?
      ORDER BY sl.scanned_at DESC
    `, [req.params.id]);

    res.json({
      asset: asset[0],
      allocations,
      damageReports,
      scanLogs,
      timeline: [
        // 1. Original allocation events
        ...allocations.map(a => ({
          type: 'allocation',
          date: a.allocated_at,
          details: a
        })),
        // 2. Return events (if active return is completed)
        ...allocations.filter(a => a.returned_at).map(a => ({
          type: 'return',
          date: a.returned_at,
          details: a
        })),
        // 3. Maintenance & damage report events
        ...damageReports.map(d => ({
          type: 'damage',
          date: d.reported_at,
          details: d
        })),
        // 4. QR code scan audit logs
        ...scanLogs.map(s => ({
          type: 'scan',
          date: s.scanned_at,
          details: s
        }))
      ].sort((a, b) => new Date(b.date) - new Date(a.date))
    });
  } catch (error) {
    console.error('Asset report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/reports/capex-justification - Async Llama budget justification generator
router.get('/capex-justification', auth, async (req, res) => {
  try {
    const [summary] = await pool.query(`
      SELECT 
        ac.id as category_id,
        ac.name as category_name,
        COUNT(a.id) as total_assets,
        SUM(CASE WHEN a.status = 'in_stock' THEN 1 ELSE 0 END) as in_stock,
        SUM(CASE WHEN a.status = 'allocated' THEN 1 ELSE 0 END) as allocated,
        SUM(CASE WHEN a.status = 'damaged' THEN 1 ELSE 0 END) as damaged,
        SUM(CASE WHEN a.status = 'retired' THEN 1 ELSE 0 END) as retired,
        SUM(a.price) as total_value
      FROM asset_categories ac
      LEFT JOIN assets a ON ac.id = a.category_id
      GROUP BY ac.id, ac.name
      ORDER BY ac.name
    `);

    const [allAssets] = await pool.query(`
      SELECT a.price, a.purchase_date, ac.name as category_name
      FROM assets a
      LEFT JOIN asset_categories ac ON a.category_id = ac.id
      WHERE a.status != 'retired'
    `);

    let capexReplacementsBudget = 0;
    let capexReplacementsCount = 0;
    let eolCount = 0;

    allAssets.forEach(asset => {
      const price = parseFloat(asset.price);
      if (!price) return;
      
      const purchaseDate = new Date(asset.purchase_date);
      const currentDate = new Date();
      if (!isNaN(purchaseDate.getTime()) && purchaseDate <= currentDate) {
        const msDiff = currentDate - purchaseDate;
        const yearsElapsed = msDiff / (1000 * 60 * 60 * 24 * 365.25);
        const monthsElapsed = yearsElapsed * 12;
        if (monthsElapsed >= 36) {
          capexReplacementsBudget += price;
          capexReplacementsCount += 1;
          eolCount += 1;
        }
      }
    });

    summary.forEach(cat => {
      if (cat.in_stock < 3) {
        const needed = 3 - cat.in_stock;
        const avgPrice = cat.total_assets > 0 ? (cat.total_value / cat.total_assets) : 50000;
        capexReplacementsBudget += (needed * avgPrice);
        capexReplacementsCount += needed;
      }
    });

    let justificationText = `Requesting procurement budget of ₹${Math.round(capexReplacementsBudget).toLocaleString('en-IN')} for next quarter to replace EOL hardware and replenish low safety stock levels across Noida and Bengaluru campuses, ensuring development productivity remains unhindered.`;
    if (capexReplacementsBudget > 0) {
      try {
        const prompt = `Draft a concise, compelling 1-paragraph justification email to the CFO requesting next quarter's IT procurement budget of ₹${Math.round(capexReplacementsBudget).toLocaleString('en-IN')}. The budget is calculated automatically to replace ${eolCount} EOL devices (older than 3 years) and restock ${capexReplacementsCount - eolCount} low-stock inventory units. Emphasize avoiding dev workflow downtime and compliance offsets. Keep it under 110 words, extremely professional and direct. Do not include subject lines, greetings, or sign-offs.`;
        const systemPrompt = `You are a strategic corporate Chief Technology Officer (CTO) requesting quarterly budget approval. Write direct, persuasive, mathematically clear text.`;
        justificationText = await askLlama(prompt, systemPrompt);
      } catch (err) {
        console.error("AI Budget Justification failed:", err);
      }
    }

    res.json({ justification: justificationText });
  } catch (error) {
    console.error('AI Justification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
