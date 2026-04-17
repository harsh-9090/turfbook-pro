const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');
const cache = require('../config/cache');

// Helper for audit logging
async function logAction(adminId, action, details) {
  try {
    await pool.query('INSERT INTO audit_logs (admin_id, action, details) VALUES ($1, $2, $3)', [adminId, action, details]);
  } catch (err) {
    console.error('Audit log failed:', err);
  }
}

// Reset Website Data (Danger Zone)
router.post('/reset-data', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Comprehensive wipe using TRUNCATE CASCADE
    // This targets the root entities and wipes everything dependent via CASCADE
    await client.query(`
      TRUNCATE 
        turfs, 
        gallery_images, 
        testimonials, 
        pricing_plans, 
        slot_templates, 
        table_sessions,
        audit_logs
      RESTART IDENTITY CASCADE
    `);

    // 2. Clean users (keep admin)
    await client.query('DELETE FROM users WHERE role != $1', ['admin']);
    
    await client.query('COMMIT');

    // 3. Invalidate complete Redis cache
    await cache.flush();

    // 4. Log the reset action (in the now empty audit_logs)
    await logAction(req.user.id, 'FACTORY_RESET', 'Complete system reset executed. All data cleared EXCEPT admin account.');
    
    res.json({ success: true, message: 'Website data has been completely reset to factory state' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Reset failed:', err);
    res.status(500).json({ error: 'Failed to complete factory reset' });
  } finally {
    client.release();
  }
});

// Export Database (JSON)
router.get('/export', authMiddleware, async (req, res) => {
  try {
    const data = {};
    
    const tables = ['users', 'turfs', 'slots', 'bookings', 'payments', 'audit_logs'];
    
    for (const table of tables) {
      const result = await pool.query(`SELECT * FROM ${table}`);
      data[table] = result.rows;
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=akolasports_backup.json');
    res.send(JSON.stringify(data, null, 2));

    await logAction(req.user.id, 'EXPORT_DATA', 'Database exported to JSON');
  } catch (err) {
    console.error('Export failed:', err);
    res.status(500).json({ error: 'Failed to export database' });
  }
});

module.exports = router;
