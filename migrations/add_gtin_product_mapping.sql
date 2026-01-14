-- Migration: Add GTIN Product Mapping Table
-- Date: 2026-01-14
-- Description: Creates table to map GTIN codes to products and variants for auto-detection

-- Create the mapping table
CREATE TABLE IF NOT EXISTS gtin_product_mapping (
  gtin TEXT PRIMARY KEY,
  product_definition_id UUID NOT NULL REFERENCES product_definitions(id) ON DELETE CASCADE,
  variant_name TEXT NOT NULL,
  
  -- Additional useful data
  last_supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  average_price NUMERIC(10, 2),
  last_scanned_at TIMESTAMPTZ DEFAULT now(),
  scan_count INTEGER DEFAULT 1,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Ensure uniqueness
  CONSTRAINT unique_gtin_mapping UNIQUE (gtin)
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_gtin_mapping_gtin ON gtin_product_mapping(gtin);
CREATE INDEX IF NOT EXISTS idx_gtin_mapping_product ON gtin_product_mapping(product_definition_id);
CREATE INDEX IF NOT EXISTS idx_gtin_mapping_last_scanned ON gtin_product_mapping(last_scanned_at DESC);

-- Add comments
COMMENT ON TABLE gtin_product_mapping IS 'Maps GTIN codes from GS1-128 barcodes to products and variants for automatic detection';
COMMENT ON COLUMN gtin_product_mapping.gtin IS 'Global Trade Item Number from AI (01) in GS1-128 barcode';
COMMENT ON COLUMN gtin_product_mapping.product_definition_id IS 'Reference to the product definition';
COMMENT ON COLUMN gtin_product_mapping.variant_name IS 'Specific variant name (e.g., L4, R3.5)';
COMMENT ON COLUMN gtin_product_mapping.scan_count IS 'Number of times this GTIN has been scanned (for analytics)';
COMMENT ON COLUMN gtin_product_mapping.average_price IS 'Running average price for price suggestions';

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_gtin_mapping_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update timestamp
DROP TRIGGER IF EXISTS trigger_update_gtin_mapping_updated_at ON gtin_product_mapping;
CREATE TRIGGER trigger_update_gtin_mapping_updated_at
  BEFORE UPDATE ON gtin_product_mapping
  FOR EACH ROW
  EXECUTE FUNCTION update_gtin_mapping_updated_at();
