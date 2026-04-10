-- Setup for Supabase Digital Ordering System: MANOLO FOODTRUCK PARK
-- MIGRACIÓN MANUAL (CORRER EN SQL EDITOR DE SUPABASE):
-- ALTER TABLE orders ADD COLUMN notes TEXT;

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Products Table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  cost NUMERIC DEFAULT 0,
  stock INTEGER DEFAULT 0,
  category TEXT,
  station TEXT, -- 'COMIDA RÁPIDA', 'BAR', 'DULCES/POSTRES'
  image_url TEXT,
  available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Orders Table
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_number SERIAL,
  customer_name TEXT,
  source TEXT DEFAULT 'client', -- 'seller', 'client'
  origin_station TEXT,
  status TEXT NOT NULL DEFAULT 'received', -- 'received', 'preparing', 'ready', 'delivered', 'cancelled'
  total_price NUMERIC NOT NULL,
  total_cost NUMERIC DEFAULT 0,
  is_paid BOOLEAN DEFAULT false,
  notes TEXT, -- New: Special instructions or comments
  station_statuses JSONB DEFAULT '{}'::jsonb, -- { "STATION": "status" }
  payment_details JSONB DEFAULT '{}'::jsonb, -- { "STATION": { "method": "...", "received": 0 } }
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Order Items Table
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  quantity INTEGER NOT NULL,
  price_at_time NUMERIC NOT NULL,
  cost_at_time NUMERIC DEFAULT 0,
  station TEXT -- The station responsible for this item
);

-- 5. Users Table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'vendedor', -- 'admin', 'vendedor'
  station TEXT, -- 'BAR', 'COMIDA RÁPIDA', 'DULCES/POSTRES', 'CAJA'
  pin TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Shifts Table (Cierres de Caja)
CREATE TABLE shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  station TEXT NOT NULL,
  expected_sales NUMERIC DEFAULT 0,
  expected_cash NUMERIC DEFAULT 0, -- New: Expected cash after expenses
  payment_breakdown JSONB DEFAULT '{}'::jsonb,
  actual_cash NUMERIC DEFAULT 0,
  difference NUMERIC DEFAULT 0,
  note TEXT, -- New: Closure notes
  authorized_by TEXT, -- New: Admin who authorized discrepancy
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE products;
ALTER PUBLICATION supabase_realtime ADD TABLE users;

