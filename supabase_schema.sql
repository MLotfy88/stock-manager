-- CathLab Stock Manager - Supabase Schema
-- This script is designed to set up the complete database structure.
-- To use, copy and paste this entire script into the SQL Editor in your Supabase project and run it.

-- 1. Create Stores Table
-- Stores information about different physical locations for inventory.
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create Supply Types Table
-- Categories for product definitions (e.g., Catheter, Consumable).
CREATE TABLE supply_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_en TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create Manufacturers Table
-- Stores information about product manufacturers.
CREATE TABLE manufacturers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo TEXT,
  alert_period INT DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Create Suppliers Table
-- Stores information about suppliers from whom items are purchased.
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Create Product Definitions Table
-- Defines the core products. Each product can have multiple variants.
CREATE TABLE product_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type_id UUID REFERENCES supply_types(id),
  variant_label TEXT, -- e.g., "Size", "Curve"
  variants JSONB, -- Stores an array of objects: [{ "name": "2x10", "reorderPoint": 5 }]
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Create Inventory Items Table
-- Represents actual stock items. Each row is a unique batch with a unique barcode.
CREATE TABLE inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_definition_id UUID REFERENCES product_definitions(id) ON DELETE RESTRICT,
  variant TEXT NOT NULL,
  barcode TEXT UNIQUE,
  quantity INT NOT NULL CHECK (quantity >= 0),
  store_id UUID REFERENCES stores(id) ON DELETE RESTRICT,
  manufacturer_id UUID REFERENCES manufacturers(id) ON DELETE RESTRICT,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  batch_number TEXT,
  production_date DATE,
  purchase_price NUMERIC,
  expiry_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'valid', -- e.g., 'valid', 'expiring_soon', 'expired'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Create Consumption Records Table
-- Header table for each consumption event.
CREATE TABLE consumption_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT now(),
  department TEXT,
  requested_by TEXT,
  approved_by TEXT,
  status TEXT, -- e.g., 'completed', 'pending'
  purpose TEXT, -- e.g., 'use', 'expired', 'damaged'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Create Consumption Items Table
-- Line items for each consumption record, linking to the specific inventory item consumed.
CREATE TABLE consumption_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id UUID REFERENCES consumption_records(id) ON DELETE CASCADE,
  inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE RESTRICT,
  item_name TEXT, -- Denormalized for easier reporting
  quantity INT NOT NULL CHECK (quantity > 0),
  notes TEXT
);

-- Add some comments to explain the schema
COMMENT ON COLUMN product_definitions.variants IS 'Stores an array of objects, e.g., [{ "name": "2x10", "reorderPoint": 5 }]';
COMMENT ON TABLE inventory_items IS 'Each row represents a specific batch of a product variant in a specific store.';
