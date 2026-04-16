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
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

// Require Routes
const authRoutes = require('./routes/auth');
const slotsRoutes = require('./routes/slots');
const bookingsRoutes = require('./routes/bookings');
const adminRoutes = require('./routes/admin');
const paymentsRoutes = require('./routes/payments');
const facilitiesRoutes = require('./routes/facilities');
const templatesRoutes = require('./routes/templates');
const sessionsRoutes = require('./routes/sessions');
const analyticsRoutes = require('./routes/analytics');
const pricingRoutes = require('./routes/pricing');
const galleryRoutes = require('./routes/gallery');
const testimonialsRoutes = require('./routes/testimonials');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: process.env.FRONTEND_URL || '*' } });
app.set('io', io);

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

// Connect Routes
app.use('/api/auth', authRoutes);
app.use('/api/slots', slotsRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/facilities', facilitiesRoutes);
app.use('/api/templates', templatesRoutes);
app.use('/api/sessions', sessionsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/pricing', pricingRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/testimonials', testimonialsRoutes);

// Health check
app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

server.listen(PORT, () => console.log(`TurfZone API running on port ${PORT}`));
