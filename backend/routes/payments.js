const express = require('express');
const router = express.Router();
const pool = require('../config/db');

router.post('/create-order', async (req, res) => {
  // TODO: Integrate Razorpay
  res.json({ orderId: 'demo_order_' + Date.now(), amount: req.body.amount });
});

router.post('/verify', async (req, res) => {
  const { booking_id } = req.body;
  await pool.query("UPDATE bookings SET status = 'confirmed', payment_status = 'paid' WHERE id = $1", [booking_id]);
  res.json({ success: true });
});

module.exports = router;
