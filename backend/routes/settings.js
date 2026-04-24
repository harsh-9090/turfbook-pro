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

// Get public site settings (contact info)
router.get('/contact', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM site_settings WHERE id = 1');
    if (result.rows.length === 0) {
      return res.json({ 
        address: '', phone: '', email: '', working_hours: '', 
        facebook_url: '', instagram_url: '', twitter_url: '', map_embed_url: '',
        gateway_percent: 2.00, gst_percent: 18.00,
        google_rating: 4.6, google_reviews_count: 150, google_maps_url: 'https://www.google.com/search?q=Akola+Sports+Arena+reviews'
      });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching contact settings:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update site settings (Admin only)
router.put('/contact', authMiddleware, async (req, res) => {
  const { 
    address, phone, email, working_hours, 
    facebook_url, instagram_url, twitter_url, map_embed_url,
    gateway_percent, gst_percent,
    google_rating, google_reviews_count, google_maps_url
  } = req.body;

  try {
    const query = `
      UPDATE site_settings 
      SET address = COALESCE($1, address), 
          phone = COALESCE($2, phone), 
          email = COALESCE($3, email), 
          working_hours = COALESCE($4, working_hours), 
          facebook_url = COALESCE($5, facebook_url), 
          instagram_url = COALESCE($6, instagram_url), 
          twitter_url = COALESCE($7, twitter_url),
          map_embed_url = COALESCE($8, map_embed_url),
          gateway_percent = COALESCE($9, gateway_percent),
          gst_percent = COALESCE($10, gst_percent),
          google_rating = COALESCE($11, google_rating),
          google_reviews_count = COALESCE($12, google_reviews_count),
          google_maps_url = COALESCE($13, google_maps_url),
          updated_at = NOW()
      WHERE id = 1
      RETURNING *
    `;
    const result = await pool.query(query, [
      address, phone, email, working_hours, 
      facebook_url, instagram_url, twitter_url, map_embed_url,
      gateway_percent, gst_percent,
      google_rating, google_reviews_count, google_maps_url
    ]);
    
    await cache.del('site:settings'); // Invalidate settings cache
    await logAction(req.user.id, 'UPDATE_CONTACT_SETTINGS', 'Updated website contact and financial settings');
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error updating site settings:', err);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

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
