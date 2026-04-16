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

-- Function to auto-generate slots for a date
CREATE OR REPLACE FUNCTION generate_daily_slots(target_date DATE, target_turf_id UUID)
RETURNS void AS $$
DECLARE
  hour_val INT;
  p_weekday DECIMAL;
  p_weekend DECIMAL;
  is_weekend BOOLEAN;
BEGIN
  SELECT weekday_price, weekend_price INTO p_weekday, p_weekend FROM turfs WHERE id = target_turf_id;
  is_weekend := EXTRACT(DOW FROM target_date) IN (0, 6);
  FOR hour_val IN 6..22 LOOP
    INSERT INTO slots (turf_id, date, start_time, end_time, price)
    VALUES (target_turf_id, target_date, make_time(hour_val, 0, 0), make_time(hour_val + 1, 0, 0), CASE WHEN is_weekend THEN p_weekend ELSE p_weekday END)
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
