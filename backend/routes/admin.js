const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');
const cache = require('../config/cache');

router.get('/stats', authMiddleware, async (req, res) => {
  try {
    if (!cache.shouldBypass(req)) {
      const cached = await cache.get('admin:stats');
      if (cached) return res.json(cached);
    }

    const today = new Date().toISOString().split('T')[0];
    const [total, todayBookings, revenue, upcoming] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM bookings'),
      pool.query('SELECT COUNT(*) FROM bookings b JOIN slots s ON s.id = b.slot_id WHERE s.date = $1', [today]),
      pool.query('SELECT COALESCE(SUM(p.amount), 0) as total FROM payments p JOIN bookings b ON b.id = p.booking_id WHERE b.status != $1', ['cancelled']),
      pool.query('SELECT COUNT(*) FROM bookings b JOIN slots s ON s.id = b.slot_id WHERE s.date >= $1 AND b.status = $2', [today, 'confirmed']),
    ]);

    const data = {
      totalBookings: parseInt(total.rows[0].count),
      todayBookings: parseInt(todayBookings.rows[0].count),
      totalRevenue: parseInt(revenue.rows[0].total),
      upcomingBookings: parseInt(upcoming.rows[0].count),
    };

    await cache.set('admin:stats', data, 120); // 2 min
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
