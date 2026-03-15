-- Create egg_readings table (core production data)
CREATE TABLE IF NOT EXISTS egg_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  weight_grams decimal(10,2) NOT NULL,
  egg_count integer NOT NULL DEFAULT 1,
  grade text NOT NULL,
  source text DEFAULT 'conveyor',
  batch_id text,
  notes text,
  recorded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create egg_prices table
CREATE TABLE IF NOT EXISTS egg_prices (
  grade text PRIMARY KEY,
  price_per_egg decimal(10,2) NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- Create egg_price_history table (audit trail)
CREATE TABLE IF NOT EXISTS egg_price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grade text NOT NULL,
  old_price decimal(10,2),
  new_price decimal(10,2) NOT NULL,
  changed_at timestamptz DEFAULT now()
);

-- Seed initial egg prices
INSERT INTO egg_prices (grade, price_per_egg) VALUES 
('market', 6.50),
('retail', 8.00),
('powder', 4.50)
ON CONFLICT (grade) DO NOTHING;

-- Seed some dummy readings if empty to show stock
INSERT INTO egg_readings (weight_grams, grade) VALUES 
(5000, 'market'),
(3000, 'retail'),
(2000, 'powder');

-- Enable Realtime
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE egg_prices; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE egg_price_history; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE egg_readings; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  shop_name text NOT NULL,
  owner_name text NOT NULL,
  phone text NOT NULL,
  location text NOT NULL,
  type text NOT NULL CHECK (type IN ('market', 'retail', 'company', 'individual')),
  delivery_frequency text NOT NULL,
  initial_quantity_kg decimal(10,2) NOT NULL,
  preferred_grade text NOT NULL CHECK (preferred_grade IN ('market', 'retail', 'powder')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz DEFAULT now(),
  approved_at timestamptz
);

-- Enable RLS for customers
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts for registration
CREATE POLICY "Allow anonymous inserts for customers" ON customers
  FOR INSERT WITH CHECK (true);

-- Allow public read access for customers
CREATE POLICY "Allow public read access for customers" ON customers
  FOR SELECT USING (true);

-- Allow public update access for customers (for approval workflow)
CREATE POLICY "Allow public update access for customers" ON customers
  FOR UPDATE USING (true);

-- Create shops table (referenced by orders)
CREATE TABLE IF NOT EXISTS shops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  shop_name text NOT NULL,
  owner_name text NOT NULL,
  location text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid REFERENCES shops(id),
  grade text NOT NULL,
  quantity_kg decimal(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  notes text,
  delivery_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Seed some pending customers for testing
INSERT INTO customers (email, shop_name, owner_name, phone, location, type, delivery_frequency, initial_quantity_kg, preferred_grade, status) VALUES 
('jane@blueberry.com', 'Blueberry Bakes', 'Jane Smith', '+91 98765 43210', 'Indiranagar, Bangalore', 'retail', 'Bi-weekly', 50.00, 'retail', 'pending'),
('rahul@eggcellence.com', 'Eggcellence Wholesale', 'Rahul Verma', '+91 99887 76655', 'Whitefield, Bangalore', 'market', 'Daily', 200.00, 'market', 'pending')
ON CONFLICT (email) DO NOTHING;

-- Seed some shops corresponding to customers
INSERT INTO shops (email, shop_name, owner_name, location) VALUES
('jane@blueberry.com', 'Blueberry Bakes', 'Jane Smith', 'Indiranagar, Bangalore'),
('rahul@eggcellence.com', 'Eggcellence Wholesale', 'Rahul Verma', 'Whitefield, Bangalore')
ON CONFLICT (email) DO NOTHING;

DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE shops; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE orders; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE customers; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Notifications table (if not already exists from shopkeeper portal)
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  target text NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  order_id uuid,
  shop_id uuid,
  created_at timestamptz DEFAULT now()
);

DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE notifications; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Enable Row Level Security (RLS) and create policies for IoT connectivity
ALTER TABLE egg_readings ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts from your IoT device Python script
CREATE POLICY "Allow anonymous inserts" ON egg_readings FOR INSERT WITH CHECK (true);

-- Allow public read access (for your dashboard)
CREATE POLICY "Allow public read access" ON egg_readings FOR SELECT USING (true);
