-- CathLab Stock Manager - Supabase Schema v5
-- This script completely resets the database schema and introduces a VIEW for dynamic item status.

-- 1. DROP EXISTING OBJECTS
-- Drop functions and views first to remove dependencies
DROP FUNCTION IF EXISTS delete_consumption_record(uuid);
DROP FUNCTION IF EXISTS create_consumption_record(date, text, text, text, text, jsonb);
DROP FUNCTION IF EXISTS get_public_tables();
DROP VIEW IF EXISTS inventory_items_with_status;

-- Drop tables using CASCADE to handle dependencies
DROP TABLE IF EXISTS consumption_record_items CASCADE;
DROP TABLE IF EXISTS consumption_records CASCADE;
DROP TABLE IF EXISTS inventory_items CASCADE;
DROP TABLE IF EXISTS product_definitions CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS manufacturers CASCADE;
DROP TABLE IF EXISTS supply_types CASCADE;
DROP TABLE IF EXISTS stores CASCADE;
-- Drop legacy tables if they exist from a previous version
DROP TABLE IF EXISTS supplies CASCADE;
DROP TABLE IF EXISTS consumption_items CASCADE;

-- 2. RECREATE FUNCTIONS AND TABLES

-- Helper Function to Get Table Names
CREATE OR REPLACE FUNCTION get_public_tables()
RETURNS TABLE(table_name TEXT) AS $$
BEGIN
  RETURN QUERY 
  SELECT c.relname::text FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relkind IN ('r', 'v') AND n.nspname = 'public'; -- Include views
END;
$$ LANGUAGE plpgsql;

-- Create Tables (without status column)
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE supply_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE manufacturers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  alert_period INT DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  contact TEXT,
  phone TEXT,
  email TEXT
);

CREATE TABLE product_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type_id UUID REFERENCES supply_types(id),
  variant_label TEXT,
  variants JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_definition_id UUID NOT NULL REFERENCES product_definitions(id),
  variant TEXT NOT NULL,
  barcode TEXT UNIQUE,
  quantity INT NOT NULL CHECK (quantity >= 0),
  store_id UUID NOT NULL REFERENCES stores(id),
  manufacturer_id UUID REFERENCES manufacturers(id),
  supplier_id UUID REFERENCES suppliers(id),
  batch_number TEXT,
  expiry_date DATE NOT NULL,
  purchase_price NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE consumption_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  department TEXT,
  purpose TEXT,
  requested_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE consumption_record_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consumption_record_id UUID NOT NULL REFERENCES consumption_records(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
  quantity INT NOT NULL CHECK (quantity > 0)
);

-- 3. CREATE VIEW FOR DYNAMIC STATUS
CREATE OR REPLACE VIEW inventory_items_with_status AS
SELECT
  ii.*,
  m.alert_period,
  CASE
    WHEN ii.expiry_date <= CURRENT_DATE THEN 'expired'
    WHEN ii.expiry_date <= (CURRENT_DATE + INTERVAL '1 day' * m.alert_period) THEN 'expiring_soon'
    ELSE 'valid'
  END AS status
FROM
  inventory_items ii
JOIN
  manufacturers m ON ii.manufacturer_id = m.id;

-- 4. ROW LEVEL SECURITY (RLS)
-- Enable RLS for all tables and the view
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE supply_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE manufacturers ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE consumption_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE consumption_record_items ENABLE ROW LEVEL SECURITY;
ALTER VIEW inventory_items_with_status ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public read access" ON stores FOR SELECT USING (true);
CREATE POLICY "Public read access" ON supply_types FOR SELECT USING (true);
CREATE POLICY "Public read access" ON manufacturers FOR SELECT USING (true);
CREATE POLICY "Public read access" ON suppliers FOR SELECT USING (true);
CREATE POLICY "Public read access" ON product_definitions FOR SELECT USING (true);
CREATE POLICY "Public read access" ON inventory_items FOR SELECT USING (true);
CREATE POLICY "Public read access" ON consumption_records FOR SELECT USING (true);
CREATE POLICY "Public read access" ON consumption_record_items FOR SELECT USING (true);
CREATE POLICY "Public read access on view" ON inventory_items_with_status FOR SELECT USING (true);

CREATE POLICY "Allow all for authenticated users" ON stores FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON supply_types FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON manufacturers FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON suppliers FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON product_definitions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON inventory_items FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON consumption_records FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON consumption_record_items FOR ALL USING (auth.role() = 'authenticated');

-- 5. RPC FUNCTIONS FOR TRANSACTIONS
-- (These remain the same)
CREATE OR REPLACE FUNCTION create_consumption_record(
    p_date DATE,
    p_department TEXT,
    p_purpose TEXT,
    p_requested_by TEXT,
    p_notes TEXT,
    p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    new_record_id UUID;
    item RECORD;
    current_quantity INT;
    new_record JSONB;
BEGIN
    INSERT INTO consumption_records (date, department, purpose, requested_by, notes)
    VALUES (p_date, p_department, p_purpose, p_requested_by, p_notes)
    RETURNING id INTO new_record_id;

    FOR item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(inventory_item_id UUID, quantity INT)
    LOOP
        SELECT quantity INTO current_quantity FROM inventory_items WHERE id = item.inventory_item_id;
        
        IF current_quantity IS NULL OR current_quantity < item.quantity THEN
            RAISE EXCEPTION 'insufficient_quantity: Not enough stock for item %', item.inventory_item_id;
        END IF;

        UPDATE inventory_items
        SET quantity = quantity - item.quantity
        WHERE id = item.inventory_item_id;

        INSERT INTO consumption_record_items (consumption_record_id, inventory_item_id, quantity)
        VALUES (new_record_id, item.inventory_item_id, item.quantity);
    END LOOP;

    SELECT jsonb_build_object(
        'id', r.id,
        'date', r.date,
        'department', r.department,
        'purpose', r.purpose,
        'requested_by', r.requested_by,
        'notes', r.notes,
        'created_at', r.created_at,
        'items', (SELECT jsonb_agg(jsonb_build_object('id', i.id, 'inventory_item_id', i.inventory_item_id, 'quantity', i.quantity)) FROM consumption_record_items i WHERE i.consumption_record_id = r.id)
    ) INTO new_record
    FROM consumption_records r
    WHERE r.id = new_record_id;

    RETURN new_record;
END;
$$;

CREATE OR REPLACE FUNCTION delete_consumption_record(p_record_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    item RECORD;
BEGIN
    FOR item IN SELECT inventory_item_id, quantity FROM consumption_record_items WHERE consumption_record_id = p_record_id
    LOOP
        UPDATE inventory_items
        SET quantity = quantity + item.quantity
        WHERE id = item.inventory_item_id;
    END LOOP;

    DELETE FROM consumption_records WHERE id = p_record_id;
END;
$$;
