require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tournament_registrations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
          team_name VARCHAR(255) NOT NULL,
          captain_name VARCHAR(255) NOT NULL,
          phone VARCHAR(20) NOT NULL,
          payment_status VARCHAR(50) DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Table tournament_registrations created");
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
})();
