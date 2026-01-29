-- Migration: Remove UNIQUE constraint from barcode field
-- This allows multiple inventory items to have the same barcode
-- (Same product, same variant, but different units in stock)

-- Drop the unique constraint on barcode
ALTER TABLE inventory_items
DROP CONSTRAINT IF EXISTS inventory_items_barcode_key;

-- Note: After running this migration, multiple items can share the same barcode
-- This is correct for medical supplies where 5 units of the same product/variant have identical barcodes
