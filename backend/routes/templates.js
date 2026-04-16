const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');

// Get weekly templates for a turf
router.get('/:turf_id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM slot_templates WHERE turf_id = $1 ORDER BY day_of_week ASC, start_time ASC',
      [req.params.turf_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Create a new slot template
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { turf_id, day_of_week, start_time, end_time, price } = req.body;
    const result = await pool.query(
      `INSERT INTO slot_templates (turf_id, day_of_week, start_time, end_time, price) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [turf_id, day_of_week, start_time, end_time, price]
    );
    req.app.get('io').emit('template_updated');
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Update slot template
router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    const { start_time, end_time, price } = req.body;
    const result = await pool.query(
      `UPDATE slot_templates SET start_time=$1, end_time=$2, price=$3 WHERE id=$4 RETURNING *`,
      [start_time, end_time, price, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Template not found' });
    req.app.get('io').emit('template_updated');
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Delete slot template
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM slot_templates WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Template not found' });
    req.app.get('io').emit('template_updated');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

module.exports = router;
