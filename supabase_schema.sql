-- CathLab Stock Manager - Supabase Schema v4
-- This script completely resets the database schema.
-- It drops all existing tables and functions, then rebuilds them from scratch.

-- 1. DROP EXISTING OBJECTS
-- Drop functions first to remove dependencies
DROP FUNCTION IF EXISTS delete_consumption_record(uuid);
DROP FUNCTION IF EXISTS create_consumption_record(date, text, text, text, text, jsonb);
DROP FUNCTION IF EXISTS get_public_tables();

-- Drop tables in reverse order of creation to handle foreign keys
DROP TABLE IF EXISTS consumption_record_items;
DROP TABLE IF EXISTS consumption_records;
DROP TABLE IF EXISTS inventory_items;
DROP TABLE IF EXISTS product_definitions;
DROP TABLE IF EXISTS suppliers;
DROP TABLE IF EXISTS manufacturers;
DROP TABLE IF EXISTS supply_types;
DROP TABLE IF EXISTS stores;
-- Drop legacy tables if they exist from a previous version
DROP TABLE IF EXISTS supplies;
DROP TABLE IF EXISTS consumption_items;

-- 2. RECREATE FUNCTIONS AND TABLES

-- Helper Function to Get Table Names
CREATE OR REPLACE FUNCTION get_public_tables()
RETURNS TABLE(table_name TEXT) AS $$
BEGIN
  RETURN QUERY 
  SELECT c.relname::text FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relkind = 'r' AND n.nspname = 'public';
END;
$$ LANGUAGE plpgsql;

-- Create Tables
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
  variants JSONB, -- e.g., [{"name": "2x10", "reorder_point": 5}]
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

-- 3. ROW LEVEL SECURITY (RLS)
-- Enable RLS for all tables
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE supply_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE manufacturers ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE consumption_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE consumption_record_items ENABLE ROW LEVEL SECURITY;

-- Create policies to allow public read access
CREATE POLICY "Public read access" ON stores FOR SELECT USING (true);
CREATE POLICY "Public read access" ON supply_types FOR SELECT USING (true);
CREATE POLICY "Public read access" ON manufacturers FOR SELECT USING (true);
CREATE POLICY "Public read access" ON suppliers FOR SELECT USING (true);
CREATE POLICY "Public read access" ON product_definitions FOR SELECT USING (true);
CREATE POLICY "Public read access" ON inventory_items FOR SELECT USING (true);
CREATE POLICY "Public read access" ON consumption_records FOR SELECT USING (true);
CREATE POLICY "Public read access" ON consumption_record_items FOR SELECT USING (true);

-- Create policies to allow authenticated users to perform all actions
CREATE POLICY "Allow all for authenticated users" ON stores FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON supply_types FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON manufacturers FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON suppliers FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON product_definitions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON inventory_items FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON consumption_records FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON consumption_record_items FOR ALL USING (auth.role() = 'authenticated');


-- 4. RPC FUNCTIONS FOR TRANSACTIONS

-- Function to create a consumption record and update inventory atomically
CREATE OR REPLACE FUNCTION create_consumption_record(
    p_date DATE,
    p_department TEXT,
    p_purpose TEXT,
    p_requested_by TEXT,
    p_notes TEXT,
    p_items JSONB -- e.g., '[{"inventory_item_id": "uuid", "quantity": 1}]'
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
    -- Insert the main consumption record
    INSERT INTO consumption_records (date, department, purpose, requested_by, notes)
    VALUES (p_date, p_department, p_purpose, p_requested_by, p_notes)
    RETURNING id INTO new_record_id;

    -- Loop through items and update inventory
    FOR item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(inventory_item_id UUID, quantity INT)
    LOOP
        -- Check current inventory
        SELECT quantity INTO current_quantity FROM inventory_items WHERE id = item.inventory_item_id;
        
        IF current_quantity IS NULL OR current_quantity < item.quantity THEN
            RAISE EXCEPTION 'insufficient_quantity: Not enough stock for item %', item.inventory_item_id;
        END IF;

        -- Update inventory
        UPDATE inventory_items
        SET quantity = quantity - item.quantity
        WHERE id = item.inventory_item_id;

        -- Insert into consumption_record_items
        INSERT INTO consumption_record_items (consumption_record_id, inventory_item_id, quantity)
        VALUES (new_record_id, item.inventory_item_id, item.quantity);
    END LOOP;

    -- Return the newly created record with its items
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

-- Function to delete a consumption record and restore inventory atomically
CREATE OR REPLACE FUNCTION delete_consumption_record(p_record_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    item RECORD;
BEGIN
    -- Find all items in the record to be deleted
    FOR item IN SELECT inventory_item_id, quantity FROM consumption_record_items WHERE consumption_record_id = p_record_id
    LOOP
        -- Restore the quantity to the inventory
        UPDATE inventory_items
        SET quantity = quantity + item.quantity
        WHERE id = item.inventory_item_id;
    END LOOP;

    -- Delete the consumption record (items will be deleted by CASCADE)
    DELETE FROM consumption_records WHERE id = p_record_id;
END;
$$;
