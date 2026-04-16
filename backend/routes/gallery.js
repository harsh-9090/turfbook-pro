const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const cache = require('../config/cache');

// Use memory storage — upload to Cloudinary manually at request time
const upload = multer({ storage: multer.memoryStorage() });

// Helper: upload a buffer to Cloudinary
function uploadToCloudinary(fileBuffer, folder) {
  return new Promise((resolve, reject) => {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (err, result) => {
        if (err) return reject(err);
        resolve(result);
      }
    );
    stream.end(fileBuffer);
  });
}

// Public: Get all gallery images
router.get('/', async (req, res) => {
  try {
    if (!cache.shouldBypass(req)) {
      const cached = await cache.get('gallery:all');
      if (cached) return res.json(cached);
    }

    const result = await pool.query('SELECT * FROM gallery_images ORDER BY sort_order ASC, created_at DESC');
    await cache.set('gallery:all', result.rows, 600); // 10 min
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

    const uploaded = await uploadToCloudinary(req.file.buffer, 'akola-sports-arena/gallery');

    const result = await pool.query(
      `INSERT INTO gallery_images (cloudinary_url, public_id, alt_text, span_type, sort_order)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [uploaded.secure_url, uploaded.public_id, alt_text || '', span_type || 'default', Number(sort_order) || 0]
    );

    await cache.del('gallery:all');

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Admin: Delete gallery image
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });

    const imageRes = await pool.query('SELECT public_id FROM gallery_images WHERE id = $1', [req.params.id]);
    if (imageRes.rows.length === 0) return res.status(404).json({ error: 'Image not found' });

    const { public_id } = imageRes.rows[0];
    await cloudinary.uploader.destroy(public_id);
    await pool.query('DELETE FROM gallery_images WHERE id = $1', [req.params.id]);

    await cache.del('gallery:all');

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

    await cache.del('gallery:all');

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

module.exports = router;
