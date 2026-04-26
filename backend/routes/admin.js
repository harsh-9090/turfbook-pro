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
    const [total, todayBookings, todayRevenue, todaySessionRevenue, totalRevenue, totalSessionRevenue, upcoming] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM bookings WHERE status != 'cancelled'"),
      pool.query("SELECT COUNT(*) FROM bookings b JOIN slots s ON s.id = b.slot_id WHERE s.date = $1 AND b.status != 'cancelled'", [today]),
      pool.query("SELECT COALESCE(SUM(p.amount), 0) as total FROM payments p JOIN bookings b ON b.id = p.booking_id JOIN slots s ON s.id = b.slot_id WHERE s.date = $1 AND b.status != 'cancelled'", [today]),
      pool.query("SELECT COALESCE(SUM(total_amount), 0) as total FROM table_sessions WHERE status = 'completed' AND end_time::date = $1", [today]),
      pool.query("SELECT COALESCE(SUM(p.amount), 0) as total FROM payments p JOIN bookings b ON b.id = p.booking_id WHERE b.status != 'cancelled'"),
      pool.query("SELECT COALESCE(SUM(total_amount), 0) as total FROM table_sessions WHERE status = 'completed'"),
      pool.query("SELECT COUNT(*) FROM bookings b JOIN slots s ON s.id = b.slot_id WHERE b.status = 'confirmed' AND (s.date > $1 OR (s.date = $1 AND s.end_time > $2))", [today, new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false })]),
    ]);

    const data = {
      totalBookings: parseInt(total.rows[0].count),
      todayBookings: parseInt(todayBookings.rows[0].count),
      todayRevenue: parseInt(todayRevenue.rows[0].total) + parseInt(todaySessionRevenue.rows[0].total),
      totalRevenue: parseInt(totalRevenue.rows[0].total) + parseInt(totalSessionRevenue.rows[0].total),
      upcomingBookings: parseInt(upcoming.rows[0].count),
    };

    await cache.set('admin:stats', data, 120); // 2 min
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});
// Get audit logs (paginated)
router.get('/audit-logs', authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const [logs, countResult] = await Promise.all([
      pool.query(
        `SELECT a.id, a.action, a.details, a.created_at, u.name as admin_name
         FROM audit_logs a
         LEFT JOIN users u ON u.id = a.admin_id
         ORDER BY a.created_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      pool.query('SELECT COUNT(*) FROM audit_logs')
    ]);

    res.json({
      logs: logs.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
