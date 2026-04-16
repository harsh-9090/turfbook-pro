const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');

router.post('/', async (req, res) => {
  try {
    const { name, phone, slot_id } = req.body;
    if (!name || !phone || !slot_id) return res.status(400).json({ error: 'Name, phone, and slot_id required' });

    // Check availability
    const slotResult = await pool.query('SELECT * FROM slots WHERE id = $1 AND is_available = true', [slot_id]);
    if (slotResult.rows.length === 0) return res.status(400).json({ error: 'Slot not available' });

    const slot = slotResult.rows[0];

    // Create or find user
    let userResult = await pool.query('SELECT * FROM users WHERE phone = $1', [phone]);
    let userId;
    if (userResult.rows.length === 0) {
      const newUser = await pool.query('INSERT INTO users (name, phone, role) VALUES ($1, $2, $3) RETURNING id', [name, phone, 'user']);
      userId = newUser.rows[0].id;
    } else {
      userId = userResult.rows[0].id;
    }

    // Create booking
    const booking = await pool.query(
      `INSERT INTO bookings (user_id, slot_id, status, payment_status) 
       VALUES ($1, $2, 'pending', 'pending') RETURNING *`,
      [userId, slot_id]
    );

    // Create payment record
    await pool.query(
      `INSERT INTO payments (booking_id, amount, method) VALUES ($1, $2, 'online')`,
      [booking.rows[0].id, slot.price || 800]
    );

    req.app.get('io').emit('booking_updated');
    res.status(201).json({ booking: booking.rows[0], amount: slot.price || 800 });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { date, status } = req.query;
    let query = `
      SELECT b.*, u.name as customer_name, u.phone,
        s.date, s.start_time, s.end_time,
        p.amount, p.method as payment_method,
        t.facility_type, t.name as facility_name
      FROM bookings b
      JOIN users u ON u.id = b.user_id
      JOIN slots s ON s.id = b.slot_id
      JOIN turfs t ON t.id = s.turf_id
      LEFT JOIN payments p ON p.booking_id = b.id
      WHERE 1=1
    `;
    const params = [];
    if (date) { params.push(date); query += ` AND s.date = $${params.length}`; }
    if (status) { params.push(status); query += ` AND b.status = $${params.length}`; }
    query += ' ORDER BY b.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/:id/cancel', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE bookings SET status = 'cancelled', payment_status = 'refunded' WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Booking not found' });
    req.app.get('io').emit('booking_updated');
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
