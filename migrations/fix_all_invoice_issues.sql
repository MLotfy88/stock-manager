-- Comprehensive Fix for Invoice Entry Issues
-- 1. Support Opening Balance Payment Method
-- 2. Support Multi-Page Invoices (Array of URLs)
-- 3. Support GTIN Intelligence (Mapping Table)

-- A. Fix Payment Method Enum
DO $$
BEGIN
    ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'opening_balance';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- B. Fix Invoice Image URLs (Convert single TEXT to TEXT[])
DO $$
BEGIN
    -- Check if column 'invoice_image_url' exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='supply_vouchers' AND column_name='invoice_image_url') THEN
        -- Rename it to plural if you want to preserve data, or just drop and add new
        -- Here we will drop and add to be clean as per previous migration logic
        ALTER TABLE supply_vouchers DROP COLUMN invoice_image_url;
    END IF;

    -- Add 'invoice_image_urls' if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='supply_vouchers' AND column_name='invoice_image_urls') THEN
        ALTER TABLE supply_vouchers ADD COLUMN invoice_image_urls TEXT[] DEFAULT '{}';
    END IF;
END $$;

-- C. Add GTIN Product Mapping Table (if not exists)
CREATE TABLE IF NOT EXISTS gtin_product_mapping (
    gtin TEXT PRIMARY KEY,
    product_definition_id UUID REFERENCES product_definitions(id) ON DELETE CASCADE,
    variant_name TEXT NOT NULL,
    last_supplier_id UUID REFERENCES suppliers(id),
    average_price DECIMAL(10, 2),
    scan_count INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- D. Add Indexes for GTIN Mapping
CREATE INDEX IF NOT EXISTS idx_gtin_mapping_product ON gtin_product_mapping(product_definition_id);

-- E. Enable RLS on GTIN Mapping
ALTER TABLE gtin_product_mapping ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'gtin_product_mapping' AND policyname = 'Enable read access for all users'
    ) THEN
        CREATE POLICY "Enable read access for all users" ON gtin_product_mapping FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'gtin_product_mapping' AND policyname = 'Enable insert for authenticated users only'
    ) THEN
        CREATE POLICY "Enable insert for authenticated users only" ON gtin_product_mapping FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'gtin_product_mapping' AND policyname = 'Enable update for authenticated users only'
    ) THEN
        CREATE POLICY "Enable update for authenticated users only" ON gtin_product_mapping FOR UPDATE USING (auth.role() = 'authenticated');
    END IF;
END $$;
