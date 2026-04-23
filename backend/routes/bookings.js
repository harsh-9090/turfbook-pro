const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');
const cache = require('../config/cache');
const { bookingLimiter } = require('../middleware/rateLimiter');

router.post('/', bookingLimiter, async (req, res) => {
  try {
    const { name, phone, slot_id, paid_amount = 0 } = req.body;
    if (!name || !phone || !slot_id) return res.status(400).json({ error: 'Name, phone, and slot_id required' });

    // Check availability
    const slotResult = await pool.query('SELECT * FROM slots WHERE id = $1 AND is_available = true', [slot_id]);
    if (slotResult.rows.length === 0) return res.status(400).json({ error: 'Slot not available' });

    // Ensure slot doesn't already have an active booking
    const activeBookingResult = await pool.query("SELECT id FROM bookings WHERE slot_id = $1 AND status != 'cancelled'", [slot_id]);
    if (activeBookingResult.rows.length > 0) return res.status(400).json({ error: 'Slot is already booked by another user' });

    const slot = slotResult.rows[0];

    // Ensure slot is not blocked by a tournament
    const turfResult = await pool.query('SELECT facility_type FROM turfs WHERE id = $1', [slot.turf_id]);
    const facilityType = turfResult.rows[0].facility_type;

    const overlayTournament = await pool.query(`
      SELECT id FROM tournaments 
      WHERE is_active = true 
      AND sport_type ILIKE $1 
      AND start_date::DATE <= $2::DATE 
      AND end_date::DATE >= $2::DATE
    `, [facilityType, slot.date]);

    if (overlayTournament.rows.length > 0) return res.status(400).json({ error: 'Turf is closed due to an active tournament on this date' });


    // Create or find user
    let userResult = await pool.query('SELECT * FROM users WHERE phone = $1', [phone]);
    let userId;
    if (userResult.rows.length === 0) {
      const newUser = await pool.query('INSERT INTO users (name, phone, role) VALUES ($1, $2, $3) RETURNING id', [name, phone, 'user']);
      userId = newUser.rows[0].id;
    } else {
      userId = userResult.rows[0].id;
    }

    const totalAmount = slot.price || 800;
    const remainingAmount = Math.max(0, totalAmount - paid_amount);
    const paymentStatus = (paid_amount > 0 && remainingAmount === 0) ? 'paid' : 'pending';
    const bookingStatus = paid_amount > 0 ? 'confirmed' : 'pending'; // Manual bookings are confirmed immediately

    // Create booking
    const booking = await pool.query(
      `INSERT INTO bookings (user_id, slot_id, status, payment_status, paid_amount, remaining_amount) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [userId, slot_id, bookingStatus, paymentStatus, paid_amount, remainingAmount]
    );

    // Create payment record ONLY if paid_amount > 0 (Manual/Admin flow)
    if (paid_amount > 0) {
      await pool.query(
        `INSERT INTO payments (booking_id, amount, method) VALUES ($1, $2, $3)`,
        [booking.rows[0].id, paid_amount, 'cash'] // Default to cash for manual admin bookings
      );
    }

    // Invalidate related caches
    await cache.delPattern('bookings:*');
    await cache.delPattern('slots:*');
    await cache.del('admin:stats');
    await cache.del('analytics:dashboard');

    req.app.get('io').emit('booking_updated');
    res.status(201).json({ booking: booking.rows[0], amount: slot.price || 800 });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Calendar: fetch bookings within a date range
router.get('/calendar', authMiddleware, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) return res.status(400).json({ error: 'startDate and endDate are required' });

    const cacheKey = `bookings:calendar:${startDate}:${endDate}`;
    if (!cache.shouldBypass(req)) {
      const cached = await cache.get(cacheKey);
      if (cached) return res.json(cached);
    }

    const result = await pool.query(`
      SELECT b.id, b.status, b.payment_status, b.paid_amount, b.remaining_amount,
        u.name as customer_name, u.phone,
        s.date, s.start_time, s.end_time, s.price as total_amount,
        t.facility_type, t.name as facility_name
      FROM bookings b
      JOIN users u ON u.id = b.user_id
      JOIN slots s ON s.id = b.slot_id
      JOIN turfs t ON t.id = s.turf_id
      WHERE s.date BETWEEN $1 AND $2
      ORDER BY s.date ASC, s.start_time ASC
    `, [startDate, endDate]);

    await cache.set(cacheKey, result.rows, 30);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { date, status, limit } = req.query;
    const cacheKey = `bookings:list:${date || 'all'}:${status || 'all'}:${limit || 'none'}`;

    if (!cache.shouldBypass(req)) {
      const cached = await cache.get(cacheKey);
      if (cached) return res.json(cached);
    }

    let query = `
      SELECT b.*, u.name as customer_name, u.phone,
        s.date, s.start_time, s.end_time, s.price as total_amount,
        p.amount as last_payment_amount, p.method as payment_method,
        t.facility_type, t.name as facility_name
      FROM bookings b
      JOIN users u ON u.id = b.user_id
      JOIN slots s ON s.id = b.slot_id
      JOIN turfs t ON t.id = s.turf_id
      LEFT JOIN payments p ON p.booking_id = b.id AND p.id = (SELECT id FROM payments WHERE booking_id = b.id ORDER BY created_at DESC LIMIT 1)
      WHERE 1=1
    `;
    const params = [];
    if (date) { params.push(date); query += ` AND s.date = $${params.length}`; }
    if (status) { params.push(status); query += ` AND b.status = $${params.length}`; }
    
    query += ' ORDER BY b.created_at DESC';

    if (limit) {
      params.push(limit);
      query += ` LIMIT $${params.length}`;
    }

    const result = await pool.query(query, params);
    await cache.set(cacheKey, result.rows, 60); // 60 sec
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/:id/pay', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const { payment_mode, amount } = req.body; // amount is optional, defaults to entire remaining

    const bookingResult = await client.query('SELECT b.*, s.price FROM bookings b JOIN slots s ON s.id = b.slot_id WHERE b.id = $1', [id]);
    if (bookingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookingResult.rows[0];
    const payAmount = Number(amount) || Number(booking.remaining_amount);
    const newPaidAmount = Number(booking.paid_amount) + payAmount;
    const newRemainingAmount = Math.max(0, Number(booking.price) - newPaidAmount);
    const newPaymentStatus = newRemainingAmount === 0 ? 'paid' : 'pending';

    const updated = await client.query(
      `UPDATE bookings 
       SET payment_status = $1, paid_amount = $2, remaining_amount = $3, payment_mode = $4, status = 'confirmed'
       WHERE id = $5 RETURNING *`,
      [newPaymentStatus, newPaidAmount, newRemainingAmount, payment_mode || 'cash', id]
    );

    // Record the payment
    await client.query(
      `INSERT INTO payments (booking_id, amount, method) VALUES ($1, $2, $3)`,
      [id, payAmount, payment_mode || 'cash']
    );

    await client.query('COMMIT');

    await cache.delPattern('bookings:*');
    await cache.del('admin:stats');
    req.app.get('io').emit('booking_updated');

    res.json(updated.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// Public: Cancel a pending booking (called when user aborts Razorpay)
router.patch('/:id/cancel-pending', async (req, res) => {
  try {
    const { id } = req.params;
    // Only allow cancellation if status is 'pending'
    const result = await pool.query(
      `UPDATE bookings SET status = 'cancelled' WHERE id = $1 AND status = 'pending' RETURNING *`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Booking cannot be cancelled (not found or already processed)' });
    }

    await cache.delPattern('bookings:*');
    await cache.delPattern('slots:*');
    req.app.get('io').emit('booking_updated');
    
    res.json({ success: true, message: 'Pending booking cancelled' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
