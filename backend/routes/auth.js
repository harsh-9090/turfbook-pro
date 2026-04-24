const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { loginLimiter } = require('../middleware/rateLimiter');

const authMiddleware = require('../middleware/auth');

// Helper for audit logging
async function logAction(adminId, action, details) {
  try {
    await pool.query('INSERT INTO audit_logs (admin_id, action, details) VALUES ($1, $2, $3)', [adminId, action, details]);
  } catch (err) {
    console.error('Audit log failed:', err);
  }
}

// GET /profiles - Public list of staff for PIN login selection
router.get('/staff-profiles', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name FROM users WHERE role = $1 ORDER BY name ASC', ['staff']);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const result = await pool.query('SELECT * FROM users WHERE email = $1 AND role IN ($2, $3)', [email, 'admin', 'staff']);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, allowed_tabs: user.allowed_tabs || [], token_version: user.token_version }, 
      process.env.JWT_SECRET, 
      { expiresIn: '24h' }
    );
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, allowed_tabs: user.allowed_tabs || [] } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login-pin', loginLimiter, async (req, res) => {
  try {
    const { email, pin } = req.body;
    if (!email || !pin) return res.status(400).json({ error: 'Email and PIN required' });

    const result = await pool.query('SELECT * FROM users WHERE email = $1 AND role IN ($2, $3)', [email, 'admin', 'staff']);
    const user = result.rows[0];
    if (!user || !user.pin_hash) return res.status(401).json({ error: 'PIN login not set up or invalid credentials' });

    const valid = await bcrypt.compare(pin, user.pin_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid PIN' });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, allowed_tabs: user.allowed_tabs || [], token_version: user.token_version }, 
      process.env.JWT_SECRET, 
      { expiresIn: '24h' }
    );
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, allowed_tabs: user.allowed_tabs || [] } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update Profile
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    await pool.query(
      'UPDATE users SET name = $1, email = $2 WHERE id = $3',
      [name, email || req.user.email, req.user.id]
    );

    await logAction(req.user.id, 'UPDATE_PROFILE', `Updated name to ${name}`);
    res.json({ message: 'Profile updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update Password
router.put('/password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both passwords required' });

    const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const user = result.rows[0];

    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Current password incorrect' });

    const newHash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, req.user.id]);

    await logAction(req.user.id, 'CHANGE_PASSWORD', 'Password updated successfully');
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Logout from all devices
router.post('/logout-all', authMiddleware, async (req, res) => {
  try {
    await pool.query('UPDATE users SET token_version = token_version + 1 WHERE id = $1', [req.user.id]);
    await logAction(req.user.id, 'GLOBAL_LOGOUT', 'User logged out from all devices');
    res.json({ message: 'Logged out from all devices successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update PIN
router.put('/pin', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPin } = req.body;
    if (!currentPassword || !newPin) return res.status(400).json({ error: 'Both password and new PIN required' });
    if (!/^\d{4}$/.test(newPin)) return res.status(400).json({ error: 'PIN must be exactly 4 digits' });

    const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const user = result.rows[0];

    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Current password incorrect' });

    const pinHash = await bcrypt.hash(newPin, 10);
    await pool.query('UPDATE users SET pin_hash = $1 WHERE id = $2', [pinHash, req.user.id]);

    await logAction(req.user.id, 'CHANGE_PIN', '4-digit PIN updated successfully');
    res.json({ message: 'PIN updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Staff Login via PIN (Selection flow)
router.post('/login-staff-pin', loginLimiter, async (req, res) => {
  try {
    const { id, pin } = req.body;
    if (!id || !pin) return res.status(400).json({ error: 'Staff ID and PIN required' });

    const result = await pool.query('SELECT * FROM users WHERE id = $1 AND role = $2', [id, 'staff']);
    const user = result.rows[0];
    if (!user || !user.pin_hash) return res.status(401).json({ error: 'Invalid staff member or PIN not set' });

    const valid = await bcrypt.compare(pin, user.pin_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid PIN' });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, allowed_tabs: user.allowed_tabs || [], token_version: user.token_version }, 
      process.env.JWT_SECRET, 
      { expiresIn: '24h' }
    );
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, allowed_tabs: user.allowed_tabs || [] } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
