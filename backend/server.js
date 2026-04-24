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
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const { Server } = require('socket.io');
const { globalLimiter } = require('./middleware/rateLimiter');
const pool = require('./config/db');
const { client: redisClient } = require('./config/redis');
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
const settingsRoutes = require('./routes/settings');
const tournamentsRoutes = require('./routes/tournaments');
const staffRoutes = require('./routes/staff');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: process.env.FRONTEND_URL || '*' } });
app.set('io', io);

const PORT = process.env.PORT || 5000;

// Security & Performance Middleware
app.set('trust proxy', 1); // Trust first proxy (Render/Railway)
app.use(helmet()); // Basic security headers
app.use(compression()); // Gzip compression
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev')); // Logging
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json({ limit: '10kb' })); // Payload limit
app.use('/api', globalLimiter); // Global rate limiter

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
app.use('/api/settings', settingsRoutes);
app.use('/api/tournaments', tournamentsRoutes);
app.use('/api/staff', staffRoutes);

// Health check
app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err.stack);
  res.status(500).json({ 
    error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message 
  });
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

server.listen(PORT, async () => {
  console.log(`Akola Sports Arena API running on port ${PORT}`);
  // One-time staff migration
  try {
    await pool.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check`);
    await pool.query(`ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'admin', 'staff'))`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS allowed_tabs TEXT[] DEFAULT '{}'`);
    await pool.query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS platform_fee DECIMAL(10, 2) DEFAULT 0.00`);
    // Site settings expansion
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_hash TEXT`);
    // Ensure at least one setting row exists
    await pool.query(`INSERT INTO site_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING`);
    
    console.log('[MIGRATION] Schema ready');
  } catch (err) {
    console.error('[MIGRATION] Staff schema error (non-fatal):', err.message);
  }
});

// Graceful Shutdown
const shutdown = async (signal) => {
  console.log(`\n[${signal}] Shutting down gracefully...`);
  
  // Set a safety timeout for forced exit
  const forceExit = setTimeout(() => {
    console.warn('[SHUTDOWN] Forced exit after timeout.');
    process.exit(1);
  }, 3000);

  try {
    // Stop accepting new connections
    server.close(() => {
      console.log('[HTTP] Server stopped.');
    });

    // Close DB & Redis
    if (pool) {
      await pool.end();
      console.log('[POSTGRES] Pool ended.');
    }
    if (redisClient) {
      await redisClient.quit();
      console.log('[REDIS] Client quit.');
    }

    clearTimeout(forceExit);
    console.log('[SHUTDOWN] Clean exit.');
    process.exit(0);
  } catch (err) {
    console.error('[SHUTDOWN ERROR]', err);
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
