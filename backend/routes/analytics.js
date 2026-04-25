const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');
const cache = require('../config/cache');
const { format } = require('date-fns');

// Comprehensive analytics endpoint
router.get('/', authMiddleware, async (req, res) => {
  try {
    if (!cache.shouldBypass(req)) {
      const cached = await cache.get('analytics:dashboard');
      if (cached) return res.json(cached);
    }

    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - mondayOffset);
    const weekStartStr = weekStart.toISOString().split('T')[0];
    const monthStartStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    // Execute ALL queries in parallel for maximum speed
    const [
      bookingRevenueToday,
      bookingRevenueWeek,
      bookingRevenueMonth,
      sessionRevenueToday,
      sessionRevenueWeek,
      sessionRevenueMonth,
      revenueBySport,
      sessionRevBySport,
      dailyTrend,
      peakHours,
      utilization,
      sessionHistory,
      totalBookings,
      totalSessions,
      todayBookingCount,
      todaySessionCount,
      topCustomers
    ] = await Promise.all([
      pool.query(`SELECT COALESCE(SUM(s.price), 0) as total FROM bookings b JOIN slots s ON s.id = b.slot_id WHERE s.date = $1 AND b.status != 'cancelled'`, [today]),
      pool.query(`SELECT COALESCE(SUM(s.price), 0) as total FROM bookings b JOIN slots s ON s.id = b.slot_id WHERE s.date >= $1 AND b.status != 'cancelled'`, [weekStartStr]),
      pool.query(`SELECT COALESCE(SUM(s.price), 0) as total FROM bookings b JOIN slots s ON s.id = b.slot_id WHERE s.date >= $1 AND b.status != 'cancelled'`, [monthStartStr]),
      pool.query(`SELECT COALESCE(SUM(total_amount), 0) as total FROM table_sessions WHERE DATE(start_time) = $1 AND status = 'completed'`, [today]),
      pool.query(`SELECT COALESCE(SUM(total_amount), 0) as total FROM table_sessions WHERE DATE(start_time) >= $1 AND status = 'completed'`, [weekStartStr]),
      pool.query(`SELECT COALESCE(SUM(total_amount), 0) as total FROM table_sessions WHERE DATE(start_time) >= $1 AND status = 'completed'`, [monthStartStr]),
      pool.query(`SELECT f.facility_type, COALESCE(SUM(s.price), 0) as total FROM bookings b JOIN slots s ON s.id = b.slot_id JOIN turfs f ON f.id = s.turf_id WHERE s.date >= $1 AND b.status != 'cancelled' GROUP BY f.facility_type`, [monthStartStr]),
      pool.query(`SELECT f.facility_type, COALESCE(SUM(ts.total_amount), 0) as total FROM table_sessions ts JOIN turfs f ON f.id = ts.turf_id WHERE DATE(ts.start_time) >= $1 AND ts.status = 'completed' GROUP BY f.facility_type`, [monthStartStr]),
      pool.query(`SELECT d.date::text, COALESCE((SELECT SUM(sl.price) FROM bookings bk JOIN slots sl ON sl.id = bk.slot_id WHERE sl.date = d.date AND bk.status != 'cancelled'), 0) as booking_revenue, COALESCE((SELECT SUM(ts.total_amount) FROM table_sessions ts WHERE DATE(ts.start_time) = d.date AND ts.status = 'completed'), 0) as session_revenue FROM generate_series(CURRENT_DATE - 6, CURRENT_DATE, '1 day') d(date) ORDER BY d.date`),
      pool.query(`SELECT EXTRACT(HOUR FROM s.start_time)::int as hour, COUNT(*) as count FROM bookings b JOIN slots s ON s.id = b.slot_id WHERE s.date >= $1 AND b.status != 'cancelled' GROUP BY hour ORDER BY hour`, [monthStartStr]),
      pool.query(`SELECT COUNT(*) as total_slots, SUM(CASE WHEN s.id IN (SELECT slot_id FROM bookings WHERE status != 'cancelled') THEN 1 ELSE 0 END) as booked_slots FROM slots s WHERE s.date >= $1 AND s.date <= $2`, [weekStartStr, today]),
      pool.query(`SELECT ts.*, f.name as facility_name, f.weekday_day_price as hourly_rate FROM table_sessions ts JOIN turfs f ON f.id = ts.turf_id WHERE ts.status = 'completed' ORDER BY ts.end_time DESC LIMIT 50`),
      pool.query('SELECT COUNT(*) FROM bookings WHERE status != $1', ['cancelled']),
      pool.query(`SELECT COUNT(*) FROM table_sessions WHERE status = 'completed'`),
      pool.query(`SELECT COUNT(*) FROM bookings b JOIN slots s ON s.id = b.slot_id WHERE s.date = $1 AND b.status != 'cancelled'`, [today]),
      pool.query(`SELECT COUNT(*) FROM table_sessions WHERE DATE(start_time) = $1 AND status = 'completed'`, [today]),
      pool.query(`SELECT customer_name, customer_phone, COUNT(*) as total_visits, COALESCE(SUM(total_amount), 0) as total_spent FROM table_sessions WHERE status = 'completed' AND customer_name IS NOT NULL GROUP BY customer_name, customer_phone ORDER BY total_spent DESC LIMIT 10`)
    ]);

    // Merge sport revenues
    const sportMap = {};
    revenueBySport.rows.forEach(r => { sportMap[r.facility_type] = (sportMap[r.facility_type] || 0) + parseFloat(r.total); });
    sessionRevBySport.rows.forEach(r => { sportMap[r.facility_type] = (sportMap[r.facility_type] || 0) + parseFloat(r.total); });

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

    await cache.set('analytics:dashboard', data, 180); // 3 min - highest impact cache
    res.json(data);
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// GET /api/analytics/finance - Granular financial metrics
router.get('/finance', authMiddleware, async (req, res) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];

    // 1. Revenue Split metrics (Cash vs UPI vs Online)
    // Method mapping: 'online' (Razorpay), 'upi' (Staff QR), 'cash' (Physical)
    const splitQuery = `
      SELECT 
        COALESCE(SUM(amount), 0) as total_volume,
        COALESCE(SUM(CASE WHEN method = 'cash' THEN amount ELSE 0 END), 0) as cash_revenue,
        COALESCE(SUM(CASE WHEN method = 'upi' THEN amount ELSE 0 END), 0) as upi_revenue,
        COALESCE(SUM(CASE WHEN method = 'online' THEN amount ELSE 0 END), 0) as online_revenue,
        COALESCE(SUM(platform_fee), 0) as total_fees
      FROM payments
    `;
    const splitResult = await pool.query(splitQuery);
    const splitData = splitResult.rows[0];

    // 2. Pending Dues (Money stay out on the field)
    const duesQuery = `
      SELECT COALESCE(SUM(remaining_amount), 0) as total_pending 
      FROM bookings 
      WHERE status = 'confirmed' AND payment_status != 'paid'
    `;
    const duesResult = await pool.query(duesQuery);
    const pendingDues = duesResult.rows[0].total_pending;

    // 3. Facility Performance
    const facilityQuery = `
      SELECT 
        f.facility_type as type,
        COALESCE(SUM(p.amount), 0) as revenue,
        COUNT(DISTINCT b.id) as bookings
      FROM turfs f
      LEFT JOIN slots s ON s.turf_id = f.id
      LEFT JOIN bookings b ON b.slot_id = s.id
      LEFT JOIN payments p ON p.booking_id = b.id
      GROUP BY f.facility_type
    `;
    const facilityResult = await pool.query(facilityQuery);

    // 4. Daily Trends (Last 14 days)
    const trendQuery = `
      WITH dates AS (
        SELECT generate_series(CURRENT_DATE - 13, CURRENT_DATE, '1 day')::date AS d
      )
      SELECT 
        d.d as date,
        COALESCE(SUM(p.amount), 0) as amount
      FROM dates d
      LEFT JOIN payments p ON p.created_at::date = d.d
      GROUP BY d.d
      ORDER BY d.d
    `;
    const trendResult = await pool.query(trendQuery);

    // 5. Advanced Metrics (Expenses, Unsettled Cash, No-Show Loss)
    const advancedQuery = `
      SELECT 
        (SELECT COALESCE(SUM(amount), 0) FROM expenses) as total_expenses,
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE method = 'cash' AND is_settled = false) as unsettled_cash,
        (SELECT COALESCE(SUM(s.price), 0) FROM bookings b JOIN slots s ON s.id = b.slot_id WHERE b.status = 'cancelled') as no_show_loss,
        (SELECT COUNT(*) FROM bookings WHERE status = 'confirmed') as total_confirmed_bookings
      FROM (SELECT 1) as dummy
    `;
    const advancedResult = await pool.query(advancedQuery);
    const advData = advancedResult.rows[0];

    const trendData = trendResult.rows.map(r => ({
      date: format(new Date(r.date), 'MMM dd'),
      amount: Number(r.amount)
    }));

    const totalRevenue = Number(splitData.total_volume);
    const platformFees = Number(splitData.total_fees);
    const totalExpenses = Number(advData.total_expenses);
    const netProfit = totalRevenue - platformFees - totalExpenses;
    
    // Tax Calculation (Assuming 18% GST inclusive)
    const gstCollected = totalRevenue * (18/118);

    res.json({
      summary: {
        totalRevenue,
        netRevenue: totalRevenue - platformFees,
        netProfit,
        cash: Number(splitData.cash_revenue),
        upi: Number(splitData.upi_revenue),
        online: Number(splitData.online_revenue),
        fees: platformFees,
        expenses: totalExpenses,
        pendingDues: Number(pendingDues),
        unsettledCash: Number(advData.unsettled_cash),
        noShowLoss: Number(advData.no_show_loss),
        gstAmount: gstCollected,
        aov: advData.total_confirmed_bookings > 0 ? (totalRevenue / advData.total_confirmed_bookings) : 0
      },
      facilities: facilityResult.rows.map(r => ({
        type: r.type,
        revenue: Number(r.revenue),
        bookings: Number(r.bookings)
      })),
      trends: trendData
    });

  } catch (err) {
    console.error('Finance Analytics Error:', err);
    res.status(500).json({ error: 'Failed to fetch financial data' });
  }
});

// POST /api/analytics/finance/settle - Mark all cash as settled (Close the Day)
router.post('/finance/settle', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      UPDATE payments 
      SET is_settled = true 
      WHERE method = 'cash' AND is_settled = false
      RETURNING id
    `);
    res.json({ message: `Day closed! ${result.rowCount} cash payments settled.`, settledCount: result.rowCount });
  } catch (err) {
    console.error('Settle-up error:', err);
    res.status(500).json({ error: 'Failed to settle payments' });
  }
});

module.exports = router;
