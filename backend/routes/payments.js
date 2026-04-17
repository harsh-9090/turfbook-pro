const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { paymentLimiter } = require('../middleware/rateLimiter');

router.post('/create-order', paymentLimiter, async (req, res) => {
  // TODO: Integrate Razorpay
  res.json({ orderId: 'demo_order_' + Date.now(), amount: req.body.amount });
});

router.post('/verify', paymentLimiter, async (req, res) => {
  const { booking_id } = req.body;
  await pool.query("UPDATE bookings SET status = 'confirmed', payment_status = 'paid' WHERE id = $1", [booking_id]);
  res.json({ success: true });
});

module.exports = router;
