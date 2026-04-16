const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');
const cache = require('../config/cache');

// Comprehensive analytics endpoint
router.get('/', authMiddleware, async (req, res) => {
  try {
    if (!cache.shouldBypass(req)) {
      const cached = await cache.get('analytics:dashboard');
      if (cached) return res.json(cached);
    }

    const today = new Date().toISOString().split('T')[0];
    
    // Get the start of current week (Monday) and month
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - mondayOffset);
    const weekStartStr = weekStart.toISOString().split('T')[0];
    const monthStartStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    // ===== REVENUE QUERIES =====
    const bookingRevenueToday = await pool.query(
      `SELECT COALESCE(SUM(s.price), 0) as total FROM bookings b 
       JOIN slots s ON s.id = b.slot_id 
       WHERE s.date = $1 AND b.status != 'cancelled'`, [today]
    );
    const bookingRevenueWeek = await pool.query(
      `SELECT COALESCE(SUM(s.price), 0) as total FROM bookings b 
       JOIN slots s ON s.id = b.slot_id 
       WHERE s.date >= $1 AND b.status != 'cancelled'`, [weekStartStr]
    );
    const bookingRevenueMonth = await pool.query(
      `SELECT COALESCE(SUM(s.price), 0) as total FROM bookings b 
       JOIN slots s ON s.id = b.slot_id 
       WHERE s.date >= $1 AND b.status != 'cancelled'`, [monthStartStr]
    );

    // Table session revenue  
    const sessionRevenueToday = await pool.query(
      `SELECT COALESCE(SUM(total_amount), 0) as total FROM table_sessions 
       WHERE DATE(start_time) = $1 AND status = 'completed'`, [today]
    );
    const sessionRevenueWeek = await pool.query(
      `SELECT COALESCE(SUM(total_amount), 0) as total FROM table_sessions 
       WHERE DATE(start_time) >= $1 AND status = 'completed'`, [weekStartStr]
    );
    const sessionRevenueMonth = await pool.query(
      `SELECT COALESCE(SUM(total_amount), 0) as total FROM table_sessions 
       WHERE DATE(start_time) >= $1 AND status = 'completed'`, [monthStartStr]
    );

    // ===== REVENUE BY SPORT =====
    const revenueBySport = await pool.query(
      `SELECT f.facility_type, COALESCE(SUM(s.price), 0) as total
       FROM bookings b 
       JOIN slots s ON s.id = b.slot_id 
       JOIN turfs f ON f.id = s.turf_id
       WHERE s.date >= $1 AND b.status != 'cancelled'
       GROUP BY f.facility_type`, [monthStartStr]
    );
    const sessionRevBySport = await pool.query(
      `SELECT f.facility_type, COALESCE(SUM(ts.total_amount), 0) as total
       FROM table_sessions ts 
       JOIN turfs f ON f.id = ts.turf_id
       WHERE DATE(ts.start_time) >= $1 AND ts.status = 'completed'
       GROUP BY f.facility_type`, [monthStartStr]
    );

    // Merge sport revenues
    const sportMap = {};
    revenueBySport.rows.forEach(r => { sportMap[r.facility_type] = (sportMap[r.facility_type] || 0) + parseFloat(r.total); });
    sessionRevBySport.rows.forEach(r => { sportMap[r.facility_type] = (sportMap[r.facility_type] || 0) + parseFloat(r.total); });

    // ===== DAILY REVENUE TREND (last 7 days) =====
    const dailyTrend = await pool.query(
      `SELECT d.date::text, 
        COALESCE((SELECT SUM(sl.price) FROM bookings bk JOIN slots sl ON sl.id = bk.slot_id WHERE sl.date = d.date AND bk.status != 'cancelled'), 0) as booking_revenue,
        COALESCE((SELECT SUM(ts.total_amount) FROM table_sessions ts WHERE DATE(ts.start_time) = d.date AND ts.status = 'completed'), 0) as session_revenue
       FROM generate_series(CURRENT_DATE - 6, CURRENT_DATE, '1 day') d(date)
       ORDER BY d.date`
    );

    // ===== PEAK HOURS =====
    const peakHours = await pool.query(
      `SELECT EXTRACT(HOUR FROM s.start_time)::int as hour, COUNT(*) as count
       FROM bookings b JOIN slots s ON s.id = b.slot_id 
       WHERE s.date >= $1 AND b.status != 'cancelled'
       GROUP BY hour ORDER BY hour`, [monthStartStr]
    );

    // ===== TURF UTILIZATION =====
    const utilization = await pool.query(
      `SELECT 
        COUNT(*) as total_slots,
        SUM(CASE WHEN s.id IN (SELECT slot_id FROM bookings WHERE status != 'cancelled') THEN 1 ELSE 0 END) as booked_slots
       FROM slots s WHERE s.date >= $1 AND s.date <= $2`, [weekStartStr, today]
    );

    // ===== SESSION HISTORY =====
    const sessionHistory = await pool.query(
      `SELECT ts.*, f.name as facility_name, f.weekday_day_price as hourly_rate
       FROM table_sessions ts
       JOIN turfs f ON f.id = ts.turf_id
       WHERE ts.status = 'completed'
       ORDER BY ts.end_time DESC
       LIMIT 50`
    );

    // ===== COUNTS =====
    const totalBookings = await pool.query('SELECT COUNT(*) FROM bookings WHERE status != $1', ['cancelled']);
    const totalSessions = await pool.query(`SELECT COUNT(*) FROM table_sessions WHERE status = 'completed'`);
    const todayBookingCount = await pool.query(
      `SELECT COUNT(*) FROM bookings b JOIN slots s ON s.id = b.slot_id WHERE s.date = $1 AND b.status != 'cancelled'`, [today]
    );
    const todaySessionCount = await pool.query(
      `SELECT COUNT(*) FROM table_sessions WHERE DATE(start_time) = $1 AND status = 'completed'`, [today]
    );

    // ===== TOP CUSTOMERS (from sessions) =====
    const topCustomers = await pool.query(
      `SELECT customer_name, customer_phone, 
        COUNT(*) as total_visits, 
        COALESCE(SUM(total_amount), 0) as total_spent
       FROM table_sessions 
       WHERE status = 'completed' AND customer_name IS NOT NULL
       GROUP BY customer_name, customer_phone
       ORDER BY total_spent DESC
       LIMIT 10`
    );

    const data = {
      revenue: {
        today: parseFloat(bookingRevenueToday.rows[0].total) + parseFloat(sessionRevenueToday.rows[0].total),
        week: parseFloat(bookingRevenueWeek.rows[0].total) + parseFloat(sessionRevenueWeek.rows[0].total),
        month: parseFloat(bookingRevenueMonth.rows[0].total) + parseFloat(sessionRevenueMonth.rows[0].total),
        onlineToday: parseFloat(bookingRevenueToday.rows[0].total),
        walkInToday: parseFloat(sessionRevenueToday.rows[0].total),
      },
      revenueBySport: Object.entries(sportMap).map(([type, total]) => ({ type, total })),
      dailyTrend: dailyTrend.rows.map(r => ({
        date: r.date,
        online: parseFloat(r.booking_revenue),
        walkIn: parseFloat(r.session_revenue),
        total: parseFloat(r.booking_revenue) + parseFloat(r.session_revenue)
      })),
      peakHours: peakHours.rows.map(r => ({ hour: `${r.hour}:00`, bookings: parseInt(r.count) })),
      utilization: {
        total: parseInt(utilization.rows[0].total_slots) || 0,
        booked: parseInt(utilization.rows[0].booked_slots) || 0,
        rate: utilization.rows[0].total_slots > 0 
          ? Math.round((parseInt(utilization.rows[0].booked_slots) / parseInt(utilization.rows[0].total_slots)) * 100)
          : 0
      },
      counts: {
        totalBookings: parseInt(totalBookings.rows[0].count),
        totalSessions: parseInt(totalSessions.rows[0].count),
        todayBookings: parseInt(todayBookingCount.rows[0].count),
        todaySessions: parseInt(todaySessionCount.rows[0].count),
      },
      topCustomers: topCustomers.rows.map(r => ({
        name: r.customer_name,
        phone: r.customer_phone,
        visits: parseInt(r.total_visits),
        spent: parseFloat(r.total_spent)
      })),
      sessionHistory: sessionHistory.rows.map(r => ({
        id: r.id,
        facility: r.facility_name,
        table: r.name,
        customer: r.customer_name,
        phone: r.customer_phone,
        startTime: r.start_time,
        endTime: r.end_time,
        amount: parseFloat(r.total_amount || 0),
        hourlyRate: parseFloat(r.hourly_rate)
      }))
    };

    await cache.set('analytics:dashboard', data, 180); // 3 min — highest impact cache
    res.json(data);
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

module.exports = router;
