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

// Multer storage for Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'akola-sports-arena/gallery',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
  },
});

const upload = multer({ storage: storage });

// Public: Get all gallery images
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM gallery_images ORDER BY sort_order ASC, created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Upload new gallery image
router.post('/', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const { alt_text, span_type, sort_order } = req.body;
    if (!req.file) return res.status(400).json({ error: 'No image file uploaded' });

    const result = await pool.query(
      `INSERT INTO gallery_images (cloudinary_url, public_id, alt_text, span_type, sort_order)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.file.path, req.file.filename, alt_text || '', span_type || 'default', Number(sort_order) || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Admin: Delete gallery image
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const imageRes = await pool.query('SELECT public_id FROM gallery_images WHERE id = $1', [req.params.id]);
    if (imageRes.rows.length === 0) return res.status(404).json({ error: 'Image not found' });

    const { public_id } = imageRes.rows[0];

    // Delete from Cloudinary
    await cloudinary.uploader.destroy(public_id);

    // Delete from DB
    await pool.query('DELETE FROM gallery_images WHERE id = $1', [req.params.id]);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Admin: Update image info (span_type, sort_order)
router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    const { alt_text, span_type, sort_order } = req.body;
    const result = await pool.query(
      `UPDATE gallery_images SET 
        alt_text = COALESCE($1, alt_text), 
        span_type = COALESCE($2, span_type), 
        sort_order = COALESCE($3, sort_order)
       WHERE id = $4 RETURNING *`,
      [alt_text, span_type, sort_order != null ? Number(sort_order) : null, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Image not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

module.exports = router;
