-- ============================================
-- TURFZONE DATABASE SCHEMA
-- PostgreSQL (compatible with Neon DB)
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(20) NOT NULL,
  password_hash VARCHAR(255),
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Turfs table
CREATE TABLE turfs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  facility_type VARCHAR(50) DEFAULT 'cricket',
  location TEXT,
  description TEXT,
  image_url TEXT,
  weekday_price DECIMAL(10,2) DEFAULT 800.00,
  weekend_price DECIMAL(10,2) DEFAULT 1200.00,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Slots table
CREATE TABLE slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  turf_id UUID REFERENCES turfs(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT true,
  price DECIMAL(10, 2) NOT NULL DEFAULT 800.00,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (turf_id, date, start_time)
);

-- Bookings table
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  slot_id UUID REFERENCES slots(id) ON DELETE CASCADE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Payments table
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  method VARCHAR(50) DEFAULT 'online',
  razorpay_order_id VARCHAR(255),
  razorpay_payment_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Slot Templates table (Weekly Schedule)
CREATE TABLE slot_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  turf_id UUID REFERENCES turfs(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  UNIQUE(turf_id, day_of_week, start_time)
);

-- Indexes for performance
CREATE INDEX idx_slots_date ON slots(date);
CREATE INDEX idx_slots_turf_date ON slots(turf_id, date);
CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_bookings_slot ON bookings(slot_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_payments_booking ON payments(booking_id);

-- Seed: Default turf
INSERT INTO turfs (name, facility_type, location, description) VALUES
('TurfZone Arena', 'cricket', '123 Sports Complex, Green Park, Mumbai 400001', 'Premium 5-a-side synthetic turf with LED floodlights');

-- Seed: Admin user (password: admin123)
INSERT INTO users (name, email, phone, password_hash, role) VALUES
('System Admin', 'admin@akolasportsarena.com', '9999999999', '$2a$10$XQZ/v4Kj/m/9EbxXfJb9O.B4i/7F5fN3gP/tZ/Jm7d5T6lGv2y7yO', 'admin');

-- Function to auto-generate slots for a date based ENTIRELY on slot_templates
CREATE OR REPLACE FUNCTION generate_daily_slots(target_date DATE, target_turf_id UUID)
RETURNS void AS $$
DECLARE
  tmpl RECORD;
  t_count INT;
  table_idx INT;
  target_dow INT;
BEGIN
  -- Get active table count
  SELECT COALESCE(table_count, 1) INTO t_count 
  FROM turfs WHERE id = target_turf_id;

  target_dow := EXTRACT(DOW FROM target_date);

  -- Loop through every slot template defined for this day of the week
  FOR tmpl IN 
    SELECT start_time, end_time, price 
    FROM slot_templates 
    WHERE turf_id = target_turf_id AND day_of_week = target_dow
  LOOP
    -- Loop through tables (if any)
    FOR table_idx IN 1..t_count LOOP
      INSERT INTO slots (turf_id, date, start_time, end_time, price, table_number)
      VALUES (target_turf_id, target_date, tmpl.start_time, tmpl.end_time, tmpl.price, table_idx)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
