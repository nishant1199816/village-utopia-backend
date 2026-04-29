import pool from './db.js'

const createTables = `

-- ─────────────────────────────────────────────────
--  USERS
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(120) NOT NULL,
  email         VARCHAR(200) UNIQUE NOT NULL,
  phone         VARCHAR(20),
  password_hash TEXT NOT NULL,
  role          VARCHAR(20) DEFAULT 'guest',   -- 'guest' | 'admin'
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────
--  ROOMS
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rooms (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        VARCHAR(80) UNIQUE NOT NULL,
  name        VARCHAR(120) NOT NULL,
  type        VARCHAR(20) NOT NULL,            -- 'room' | 'cottage'
  price       INTEGER NOT NULL,               -- per night in INR
  capacity    INTEGER NOT NULL DEFAULT 2,
  size_sqft   INTEGER,
  description TEXT,
  highlights  TEXT[],
  amenities   TEXT[],
  images      TEXT[],
  badge       VARCHAR(40),
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────
--  AVAILABILITY  (one row per room per date)
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS availability (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id    UUID REFERENCES rooms(id) ON DELETE CASCADE,
  date       DATE NOT NULL,
  is_blocked BOOLEAN DEFAULT FALSE,   -- admin manually blocked
  booking_id UUID,                    -- set when booked
  UNIQUE (room_id, date)
);

-- ─────────────────────────────────────────────────
--  BOOKINGS
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_ref     VARCHAR(12) UNIQUE NOT NULL,
  user_id         UUID REFERENCES users(id),
  room_id         UUID REFERENCES rooms(id),
  checkin         DATE NOT NULL,
  checkout        DATE NOT NULL,
  nights          INTEGER GENERATED ALWAYS AS (checkout - checkin) STORED,
  guests          INTEGER NOT NULL DEFAULT 2,
  room_cost       INTEGER NOT NULL,
  addon_cost      INTEGER DEFAULT 0,
  total_amount    INTEGER NOT NULL,
  amount_paid     INTEGER DEFAULT 0,
  pay_type        VARCHAR(20) DEFAULT 'full',  -- 'full' | 'partial'
  status          VARCHAR(20) DEFAULT 'pending',
                  -- 'pending' | 'confirmed' | 'cancelled' | 'completed'
  special_request TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────
--  BOOKING ADDONS
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS booking_addons (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  addon_type VARCHAR(40) NOT NULL,   -- 'breakfast' | 'dinner' | 'pickup' | 'drop' | 'extra-bed'
  price      INTEGER NOT NULL,
  quantity   INTEGER DEFAULT 1
);

-- ─────────────────────────────────────────────────
--  PAYMENTS
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id           UUID REFERENCES bookings(id) ON DELETE CASCADE,
  razorpay_order_id    VARCHAR(80),
  razorpay_payment_id  VARCHAR(80),
  razorpay_signature   VARCHAR(200),
  amount               INTEGER NOT NULL,
  currency             VARCHAR(5) DEFAULT 'INR',
  method               VARCHAR(30),   -- 'upi' | 'card' | 'netbanking' | 'offline'
  status               VARCHAR(20) DEFAULT 'created',
                       -- 'created' | 'authorized' | 'captured' | 'failed' | 'refunded'
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────
--  REVIEWS
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id),
  user_id    UUID REFERENCES users(id),
  room_id    UUID REFERENCES rooms(id),
  rating     INTEGER CHECK (rating BETWEEN 1 AND 5),
  text       TEXT,
  is_visible BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────
--  INDEXES for common queries
-- ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_availability_room_date ON availability (room_id, date);
CREATE INDEX IF NOT EXISTS idx_bookings_user         ON bookings (user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_room         ON bookings (room_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status       ON bookings (status);
CREATE INDEX IF NOT EXISTS idx_payments_booking      ON payments (booking_id);
`

async function migrate() {
  const client = await pool.connect()
  try {
    console.log('🔄 Running migrations...')
    await client.query(createTables)
    console.log('✅ All tables created successfully.')
  } catch (err) {
    console.error('❌ Migration failed:', err.message)
  } finally {
    client.release()
    pool.end()
  }
}

migrate()
