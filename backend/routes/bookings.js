const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');
const cache = require('../config/cache');
const { bookingLimiter } = require('../middleware/rateLimiter');

router.post('/', bookingLimiter, async (req, res) => {
  try {
    const { name, phone, slot_id, paid_amount = 0, payment_method } = req.body;
    const is_manual = req.body.is_manual || req.body.isManual;
    if (!name || !phone || !slot_id) return res.status(400).json({ error: 'Name, phone, and slot_id required' });

    // Check availability
    const slotResult = await pool.query('SELECT * FROM slots WHERE id = $1 AND is_available = true', [slot_id]);
    if (slotResult.rows.length === 0) return res.status(400).json({ error: 'Slot not available' });

    // Ensure slot doesn't already have an active booking (considering shared physical resources)
    const activeBookingResult = await pool.query(`
      SELECT b.id FROM bookings b
      JOIN slots s_check ON b.slot_id = s_check.id
      JOIN turfs t_check ON s_check.turf_id = t_check.id
      JOIN slots s_orig ON s_orig.id = $1
      JOIN turfs t_orig ON s_orig.turf_id = t_orig.id
      WHERE b.status != 'cancelled'
      AND s_check.date = s_orig.date
      AND s_check.start_time = s_orig.start_time
      AND (
        s_check.id = s_orig.id 
        OR (t_orig.physical_resource_id IS NOT NULL AND t_orig.physical_resource_id = t_check.physical_resource_id)
      )
    `, [slot_id]);
    if (activeBookingResult.rows.length > 0) return res.status(400).json({ error: 'This time slot is already booked on this physical turf' });

    const slot = slotResult.rows[0];

    // Ensure slot is not blocked by a tournament
    const turfResult = await pool.query('SELECT facility_type FROM turfs WHERE id = $1', [slot.turf_id]);
    const facilityType = turfResult.rows[0].facility_type;

    const overlayTournament = await pool.query(`
      SELECT trn.id FROM tournaments trn
      JOIN turfs tf_orig ON tf_orig.id = $1
      WHERE trn.is_active = true 
      AND (
        trn.sport_type ILIKE tf_orig.facility_type
        OR EXISTS (
          SELECT 1 FROM turfs tf_shared 
          WHERE tf_shared.physical_resource_id = tf_orig.physical_resource_id
          AND tf_shared.facility_type ILIKE trn.sport_type
          AND tf_orig.physical_resource_id IS NOT NULL
        )
      )
      AND trn.start_date::DATE <= $2::DATE 
      AND trn.end_date::DATE >= $2::DATE
    `, [slot.turf_id, slot.date]);
    if (overlayTournament.rows.length > 0) return res.status(400).json({ error: 'This turf is currently reserved for a tournament event' });

    // Ensure date is not in arena_closures
    const arenaClosure = await pool.query(
      'SELECT reason FROM arena_closures WHERE date = $1 AND (turf_id IS NULL OR turf_id = $2)',
      [slot.date, slot.turf_id]
    );
    if (arenaClosure.rows.length > 0) {
      return res.status(400).json({ 
        error: `Arena is closed on this date for: ${arenaClosure.rows[0].reason}` 
      });
    }


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
    const bookingStatus = (paid_amount > 0 || is_manual) ? 'confirmed' : 'pending'; // Manual/Admin bookings are confirmed securely

    // Create booking
    const booking = await pool.query(
      `INSERT INTO bookings (user_id, slot_id, status, payment_status, paid_amount, remaining_amount, is_manual) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [userId, slot_id, bookingStatus, paymentStatus, paid_amount, remainingAmount, !!is_manual]
    );

    // Create payment record ONLY if paid_amount > 0 (Manual/Admin flow)
    if (paid_amount > 0) {
      await pool.query(
        `INSERT INTO payments (booking_id, amount, method) VALUES ($1, $2, $3)`,
        [booking.rows[0].id, paid_amount, payment_method || 'cash'] 
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
    const { date, status, limit, upcoming } = req.query;
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
    if (upcoming === 'true') {
      const nowIST = new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false });
      const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      params.push(todayIST);
      params.push(nowIST);
      query += ` AND b.status = 'confirmed' AND (s.date > $${params.length - 1} OR (s.date = $${params.length - 1} AND s.end_time > $${params.length}))`;
    }
    
    query += upcoming === 'true' ? ' ORDER BY s.date ASC, s.start_time ASC' : ' ORDER BY b.created_at DESC';

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
// Public: Get bookings by phone number (categorized)
router.get('/my-bookings/:phone', async (req, res) => {
  try {
    const { phone } = req.params;
    const result = await pool.query(`
      SELECT b.id, b.status, b.payment_status, b.paid_amount, b.remaining_amount,
        s.date, s.start_time, s.end_time, s.price as total_amount, s.table_number,
        t.facility_type, t.name as facility_name, t.image_url as facility_image
      FROM bookings b
      JOIN users u ON u.id = b.user_id
      JOIN slots s ON s.id = b.slot_id
      JOIN turfs t ON t.id = s.turf_id
      WHERE u.phone = $1
      ORDER BY s.date DESC, s.start_time DESC
    `, [phone]);

    const bookings = result.rows;
    const now = new Date();
    
    // Categorize into active and history
    const active = [];
    const history = [];

    bookings.forEach(b => {
      // Combine date and time for comparison
      const slotEnd = new Date(b.date);
      const [hours, minutes] = b.end_time.split(':');
      slotEnd.setHours(parseInt(hours), parseInt(minutes), 0);

      if (slotEnd > now && b.status !== 'cancelled') {
        active.push(b);
      } else {
        history.push(b);
      }
    });

    res.json({ active, history });
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Staff: Verify QR Token (Publicly accessible but returns limited info, Staff uses it to get ID)
router.get('/verify-qr/:token', async (req, res) => {
  try {
    const { token } = req.params;

    // Validate UUID format before querying to avoid "invalid syntax for type uuid" error
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(token)) {
      return res.status(400).json({ error: 'Invalid or Malformed QR Token' });
    }

    const result = await pool.query(`
      SELECT b.id, b.status, b.payment_status, b.paid_amount, b.remaining_amount, b.checked_in_at,
        s.date, s.start_time, s.end_time, s.price as total_amount, s.table_number,
        u.name as customer_name, u.phone,
        t.facility_type, t.name as facility_name
      FROM bookings b
      JOIN users u ON u.id = b.user_id
      JOIN slots s ON s.id = b.slot_id
      JOIN turfs t ON t.id = s.turf_id
      WHERE b.qr_token = $1
    `, [token]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Invalid QR Token' });
    
    const b = result.rows[0];
    const now = new Date();
    
    // Convert b.date and times to absolute UTC timestamps using Arena (+05:30) offset
    const datePart = b.date instanceof Date ? b.date.toISOString().split('T')[0] : b.date;
    
    // PostgreSQL TIME values may come as "HH:mm:ss" or "HH:mm" — normalize to HH:mm
    const normalizeTime = (t) => {
      const str = String(t);
      const parts = str.split(':');
      return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
    };
    
    const startTimeStr = normalizeTime(b.start_time);
    const endTimeStr = normalizeTime(b.end_time);
    
    const slotStart = new Date(`${datePart}T${startTimeStr}:00+05:30`);
    const slotEnd = new Date(`${datePart}T${endTimeStr}:00+05:30`);

    console.log(`[QR Debug] now=${now.toISOString()}, slotStart=${slotStart.toISOString()}, slotEnd=${slotEnd.toISOString()}, rawStart=${b.start_time}, rawEnd=${b.end_time}`);

    const isExpired = now > slotEnd;
    const isFuture = now < slotStart;
    const isActive = now >= slotStart && now <= slotEnd;

    res.json({ 
      booking: b, 
      timing: { isExpired, isFuture, isActive },
      canCheckIn: isActive && !b.checked_in_at && b.status !== 'cancelled'
    });
  } catch (err) {
    res.status(500).json({ error: 'Verification failed: ' + err.message });
  }
});

// Staff: Mark as Checked-In
router.patch('/:id/check-in', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "UPDATE bookings SET checked_in_at = NOW() WHERE id = $1 AND checked_in_at IS NULL RETURNING *",
      [id]
    );
    if (result.rows.length === 0) return res.status(400).json({ error: 'Already checked in or booking not found' });
    
    req.app.get('io').emit('booking_updated');
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Check-in failed' });
  }
});

// Analytics: Get Live Presence
router.get('/live-presence', authMiddleware, async (req, res) => {
  try {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const nowIST = new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false });

    const result = await pool.query(`
      SELECT b.id, b.checked_in_at, u.phone as customer_phone, u.name as customer_name, t.name as facility_name,
             s.start_time, s.end_time, s.table_number
      FROM bookings b
      JOIN users u ON u.id = b.user_id
      JOIN slots s ON s.id = b.slot_id
      JOIN turfs t ON t.id = s.turf_id
      WHERE s.date = $1
      AND b.status != 'cancelled'
      ORDER BY s.start_time
    `, [today]);

    const allBookings = result.rows;
    const finalPresences = [];
    const processedKeys = new Set();

    for (const b of allBookings) {
      const isCurrentlyInside = b.checked_in_at !== null && b.end_time > nowIST;
      const isExpectedToday = b.checked_in_at === null && b.end_time >= nowIST;

      if (isCurrentlyInside || isExpectedToday) {
        const traceKey = `${b.customer_phone}-${b.facility_name}-${b.table_number}`;
        if (processedKeys.has(traceKey)) continue;

        let tracingEndTime = b.end_time;
        let nextSegment = allBookings.find(next => next.start_time === tracingEndTime && next.customer_phone === b.customer_phone && next.facility_name === b.facility_name);
        while (nextSegment) {
          tracingEndTime = nextSegment.end_time;
          nextSegment = allBookings.find(next => next.start_time === tracingEndTime && next.customer_phone === b.customer_phone && next.facility_name === b.facility_name);
        }

        finalPresences.push({
          ...b,
          end_time: tracingEndTime
        });
        processedKeys.add(traceKey);
      }
    }

    res.json(finalPresences);
  } catch (err) {
    res.status(500).json({ error: 'Presence fetch failed' });
  }
});

// Staff: Extend a booking by one slot (if available)
router.post('/:id/extend', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;

    // 1. Get original booking and slot details
    const orig = await client.query(`
      SELECT b.*, s.date, s.end_time, s.turf_id, s.table_number, u.name, u.phone
      FROM bookings b
      JOIN slots s ON s.id = b.slot_id
      JOIN users u ON u.id = b.user_id
      WHERE b.id = $1
    `, [id]);

    if (orig.rows.length === 0) return res.status(404).json({ error: 'Original booking not found' });
    const bOrig = orig.rows[0];

    // 2. Find the next slot (same date, same turf, start_time = current end_time)
    const nextSlot = await client.query(`
      SELECT * FROM slots 
      WHERE turf_id = $1 
      AND date = $2 
      AND start_time = $3 
      AND is_available = true
      LIMIT 1
    `, [bOrig.turf_id, bOrig.date, bOrig.end_time]);

    if (nextSlot.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No consecutive slots available for extension' });
    }

    const sNext = nextSlot.rows[0];

    // 3. Create the extension booking
    const newBooking = await client.query(
      `INSERT INTO bookings (user_id, slot_id, status, payment_status, paid_amount, remaining_amount, extension_from_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [bOrig.user_id, sNext.id, 'confirmed', 'pending', 0, sNext.price, id]
    );

    await client.query('COMMIT');
    await cache.delPattern('bookings:*');
    await cache.delPattern('slots:*');
    req.app.get('io').emit('booking_updated');

    res.json({ message: 'Booking extended successfully', booking: newBooking.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Extension failed: ' + err.message });
  } finally {
    client.release();
  }
});

router.patch('/:id/cancel-pending', async (req, res) => {
  try {
    const { id } = req.params;
    // Delete booking entirely if it was pending
    const result = await pool.query(
      `DELETE FROM bookings WHERE id = $1 AND status = 'pending' RETURNING *`,
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
