-- CathLab Stock Manager - Supabase Schema v8 (Idempotent)
-- This script is safe to run multiple times. It checks for existence before creating objects.

-- Helper Function to Get Table Names (Always replace)
CREATE OR REPLACE FUNCTION get_public_tables()
RETURNS TABLE(table_name TEXT) AS $$
BEGIN
  RETURN QUERY 
  SELECT c.relname::text FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relkind IN ('r', 'v') AND n.nspname = 'public'; -- Include views
END;
$$ LANGUAGE plpgsql;

-- Create Tables IF THEY DON'T EXIST
CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS supply_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE IF NOT EXISTS manufacturers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  contact TEXT,
  phone TEXT,
  email TEXT,
  alert_period INT DEFAULT 30
);

CREATE TABLE IF NOT EXISTS product_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type_id UUID REFERENCES supply_types(id),
  variant_label TEXT,
  variants JSONB,
  reorder_point INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS supply_vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_number TEXT UNIQUE,
  supplier_id UUID REFERENCES suppliers(id),
  date DATE NOT NULL,
  stock_type TEXT NOT NULL DEFAULT 'purchased' CHECK (stock_type IN ('purchased', 'on_shelf')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_definition_id UUID NOT NULL REFERENCES product_definitions(id),
  supply_voucher_id UUID REFERENCES supply_vouchers(id) ON DELETE SET NULL,
  variant TEXT NOT NULL,
  barcode TEXT UNIQUE,
  quantity INT NOT NULL CHECK (quantity >= 0),
  initial_quantity INT NOT NULL CHECK (initial_quantity >= 0),
  store_id UUID NOT NULL REFERENCES stores(id),
  manufacturer_id UUID REFERENCES manufacturers(id),
  supplier_id UUID REFERENCES suppliers(id),
  batch_number TEXT,
  expiry_date DATE NOT NULL,
  purchase_price NUMERIC,
  stock_type TEXT NOT NULL DEFAULT 'purchased' CHECK (stock_type IN ('purchased', 'on_shelf')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS consumption_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  department TEXT,
  purpose TEXT,
  requested_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS consumption_record_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consumption_record_id UUID NOT NULL REFERENCES consumption_records(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
  quantity INT NOT NULL CHECK (quantity > 0),
  is_invoiced BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'user'
);


-- VIEWS (Always replace)
CREATE OR REPLACE VIEW inventory_items_with_status AS
SELECT
    ii.id, ii.barcode, ii.batch_number, ii.expiry_date, ii.quantity, ii.purchase_price, ii.variant,
    ii.product_definition_id, ii.store_id, ii.manufacturer_id, ii.supplier_id, ii.stock_type, ii.initial_quantity, ii.created_at,
    st.name AS store_name,
    pd.name AS product_name, pd.reorder_point,
    sty.name AS supply_type_name,
    m.name AS manufacturer_name,
    s.name AS supplier_name, s.alert_period,
    CASE
        WHEN ii.quantity <= pd.reorder_point THEN 'low_stock'
        WHEN ii.expiry_date <= CURRENT_DATE THEN 'expired'
        WHEN ii.expiry_date <= (CURRENT_DATE + INTERVAL '1 day' * s.alert_period) THEN 'expiring_soon'
        ELSE 'valid'
    END AS status
FROM inventory_items ii
LEFT JOIN stores st ON ii.store_id = st.id
LEFT JOIN product_definitions pd ON ii.product_definition_id = pd.id
LEFT JOIN supply_types sty ON pd.type_id = sty.id
LEFT JOIN manufacturers m ON ii.manufacturer_id = m.id
LEFT JOIN suppliers s ON ii.supplier_id = s.id;

CREATE OR REPLACE VIEW on_shelf_item_status AS
SELECT
    ii.id as inventory_item_id,
    pd.name as product_name,
    ii.variant,
    ii.batch_number,
    s.name as supplier_name,
    ii.initial_quantity,
    (ii.initial_quantity - ii.quantity) as consumed_quantity,
    ii.quantity as remaining_quantity,
    CASE
        WHEN (ii.initial_quantity - ii.quantity) = 0 THEN 'not_consumed'
        WHEN COALESCE(cri.invoiced_quantity, 0) = 0 THEN 'consumed_not_invoiced'
        WHEN cri.invoiced_quantity < (ii.initial_quantity - ii.quantity) THEN 'partially_invoiced'
        ELSE 'fully_invoiced'
    END as invoicing_status
FROM inventory_items ii
JOIN product_definitions pd ON ii.product_definition_id = pd.id
JOIN suppliers s ON ii.supplier_id = s.id
LEFT JOIN (
    SELECT
        inventory_item_id,
        SUM(CASE WHEN is_invoiced THEN quantity ELSE 0 END) as invoiced_quantity
    FROM consumption_record_items
    GROUP BY inventory_item_id
) cri ON ii.id = cri.inventory_item_id
WHERE ii.stock_type = 'on_shelf';

CREATE OR REPLACE VIEW on_shelf_invoice_items AS
SELECT
    cri.id as consumption_item_id,
    cr.date as consumption_date,
    cr.department,
    pd.name as product_name,
    ii.variant,
    ii.batch_number,
    s.name as supplier_name,
    cri.quantity as consumed_quantity,
    ii.purchase_price,
    (cri.quantity * ii.purchase_price) as total_cost,
    ii.id as inventory_item_id,
    s.id as supplier_id
FROM consumption_record_items cri
JOIN consumption_records cr ON cri.consumption_record_id = cr.id
JOIN inventory_items ii ON cri.inventory_item_id = ii.id
JOIN product_definitions pd ON ii.product_definition_id = pd.id
JOIN suppliers s ON ii.supplier_id = s.id
WHERE ii.stock_type = 'on_shelf' AND cri.is_invoiced = false;


-- ROW LEVEL SECURITY (Apply policies if not already applied)
-- Note: Supabase does not have a simple "CREATE POLICY IF NOT EXISTS". 
-- We will assume policies are managed from the dashboard after initial setup.
-- The following lines are for initial setup. Re-running them might cause errors if policies exist.
-- It's safer to manage RLS policies in the Supabase UI after the first run.
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE supply_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE manufacturers ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE supply_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE consumption_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE consumption_record_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;


-- RPC FUNCTIONS (Always replace to ensure they are up-to-date)
CREATE OR REPLACE FUNCTION create_consumption_record(
    p_date DATE, p_department TEXT, p_purpose TEXT, p_requested_by TEXT, p_notes TEXT, p_items JSONB
)
RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE
    new_record_id UUID; item RECORD; current_quantity INT; new_record JSONB;
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
        UPDATE inventory_items SET quantity = quantity - item.quantity WHERE id = item.inventory_item_id;
        INSERT INTO consumption_record_items (consumption_record_id, inventory_item_id, quantity)
        VALUES (new_record_id, item.inventory_item_id, item.quantity);
    END LOOP;
    SELECT jsonb_build_object(
        'id', r.id, 'date', r.date, 'department', r.department, 'purpose', r.purpose, 'requested_by', r.requested_by,
        'notes', r.notes, 'created_at', r.created_at,
        'items', (SELECT jsonb_agg(jsonb_build_object('id', i.id, 'inventory_item_id', i.inventory_item_id, 'quantity', i.quantity)) FROM consumption_record_items i WHERE i.consumption_record_id = r.id)
    ) INTO new_record
    FROM consumption_records r WHERE r.id = new_record_id;
    RETURN new_record;
END;
$$;

CREATE OR REPLACE FUNCTION delete_consumption_record(p_record_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
    item RECORD;
BEGIN
    FOR item IN SELECT inventory_item_id, quantity FROM consumption_record_items WHERE consumption_record_id = p_record_id
    LOOP
        UPDATE inventory_items SET quantity = quantity + item.quantity WHERE id = item.inventory_item_id;
    END LOOP;
    DELETE FROM consumption_records WHERE id = p_record_id;
END;
$$;

CREATE OR REPLACE FUNCTION transfer_inventory(items_to_transfer JSONB)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
    item RECORD; source_item RECORD; destination_item_id UUID;
BEGIN
    FOR item IN SELECT * FROM jsonb_to_recordset(items_to_transfer) AS x(
        "itemId" UUID, "quantity" INT, "fromStoreId" UUID, "toStoreId" UUID
    )
    LOOP
        SELECT * INTO source_item FROM inventory_items WHERE id = item."itemId" FOR UPDATE;
        IF source_item IS NULL THEN RAISE EXCEPTION 'Source item with ID % not found.', item."itemId"; END IF;
        IF source_item.store_id <> item."fromStoreId" THEN RAISE EXCEPTION 'Item % does not belong to the specified source store %.', item."itemId", item."fromStoreId"; END IF;
        IF source_item.quantity < item."quantity" THEN RAISE EXCEPTION 'Insufficient quantity for item %. Available: %, Required: %', source_item.id, source_item.quantity, item."quantity"; END IF;
        
        SELECT id INTO destination_item_id
        FROM inventory_items
        WHERE product_definition_id = source_item.product_definition_id
          AND variant = source_item.variant AND store_id = item."toStoreId" AND batch_number = source_item.batch_number
          AND expiry_date = source_item.expiry_date AND purchase_price IS NOT DISTINCT FROM source_item.purchase_price
        LIMIT 1;

        IF destination_item_id IS NOT NULL THEN
            UPDATE inventory_items SET quantity = quantity + item."quantity", updated_at = now() WHERE id = destination_item_id;
        ELSE
            INSERT INTO inventory_items (
                product_definition_id, variant, barcode, quantity, store_id, manufacturer_id, supplier_id,
                batch_number, expiry_date, purchase_price, notes, stock_type, initial_quantity
            ) VALUES (
                source_item.product_definition_id, source_item.variant, NULL, item."quantity", item."toStoreId", -- Set barcode to NULL for the new entry
                source_item.manufacturer_id, source_item.supplier_id, source_item.batch_number, source_item.expiry_date,
                source_item.purchase_price, 'Transferred from store ' || item."fromStoreId"::text || '. Original item ID: ' || source_item.id::text,
                source_item.stock_type, item."quantity" -- Set initial quantity for the new batch
            );
        END IF;
        
        UPDATE inventory_items SET quantity = quantity - item."quantity", updated_at = now() WHERE id = source_item.id;
    END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION create_on_shelf_invoice(p_consumption_item_ids UUID[])
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    UPDATE consumption_record_items
    SET is_invoiced = TRUE
    WHERE id = ANY(p_consumption_item_ids);
END;
$$;

-- USER PROFILES & ROLES (Safe to re-run)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
    CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS TRIGGER AS $function$
    BEGIN
      INSERT INTO public.profiles (id, role)
      VALUES (new.id, 'user'); -- Default role is 'user'
      RETURN new;
    END;
    $function$ LANGUAGE plpgsql SECURITY DEFINER;

    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
  END IF;
END;
$$;
