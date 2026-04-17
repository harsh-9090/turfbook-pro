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
        
        // Fetch booking and slot price
        const bookingResult = await client.query(
          `SELECT b.*, s.price as total_price 
           FROM bookings b 
           JOIN slots s ON s.id = b.slot_id 
           WHERE b.id = $1`, 
          [booking_id]
        );
        
        if (bookingResult.rows.length === 0) {
          throw new Error('Booking not found');
        }
        
        const booking = bookingResult.rows[0];

        // Fetch the amount paid from Razorpay
        const rzpOrder = await razorpay.orders.fetch(razorpay_order_id);
        const amountPaid = rzpOrder.amount / 100; // Convert paise to INR

        const newPaidAmount = Number(booking.paid_amount || 0) + amountPaid;
        const newRemainingAmount = Math.max(0, Number(booking.total_price) - newPaidAmount);
        const newPaymentStatus = newRemainingAmount <= 0 ? 'paid' : 'pending';

        // Update booking status and financial fields
        await client.query(
          `UPDATE bookings 
           SET status = 'confirmed', 
               payment_status = $1, 
               paid_amount = $2, 
               remaining_amount = $3 
           WHERE id = $4`,
          [newPaymentStatus, newPaidAmount, newRemainingAmount, booking_id]
        );

        // Record the payment in the payments table
        await client.query(
          `INSERT INTO payments (booking_id, amount, method, razorpay_order_id, razorpay_payment_id) 
           VALUES ($1, $2, 'online', $3, $4)`,
          [booking_id, amountPaid, razorpay_order_id, razorpay_payment_id]
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
