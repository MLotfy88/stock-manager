-- CathLab Stock Manager - Supabase Schema v5
-- This script completely resets the database schema and introduces a VIEW for dynamic item status.

-- 1. DROP EXISTING OBJECTS
-- Drop functions and views first to remove dependencies
DROP FUNCTION IF EXISTS delete_consumption_record(uuid);
DROP FUNCTION IF EXISTS create_consumption_record(date, text, text, text, text, jsonb);
DROP FUNCTION IF EXISTS transfer_inventory(jsonb);
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
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  contact TEXT,
  phone TEXT,
  email TEXT,
  alert_period INT DEFAULT 30
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
  s.alert_period,
  CASE
    WHEN ii.expiry_date <= CURRENT_DATE THEN 'expired'
    WHEN ii.expiry_date <= (CURRENT_DATE + INTERVAL '1 day' * s.alert_period) THEN 'expiring_soon'
    WHEN ii.expiry_date <= (CURRENT_DATE + INTERVAL '1 day' * (s.alert_period + 30)) THEN 'needs_replacement_action'
    ELSE 'valid'
  END AS status
FROM
  inventory_items ii
JOIN
  suppliers s ON ii.supplier_id = s.id;

-- 4. ROW LEVEL SECURITY (RLS)
-- Enable RLS for all tables
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE supply_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE manufacturers ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE consumption_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE consumption_record_items ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public read access" ON stores FOR SELECT USING (true);
CREATE POLICY "Public read access" ON supply_types FOR SELECT USING (true);
CREATE POLICY "Public read access" ON manufacturers FOR SELECT USING (true);
CREATE POLICY "Public read access" ON suppliers FOR SELECT USING (true);
CREATE POLICY "Public read access" ON product_definitions FOR SELECT USING (true);
CREATE POLICY "Public read access" ON inventory_items FOR SELECT USING (true);
CREATE POLICY "Public read access" ON consumption_records FOR SELECT USING (true);
CREATE POLICY "Public read access" ON consumption_record_items FOR SELECT USING (true);

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

-- Function to transfer inventory between stores atomically
CREATE OR REPLACE FUNCTION transfer_inventory(
    items_to_transfer JSONB
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    item RECORD;
    source_item RECORD;
    destination_item_id UUID;
BEGIN
    -- Loop through each item in the transfer list
    -- The JSONB object should be an array of objects with keys: "itemId", "quantity", "fromStoreId", "toStoreId"
    FOR item IN SELECT * FROM jsonb_to_recordset(items_to_transfer) AS x(
        "itemId" UUID, 
        "quantity" INT, 
        "fromStoreId" UUID, 
        "toStoreId" UUID
    )
    LOOP
        -- 1. Get the source item and lock the row for update to prevent race conditions
        SELECT * INTO source_item FROM inventory_items WHERE id = item."itemId" FOR UPDATE;

        -- 2. Perform validations
        IF source_item IS NULL THEN
            RAISE EXCEPTION 'Source item with ID % not found.', item."itemId";
        END IF;

        IF source_item.store_id <> item."fromStoreId" THEN
            RAISE EXCEPTION 'Item % does not belong to the specified source store %.', item."itemId", item."fromStoreId";
        END IF;

        IF source_item.quantity < item."quantity" THEN
            RAISE EXCEPTION 'Insufficient quantity for item %. Available: %, Required: %', 
                source_item.id, source_item.quantity, item."quantity";
        END IF;

        -- 3. Find if a perfectly matching item (same product, variant, batch, expiry, price) exists in the destination store
        SELECT id INTO destination_item_id
        FROM inventory_items
        WHERE product_definition_id = source_item.product_definition_id
          AND variant = source_item.variant
          AND store_id = item."toStoreId"
          AND batch_number = source_item.batch_number
          AND expiry_date = source_item.expiry_date
          AND purchase_price IS NOT DISTINCT FROM source_item.purchase_price -- Handles NULL prices
        LIMIT 1;

        -- 4. Update or create item in the destination store
        IF destination_item_id IS NOT NULL THEN
            -- A matching item exists, so just increase its quantity
            UPDATE inventory_items
            SET quantity = quantity + item."quantity",
                updated_at = now()
            WHERE id = destination_item_id;
        ELSE
            -- No matching item exists, so create a new inventory item record
            -- NOTE: Setting barcode to NULL to avoid violating the UNIQUE constraint.
            -- This is a workaround for the schema design issue where 'barcode' is unique.
            INSERT INTO inventory_items (
                product_definition_id,
                variant,
                barcode, -- Set to NULL
                quantity,
                store_id,
                manufacturer_id,
                supplier_id,
                batch_number,
                expiry_date,
                purchase_price,
                notes
            )
            VALUES (
                source_item.product_definition_id,
                source_item.variant,
                NULL, -- Workaround for UNIQUE barcode constraint
                item."quantity",
                item."toStoreId",
                source_item.manufacturer_id,
                source_item.supplier_id,
                source_item.batch_number,
                source_item.expiry_date,
                source_item.purchase_price,
                'Transferred from store ' || item."fromStoreId"::text || '. Original item ID: ' || source_item.id::text
            );
        END IF;

        -- 5. Decrease the quantity from the source item
        UPDATE inventory_items
        SET quantity = quantity - item."quantity",
            updated_at = now()
        WHERE id = source_item.id;

    END LOOP;
END;
$$;
