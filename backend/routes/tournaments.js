const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');
const cache = require('../config/cache');

const cloudinary = require('../config/cloudinary');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'akola-sports-arena/tournaments',
    allowed_formats: ['jpg', 'png', 'webp', 'jpeg'],
  },
});
const upload = multer({ storage: storage });

// Admin: Upload Banner Image
router.post('/upload', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
    res.json({ secure_url: req.file.path });
  } catch (err) {
    res.status(500).json({ error: 'Image upload failed' });
  }
});

// Admin: Create Tournament
router.post('/', authMiddleware, async (req, res) => {
  const { name, sport_type, description, rules, entry_fee, prize, start_date, end_date, max_teams, banner_image, is_featured, show_on_homepage, display_priority, display_start_date, display_end_date, is_active } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO tournaments (name, sport_type, description, rules, entry_fee, prize, start_date, end_date, max_teams, banner_image, is_featured, show_on_homepage, display_priority, display_start_date, display_end_date, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING *`,
      [name, sport_type, description, rules, entry_fee, prize, start_date, end_date, max_teams, banner_image, is_featured, show_on_homepage, display_priority, display_start_date, display_end_date, is_active]
    );
    await cache.delPattern('tournaments:*');
    
    if (is_active) {
      const io = req.app.get('io');
      if (io) io.emit('tournament_update', { action: 'created', data: result.rows[0] });
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Get all tournaments
router.get('/admin', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tournaments ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Update Tournament
router.put('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { name, sport_type, description, rules, entry_fee, prize, start_date, end_date, max_teams, banner_image, is_featured, show_on_homepage, display_priority, display_start_date, display_end_date, is_active } = req.body;
  try {
    const result = await pool.query(
      `UPDATE tournaments SET name=$1, sport_type=$2, description=$3, rules=$4, entry_fee=$5, prize=$6, start_date=$7, end_date=$8, max_teams=$9, banner_image=$10, is_featured=$11, show_on_homepage=$12, display_priority=$13, display_start_date=$14, display_end_date=$15, is_active=$16 
       WHERE id=$17 RETURNING *`,
      [name, sport_type, description, rules, entry_fee, prize, start_date, end_date, max_teams, banner_image, is_featured, show_on_homepage, display_priority, display_start_date, display_end_date, is_active, id]
    );
    
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    
    await cache.delPattern('tournaments:*');
    const io = req.app.get('io');
    if (io) io.emit('tournament_update', { action: 'updated', data: result.rows[0] });
    
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Delete Tournament
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM tournaments WHERE id=$1', [req.params.id]);
    await cache.delPattern('tournaments:*');
    const io = req.app.get('io');
    if (io) io.emit('tournament_update', { action: 'deleted', id: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Get specific tournament registrations
router.get('/:id/registrations', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tournament_registrations WHERE tournament_id=$1 ORDER BY created_at DESC', [req.params.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Public: Get featured tournaments (for homepage banners)
router.get('/featured', async (req, res) => {
  try {
    const cached = await cache.get('tournaments:featured');
    if (cached) return res.json(cached);

    const result = await pool.query(`
      SELECT * FROM tournaments 
      WHERE is_active = true 
      AND show_on_homepage = true 
      AND (display_start_date IS NULL OR display_start_date <= NOW())
      AND (display_end_date IS NULL OR display_end_date >= NOW())
      ORDER BY display_priority DESC, created_at DESC
    `);
    
    await cache.set('tournaments:featured', result.rows, 300); // 5 mins
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Public: Get all active tournaments
router.get('/', async (req, res) => {
  try {
    const cached = await cache.get('tournaments:active');
    if (cached) return res.json(cached);

    const result = await pool.query(`
      SELECT * FROM tournaments 
      WHERE is_active = true 
      AND end_date >= NOW()
      ORDER BY start_date ASC
    `);
    
    for (let t of result.rows) {
      const regObj = await pool.query("SELECT COUNT(*) FROM tournament_registrations WHERE tournament_id=$1 AND payment_status IN ('paid', 'completed')", [t.id]);
      t.registered_teams = parseInt(regObj.rows[0].count);
    }

    await cache.set('tournaments:active', result.rows, 60); // 1 min
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Public: Get tournament detail
router.get('/:id', async (req, res) => {
  try {
    const cached = await cache.get(`tournaments:detail:${req.params.id}`);
    if (cached) return res.json(cached);

    const result = await pool.query('SELECT * FROM tournaments WHERE id=$1 AND is_active=true', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    
    const regObj = await pool.query("SELECT COUNT(*) FROM tournament_registrations WHERE tournament_id=$1 AND payment_status IN ('paid', 'completed')", [req.params.id]);
    const detail = { ...result.rows[0], registered_teams: parseInt(regObj.rows[0].count) };

    await cache.set(`tournaments:detail:${req.params.id}`, detail, 30); // 30s
    res.json(detail);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Public: Register Team (Creates pending registration)
router.post('/:id/register', async (req, res) => {
  const { team_name, captain_name, phone } = req.body;
  try {
    // Basic validation
    if (!team_name || !captain_name || !phone) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Verify slots left
    const tournamentRes = await pool.query('SELECT max_teams, is_active FROM tournaments WHERE id=$1', [req.params.id]);
    if (tournamentRes.rows.length === 0 || !tournamentRes.rows[0].is_active) {
       return res.status(400).json({ error: 'Tournament not available' });
    }
    const max_teams = tournamentRes.rows[0].max_teams;

    const regObj = await pool.query("SELECT COUNT(*) FROM tournament_registrations WHERE tournament_id=$1 AND payment_status IN ('paid', 'completed')", [req.params.id]);
    const registered_teams = parseInt(regObj.rows[0].count);

    if (registered_teams >= max_teams) {
       return res.status(400).json({ error: 'Tournament is already full' });
    }

    // Create pending registration
    const insertRes = await pool.query(
      `INSERT INTO tournament_registrations (tournament_id, team_name, captain_name, phone, payment_status) 
       VALUES ($1, $2, $3, $4, 'pending') RETURNING id`,
      [req.params.id, team_name, captain_name, phone]
    );

    res.status(201).json({ id: insertRes.rows[0].id });
  } catch (err) {
    console.error("Registration initiation error:", err);
    res.status(500).json({ error: 'Failed to initiate registration' });
  }
});

// Admin: Delete/Cancel Registration
router.delete('/registrations/:id', authMiddleware, async (req, res) => {
  try {
    // Optionally fetch tournament_id to emit specific events if needed, but delPattern catches it
    await pool.query('DELETE FROM tournament_registrations WHERE id=$1', [req.params.id]);
    await cache.delPattern('tournaments:*');
    const io = req.app.get('io');
    if (io) io.emit('tournament_registration_success'); // re-using this event to trigger UI refresh
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete registration' });
  }
});

module.exports = router;
