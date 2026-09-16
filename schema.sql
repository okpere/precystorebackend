-- PrecyNails Supabase PostgreSQL Database Schema
-- Copy and paste this into Supabase Dashboard -> SQL Editor -> RUN

-- 1. Vendors Table
CREATE TABLE IF NOT EXISTS vendors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  handle TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

-- 2. Products Table
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  original_price NUMERIC,
  category TEXT NOT NULL,
  image TEXT NOT NULL,
  description TEXT,
  in_stock BOOLEAN DEFAULT true,
  stock_count INT DEFAULT 10,
  badge TEXT,
  shapes TEXT[],
  sizes TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- 3. Orders Table
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT NOT NULL,
  items JSONB NOT NULL,
  subtotal NUMERIC NOT NULL,
  delivery_fee NUMERIC NOT NULL,
  discount NUMERIC DEFAULT 0,
  total NUMERIC NOT NULL,
  payment_method TEXT NOT NULL,
  logistics_provider TEXT NOT NULL,
  status TEXT DEFAULT 'Confirmed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- 4. Expenses Table
CREATE TABLE IF NOT EXISTS expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  date TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Allow public read access to products
CREATE POLICY "Public Read Products" ON products FOR SELECT USING (true);
-- Allow public order creation
CREATE POLICY "Public Insert Orders" ON orders FOR INSERT WITH CHECK (true);
