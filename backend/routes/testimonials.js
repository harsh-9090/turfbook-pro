const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'akola-sports-arena/testimonials',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
  },
});

const upload = multer({ storage: storage });

// Public: Get approved testimonials
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM testimonials WHERE status = $1 ORDER BY is_featured DESC, created_at DESC',
      ['approved']
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Get all testimonials (including pending)
router.get('/admin', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM testimonials ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Public: Submit a review with multiple images (optional)
router.post('/', upload.array('images', 5), async (req, res) => {
  try {
    const { name, role, text, rating } = req.body;
    if (!name || !text || !rating) {
      return res.status(400).json({ error: 'Name, text, and rating are required' });
    }

    const imageUrls = req.files ? req.files.map(f => f.path) : [];
    const publicIds = req.files ? req.files.map(f => f.filename) : [];

    const result = await pool.query(
      `INSERT INTO testimonials (name, role, text, rating, image_urls, public_ids, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, role || '', text, Number(rating), imageUrls, publicIds, 'pending']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Admin: Update status (approve/reject)
router.patch('/:id/status', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const result = await pool.query(
      'UPDATE testimonials SET status = $1 WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Toggle featured
router.patch('/:id/feature', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE testimonials SET is_featured = NOT is_featured WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Delete testimonial (cleanup multiple images)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const resRow = await pool.query('SELECT public_ids FROM testimonials WHERE id = $1', [req.params.id]);
    if (resRow.rows.length === 0) return res.status(404).json({ error: 'Not found' });

    const { public_ids } = resRow.rows[0];
    if (public_ids && public_ids.length > 0) {
      // Delete all images from Cloudinary
      await Promise.all(public_ids.map(id => cloudinary.uploader.destroy(id)));
    }

    await pool.query('DELETE FROM testimonials WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

module.exports = router;
