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
      totalBookings,
      totalSessions,
      todayBookingCount,
      todaySessionCount
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
      pool.query('SELECT COUNT(*) FROM bookings WHERE status != $1', ['cancelled']),
      pool.query(`SELECT COUNT(*) FROM table_sessions WHERE status = 'completed'`),
      pool.query(`SELECT COUNT(*) FROM bookings b JOIN slots s ON s.id = b.slot_id WHERE s.date = $1 AND b.status != 'cancelled'`, [today]),
      pool.query(`SELECT COUNT(*) FROM table_sessions WHERE DATE(start_time) = $1 AND status = 'completed'`, [today])
    ]);

    // 6. Unified Recent Activities (Confimed Bookings + Completed Sessions)
    const recentQuery = `
      WITH combined_recent AS (
        SELECT 
          b.id::text, 'booking' as type, f.name as facility_name, f.facility_type,
          u.name as customer_name, u.phone as customer_phone,
          (s.date + s.start_time) as start_time, (s.date + s.end_time) as end_time,
          COALESCE((SELECT SUM(amount) FROM payments WHERE booking_id = b.id), 0) as total_amount,
          b.created_at
        FROM bookings b
        JOIN slots s ON s.id = b.slot_id
        JOIN turfs f ON f.id = s.turf_id
        JOIN users u ON u.id = b.user_id
        WHERE b.status = 'confirmed'
        UNION ALL
        SELECT 
          ts.id::text, 'session' as type, f.name as facility_name, f.facility_type,
          ts.customer_name, ts.customer_phone,
          ts.start_time, ts.end_time,
          ts.total_amount,
          ts.created_at
        FROM table_sessions ts
        JOIN turfs f ON f.id = ts.turf_id
        WHERE ts.status = 'completed'
      )
      SELECT * FROM combined_recent 
      ORDER BY created_at DESC 
      LIMIT 50
    `;
    const recentResult = await pool.query(recentQuery);

    // 7. Unified Top Customers (By Total Spent)
    const topCustomersQuery = `
      WITH customer_revenue AS (
        SELECT u.name as customer_name, u.phone as customer_phone, p.amount as spent
        FROM payments p
        JOIN bookings b ON b.id = p.booking_id
        JOIN users u ON u.id = b.user_id
        WHERE b.status = 'confirmed'
        UNION ALL
        SELECT customer_name, customer_phone, total_amount as spent
        FROM table_sessions
        WHERE status = 'completed' AND customer_name IS NOT NULL
      )
      SELECT customer_name, customer_phone, COUNT(*) as total_visits, SUM(spent) as total_spent
      FROM customer_revenue
      GROUP BY customer_name, customer_phone
      ORDER BY total_spent DESC
      LIMIT 10
    `;
    const topCustomersResult = await pool.query(topCustomersQuery);

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
      topCustomers: topCustomersResult.rows.map(r => ({
        name: r.customer_name,
        phone: r.customer_phone,
        visits: parseInt(r.total_visits),
        spent: parseFloat(r.total_spent)
      })),
      sessionHistory: recentResult.rows.map(r => ({
        id: r.id,
        type: r.type,
        facility: r.facility_name,
        sportType: r.facility_type,
        customer: r.customer_name,
        phone: r.customer_phone,
        startTime: r.start_time,
        endTime: r.end_time,
        amount: parseFloat(r.total_amount || 0)
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

    // 1. Unified Revenue Split (Bookings + Table Sessions)
    const unifiedQuery = `
      WITH unified_revenue AS (
        -- Payments from bookings and tournaments
        SELECT amount, platform_fee, method, is_settled, created_at FROM payments
        UNION ALL
        -- Direct revenue from completed table sessions (Snooker/Pool walk-ins)
        SELECT total_amount as amount, 0 as platform_fee, payment_mode as method, true as is_settled, end_time as created_at 
        FROM table_sessions WHERE status = 'completed'
      )
      SELECT 
        COALESCE(SUM(amount), 0) as arena_revenue,
        COALESCE(SUM(CASE WHEN method = 'cash' THEN amount ELSE 0 END), 0) as cash_revenue,
        COALESCE(SUM(CASE WHEN method = 'upi' THEN amount ELSE 0 END), 0) as upi_revenue,
        COALESCE(SUM(CASE WHEN method = 'online' THEN amount ELSE 0 END), 0) as online_revenue,
        COALESCE(SUM(platform_fee), 0) as total_fees,
        COALESCE(SUM(CASE WHEN method = 'cash' AND is_settled = false THEN amount ELSE 0 END), 0) as unsettled_cash
      FROM unified_revenue
    `;
    const splitResult = await pool.query(unifiedQuery);
    const splitData = splitResult.rows[0];

    // 2. Pending Dues
    const duesQuery = `
      SELECT COALESCE(SUM(remaining_amount), 0) as total_pending 
      FROM bookings 
      WHERE status = 'confirmed' AND payment_status != 'paid'
    `;
    const duesResult = await pool.query(duesQuery);
    const pendingDues = duesResult.rows[0].total_pending;

    // 3. Facility Performance (Bookings + Sessions)
    const facilityQuery = `
      SELECT 
        f.facility_type as type,
        COALESCE(SUM(p.amount), 0) + COALESCE((SELECT SUM(ts.total_amount) FROM table_sessions ts WHERE ts.turf_id = f.id AND ts.status = 'completed'), 0) as revenue,
        COUNT(DISTINCT b.id) + COALESCE((SELECT COUNT(*) FROM table_sessions ts WHERE ts.turf_id = f.id AND ts.status = 'completed'), 0) as total_activities
      FROM turfs f
      LEFT JOIN slots s ON s.turf_id = f.id
      LEFT JOIN bookings b ON b.slot_id = s.id
      LEFT JOIN payments p ON p.booking_id = b.id
      GROUP BY f.facility_type
    `;
    const facilityResult = await pool.query(facilityQuery);

    // 4. Daily Trends (Bookings + Sessions)
    const trendQuery = `
      WITH dates AS (
        SELECT generate_series(CURRENT_DATE - 13, CURRENT_DATE, '1 day')::date AS d
      ),
      combined_daily AS (
        SELECT created_at::date as d, amount FROM payments
        UNION ALL
        SELECT end_time::date as d, total_amount as amount FROM table_sessions WHERE status = 'completed'
      )
      SELECT 
        d.d as date,
        COALESCE(SUM(c.amount), 0) as amount
      FROM dates d
      LEFT JOIN combined_daily c ON c.d = d.d
      GROUP BY d.d
      ORDER BY d.d
    `;
    const trendResult = await pool.query(trendQuery);

    // 5. Advanced Metrics
    const advancedQuery = `
      SELECT 
        (SELECT COALESCE(SUM(amount), 0) FROM expenses) as total_expenses,
        (SELECT COALESCE(SUM(s.price), 0) FROM bookings b JOIN slots s ON s.id = b.slot_id WHERE b.status = 'cancelled') as no_show_loss,
        (SELECT COUNT(*) FROM bookings WHERE status = 'confirmed') + (SELECT COUNT(*) FROM table_sessions WHERE status = 'completed') as total_activities
      FROM (SELECT 1) as dummy
    `;
    const advancedResult = await pool.query(advancedQuery);
    const advData = advancedResult.rows[0];

    const trendData = trendResult.rows.map(r => ({
      date: format(new Date(r.date), 'MMM dd'),
      amount: Number(r.amount)
    }));

    const arenaRevenue = Number(splitData.arena_revenue);
    const platformFees = Number(splitData.total_fees); // Collected separately as surcharge
    const totalExpenses = Number(advData.total_expenses);
    const netProfit = arenaRevenue - totalExpenses; // Fees are not deducted from arena's share
    
    res.json({
      summary: {
        totalRevenue: arenaRevenue, // The "Turf Price" revenue
        netProfit,
        cash: Number(splitData.cash_revenue),
        upi: Number(splitData.upi_revenue),
        online: Number(splitData.online_revenue),
        fees: platformFees,
        expenses: totalExpenses,
        pendingDues: Number(pendingDues),
        unsettledCash: Number(splitData.unsettled_cash),
        noShowLoss: Number(advData.no_show_loss),
        aov: advData.total_activities > 0 ? (arenaRevenue / advData.total_activities) : 0
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
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Settle booking payments
      const payResult = await client.query(`
        UPDATE payments SET is_settled = true 
        WHERE method = 'cash' AND is_settled = false
      `);
      
      // Settle table sessions
      const sessionResult = await client.query(`
        UPDATE table_sessions SET is_settled = true 
        WHERE payment_mode = 'cash' AND is_settled = false
      `);
      
      await client.query('COMMIT');
      const totalSettle = (payResult.rowCount || 0) + (sessionResult.rowCount || 0);
      res.json({ 
        message: `Day closed! ${totalSettle} cash transactions settled.`, 
        settledCount: totalSettle 
      });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Settle-up error:', err);
    res.status(500).json({ error: 'Failed to settle payments' });
  }
});

module.exports = router;
