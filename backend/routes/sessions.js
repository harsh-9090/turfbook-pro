const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const cache = require('../config/cache');

// Get running sessions
router.get('/', async (req, res) => {
  try {
    const { turf_id } = req.query;
    const cacheKey = turf_id ? `sessions:running:${turf_id}` : 'sessions:running';

    if (!cache.shouldBypass(req)) {
      const cached = await cache.get(cacheKey);
      if (cached) return res.json(cached);
    }

    let query = `
      SELECT t.*, f.name as facility_name, f.weekday_day_price as hourly_rate
      FROM table_sessions t
      JOIN turfs f ON t.turf_id = f.id
      WHERE t.status = 'running'
    `;
    let params = [];
    if (turf_id) {
       query += " AND t.turf_id = $1";
       params.push(turf_id);
    }
    query += " ORDER BY t.start_time DESC";
    
    const { rows } = await pool.query(query, params);
    await cache.set(cacheKey, rows, 30); // 30 sec — real-time data
    res.json(rows);
  } catch(e) {
    res.status(500).json({error: e.message});
  }
});

// Start a new table session
router.post('/', async (req, res) => {
  try {
    const { turf_id, name, customer_name, customer_phone } = req.body;
    if (!turf_id) {
      return res.status(400).json({ error: 'Turf ID is required to bind a session' });
    }
    if (!customer_name || !customer_phone) {
      return res.status(400).json({ error: 'Customer name and phone are required' });
    }
    const { rows } = await pool.query(
      `INSERT INTO table_sessions (turf_id, name, customer_name, customer_phone) VALUES ($1, $2, $3, $4) RETURNING *`,
      [turf_id, name || 'Live Walk-in Table', customer_name, customer_phone]
    );

    // Invalidate caches
    await cache.delPattern('sessions:running*');
    await cache.delPattern('facilities:tables:*');

    res.status(201).json(rows[0]);
  } catch(e) {
    res.status(500).json({error: e.message});
  }
});

// Stop a session & apply bill
router.patch('/:id/stop', async (req, res) => {
  try {
    const { id } = req.params;
    const { total_amount } = req.body;
    
    const { rows } = await pool.query(
      `UPDATE table_sessions 
       SET status = 'completed', end_time = NOW(), total_amount = $1 
       WHERE id = $2 RETURNING *`,
      [total_amount, id]
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Invalidate caches
    await cache.delPattern('sessions:*');
    await cache.delPattern('facilities:tables:*');
    await cache.del('admin:stats');
    await cache.del('analytics:dashboard');

    res.json(rows[0]);
  } catch(e) {
    res.status(500).json({error: e.message});
  }
});

// Get completed session history
router.get('/history', async (req, res) => {
  try {
    if (!cache.shouldBypass(req)) {
      const cached = await cache.get('sessions:history');
      if (cached) return res.json(cached);
    }

    const { rows } = await pool.query(
      `SELECT ts.*, f.name as facility_name, f.weekday_day_price as hourly_rate
       FROM table_sessions ts
       JOIN turfs f ON f.id = ts.turf_id
       WHERE ts.status = 'completed'
       ORDER BY ts.end_time DESC
       LIMIT 100`
    );
    await cache.set('sessions:history', rows, 120); // 2 min
    res.json(rows);
  } catch(e) {
    res.status(500).json({error: e.message});
  }
});

module.exports = router;
