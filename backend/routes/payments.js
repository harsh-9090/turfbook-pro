const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const pool = require('../config/db');
const cache = require('../config/cache');
const { paymentLimiter } = require('../middleware/rateLimiter');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create Order
router.post('/create-order', paymentLimiter, async (req, res) => {
  try {
    const { amount, booking_id } = req.body;
    
    if (!amount || !booking_id) {
      return res.status(400).json({ error: 'Amount and booking_id are required' });
    }

    const options = {
      amount: Math.round(amount * 100), // Convert to paise
      currency: "INR",
      receipt: booking_id,
    };

    const order = await razorpay.orders.create(options);
    
    // Update booking with the razorpay order id
    await pool.query(
      'UPDATE bookings SET razorpay_order_id = $1 WHERE id = $2',
      [order.id, booking_id]
    );

    res.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.RAZORPAY_KEY_ID
    });
  } catch (err) {
    console.error('Razorpay Order Error:', err);
    res.status(500).json({ error: 'Failed to create payment order: ' + err.message });
  }
});

// Verify Payment Signature
router.post('/verify', paymentLimiter, async (req, res) => {
  try {
    const { 
      booking_id, 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature 
    } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    if (!process.env.RAZORPAY_KEY_SECRET) {
      console.error('[PAYMENT ERROR] RAZORPAY_KEY_SECRET is missing from environment!');
      return res.status(500).json({ error: 'Payment configuration error' });
    }

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    const isAuthentic = expectedSignature === razorpay_signature;

    if (isAuthentic) {
      // Start a transaction for consistency
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        
        // Update booking status
        await client.query(
          "UPDATE bookings SET status = 'confirmed', payment_status = 'paid' WHERE id = $1",
          [booking_id]
        );

        // Update existing payment record with Razorpay details
        await client.query(
          `UPDATE payments SET razorpay_order_id = $1, razorpay_payment_id = $2 WHERE booking_id = $3`,
          [razorpay_order_id, razorpay_payment_id, booking_id]
        );

        await client.query('COMMIT');
        
        // Invalidate caches to show updated status
        await cache.delPattern('bookings:*');
        await cache.del('admin:stats');
        await cache.del('analytics:dashboard');
        
        req.app.get('io').emit('booking_updated');
        
        res.json({ success: true, message: 'Payment verified and booking confirmed' });
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    } else {
      res.status(400).json({ success: false, error: 'Invalid signature' });
    }
  } catch (err) {
    console.error('Payment Verification Error:', err);
    res.status(500).json({ error: 'Verification failed: ' + err.message });
  }
});

module.exports = router;
