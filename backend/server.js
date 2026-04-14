// ============================================
// TURFZONE BACKEND - Node.js + Express + PostgreSQL
// ============================================
// This is a SEPARATE backend project.
// Deploy to Render, Railway, or any Node.js host.
//
// Setup Instructions:
// 1. Create a new folder: mkdir turfzone-backend && cd turfzone-backend
// 2. npm init -y
// 3. npm install express cors dotenv jsonwebtoken bcryptjs pg
// 4. Copy this file as server.js
// 5. Create .env with the variables below
// 6. node server.js
//
// .env example:
// PORT=5000
// DATABASE_URL=postgresql://user:pass@host:5432/turfzone
// JWT_SECRET=your-super-secret-jwt-key
// RAZORPAY_KEY_ID=rzp_test_xxxxx
// RAZORPAY_KEY_SECRET=xxxxx
// FRONTEND_URL=http://localhost:5173
// ============================================

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Database
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

// ============ AUTH MIDDLEWARE ============
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// ============ AUTH ROUTES ============
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const result = await pool.query('SELECT * FROM users WHERE email = $1 AND role = $2', [email, 'admin']);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ============ SLOTS ROUTES ============
app.get('/api/slots', async (req, res) => {
  try {
    const { date, turf_id } = req.query;
    if (!date) return res.status(400).json({ error: 'Date is required' });

    const result = await pool.query(
      `SELECT s.*, 
        CASE WHEN b.id IS NOT NULL THEN false ELSE s.is_available END as is_available
       FROM slots s
       LEFT JOIN bookings b ON b.slot_id = s.id AND b.status != 'cancelled'
       WHERE s.date = $1 ${turf_id ? 'AND s.turf_id = $2' : ''}
       ORDER BY s.start_time`,
      turf_id ? [date, turf_id] : [date]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.patch('/api/slots/:id/toggle', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE slots SET is_available = NOT is_available WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Slot not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ============ BOOKINGS ROUTES ============
app.post('/api/bookings', async (req, res) => {
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

    res.status(201).json({ booking: booking.rows[0], amount: slot.price || 800 });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/bookings', authMiddleware, async (req, res) => {
  try {
    const { date, status } = req.query;
    let query = `
      SELECT b.*, u.name as customer_name, u.phone,
        s.date, s.start_time, s.end_time,
        p.amount, p.method as payment_method
      FROM bookings b
      JOIN users u ON u.id = b.user_id
      JOIN slots s ON s.id = b.slot_id
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

app.patch('/api/bookings/:id/cancel', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE bookings SET status = 'cancelled', payment_status = 'refunded' WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Booking not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ============ ADMIN ANALYTICS ============
app.get('/api/admin/stats', authMiddleware, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const [total, todayBookings, revenue, upcoming] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM bookings'),
      pool.query('SELECT COUNT(*) FROM bookings b JOIN slots s ON s.id = b.slot_id WHERE s.date = $1', [today]),
      pool.query('SELECT COALESCE(SUM(p.amount), 0) as total FROM payments p JOIN bookings b ON b.id = p.booking_id WHERE b.status != $1', ['cancelled']),
      pool.query('SELECT COUNT(*) FROM bookings b JOIN slots s ON s.id = b.slot_id WHERE s.date >= $1 AND b.status = $2', [today, 'confirmed']),
    ]);
    res.json({
      totalBookings: parseInt(total.rows[0].count),
      todayBookings: parseInt(todayBookings.rows[0].count),
      totalRevenue: parseInt(revenue.rows[0].total),
      upcomingBookings: parseInt(upcoming.rows[0].count),
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ============ PAYMENTS (Razorpay placeholder) ============
app.post('/api/payments/create-order', async (req, res) => {
  // TODO: Integrate Razorpay
  // const Razorpay = require('razorpay');
  // const instance = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
  // const order = await instance.orders.create({ amount: req.body.amount * 100, currency: 'INR' });
  res.json({ orderId: 'demo_order_' + Date.now(), amount: req.body.amount });
});

app.post('/api/payments/verify', async (req, res) => {
  // TODO: Verify Razorpay signature
  const { booking_id } = req.body;
  await pool.query("UPDATE bookings SET status = 'confirmed', payment_status = 'paid' WHERE id = $1", [booking_id]);
  res.json({ success: true });
});

// Health check
app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => console.log(`TurfZone API running on port ${PORT}`));
