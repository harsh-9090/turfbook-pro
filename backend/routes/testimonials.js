const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');
const cache = require('../config/cache');
const { reviewLimiter } = require('../middleware/rateLimiter');

// Public: Get approved testimonials
// ... (omitting GET for context)

// Public: Submit a review (text only)
router.post('/', reviewLimiter, async (req, res) => {
  try {
    const { name, role, text, rating } = req.body;
    if (!name || !text || !rating) {
      return res.status(400).json({ error: 'Name, text, and rating are required' });
    }

    const result = await pool.query(
      `INSERT INTO testimonials (name, role, text, rating, status)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, role || '', text, Number(rating), 'pending']
    );

    await cache.del('testimonials:admin');

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Admin: Update status (approve/reject)
router.patch('/:id/status', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const result = await pool.query(
      'UPDATE testimonials SET status = $1 WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });

    await cache.del('testimonials:approved');
    await cache.del('testimonials:admin');

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Toggle featured
router.patch('/:id/feature', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE testimonials SET is_featured = NOT is_featured WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });

    await cache.del('testimonials:approved');
    await cache.del('testimonials:admin');

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Delete testimonial
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM testimonials WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });

    await cache.del('testimonials:approved');
    await cache.del('testimonials:admin');

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
