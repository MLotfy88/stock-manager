-- Phase 4 Migration: Packages & Smart Barcode

-- 1. Packages Table
CREATE TABLE IF NOT EXISTS packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Package Items Table
CREATE TABLE IF NOT EXISTS package_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  package_id UUID REFERENCES packages(id) ON DELETE CASCADE,
  product_definition_id UUID REFERENCES product_definitions(id),
  variant TEXT,
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Barcode Learning (Smart Knowledge Base)
CREATE TABLE IF NOT EXISTS barcode_learning (
  barcode TEXT PRIMARY KEY,
  product_definition_id UUID REFERENCES product_definitions(id),
  variant TEXT,
  batch_defaults TEXT, -- JSON or text for default batch format if any
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Suppliers Extension
-- Check column existence before adding to avoid error if re-running
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'suppliers' AND column_name = 'return_period_days') THEN
        ALTER TABLE suppliers ADD COLUMN return_period_days INTEGER DEFAULT 30;
    END IF;
END $$;

-- 5. Enable RLS
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE barcode_learning ENABLE ROW LEVEL SECURITY;

-- 6. Basic Policies (Adjust based on strict roles later)
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON packages;
CREATE POLICY "Enable all access for authenticated users" ON packages FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON package_items;
CREATE POLICY "Enable all access for authenticated users" ON package_items FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON barcode_learning;
CREATE POLICY "Enable all access for authenticated users" ON barcode_learning FOR ALL USING (auth.role() = 'authenticated');
