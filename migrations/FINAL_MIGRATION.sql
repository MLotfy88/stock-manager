-- FINAL: Combined Migration Script - Run this ONCE
-- Date: 2026-01-14
-- All features in one file for easy deployment

-- ============================================================
-- FEATURE 1: PROCEDURE TEMPLATES SYSTEM
-- ============================================================

-- Create procedure types table
CREATE TABLE IF NOT EXISTS procedure_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create procedure templates table
CREATE TABLE IF NOT EXISTS procedure_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  procedure_type_id UUID NOT NULL REFERENCES procedure_types(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create procedure template items table
CREATE TABLE IF NOT EXISTS procedure_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES procedure_templates(id) ON DELETE CASCADE,
  product_definition_id UUID NOT NULL REFERENCES product_definitions(id),
  variant TEXT NOT NULL,
  default_quantity INTEGER DEFAULT 1 CHECK (default_quantity > 0),
  notes TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_procedure_templates_type ON procedure_templates(procedure_type_id);
CREATE INDEX IF NOT EXISTS idx_procedure_template_items_template ON procedure_template_items(template_id);
CREATE INDEX IF NOT EXISTS idx_procedure_template_items_product ON procedure_template_items(product_definition_id);

-- Insert default procedure types (using English to avoid encoding issues)
INSERT INTO procedure_types (name, description) VALUES
  ('Diagnostic Cath', 'Diagnostic Catheterization'),
  ('Interventional Cath', 'Therapeutic/Interventional Catheterization'),
  ('Complex Intervention', 'Complex Interventional Procedures')
ON CONFLICT (name) DO NOTHING;

-- Trigger for procedure_templates
CREATE OR REPLACE FUNCTION update_procedure_template_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_procedure_template_updated_at ON procedure_templates;
CREATE TRIGGER trigger_update_procedure_template_updated_at
  BEFORE UPDATE ON procedure_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_procedure_template_updated_at();


-- ============================================================
-- FEATURE 2: LOCATION MANAGEMENT
-- ============================================================

ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS location TEXT;
COMMENT ON COLUMN inventory_items.location IS 'Physical location (format: "SHELF-LEVEL-POSITION" e.g., "A-3-2")';


-- ============================================================
-- FEATURE 3: MIN-MAX STOCK LEVELS
-- ============================================================

ALTER TABLE product_definitions 
ADD COLUMN IF NOT EXISTS min_stock INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_stock INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS optimal_stock INTEGER DEFAULT NULL;

COMMENT ON COLUMN product_definitions.min_stock IS 'Minimum stock level - urgent reorder below this';
COMMENT ON COLUMN product_definitions.max_stock IS 'Maximum stock level - avoid ordering above this';
COMMENT ON COLUMN product_definitions.optimal_stock IS 'Optimal stock level for smooth operations';


-- ============================================================
-- FEATURE 4: SUPPLIER PERFORMANCE TRACKING
-- ============================================================

CREATE TABLE IF NOT EXISTS supplier_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  total_orders INTEGER DEFAULT 0,
  on_time_deliveries INTEGER DEFAULT 0,
  quality_issues INTEGER DEFAULT 0,
  avg_delivery_days NUMERIC,
  quality_rating NUMERIC CHECK (quality_rating >= 1 AND quality_rating <= 5),
  delivery_rating NUMERIC CHECK (delivery_rating >= 1 AND delivery_rating <= 5),
  price_rating NUMERIC CHECK (price_rating >= 1 AND price_rating <= 5),
  last_updated TIMESTAMPTZ DEFAULT now(),
  UNIQUE(supplier_id)
);

CREATE TABLE IF NOT EXISTS supplier_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  issue_type TEXT NOT NULL CHECK (issue_type IN ('late_delivery', 'quality', 'wrong_items', 'damaged', 'other')),
  description TEXT,
  severity INTEGER CHECK (severity >= 1 AND severity <= 5),
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supplier_issues_supplier ON supplier_issues(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_issues_resolved ON supplier_issues(resolved);


-- ============================================================
-- FEATURE 5: PRICE HISTORY & TRENDS
-- ============================================================

CREATE TABLE IF NOT EXISTS price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_definition_id UUID NOT NULL REFERENCES product_definitions(id) ON DELETE CASCADE,
  variant TEXT,
  price NUMERIC NOT NULL CHECK (price >= 0),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  supply_voucher_id UUID REFERENCES supply_vouchers(id) ON DELETE SET NULL,
  invoice_date DATE,
  quantity_purchased INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_price_history_product ON price_history(product_definition_id);
CREATE INDEX IF NOT EXISTS idx_price_history_date ON price_history(invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_price_history_supplier ON price_history(supplier_id);


-- ============================================================
-- FEATURE 6: RETURNS & DEFECTS MANAGEMENT
-- ============================================================

CREATE TABLE IF NOT EXISTS product_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE SET NULL,
  product_definition_id UUID NOT NULL REFERENCES product_definitions(id),
  variant TEXT NOT NULL,
  return_type TEXT NOT NULL CHECK (return_type IN ('defective', 'expired', 'damaged', 'wrong_item', 'other')),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  reason TEXT NOT NULL,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'replaced', 'refunded', 'rejected')),
  photos TEXT[],
  replacement_item_id UUID REFERENCES inventory_items(id) ON DELETE SET NULL,
  refund_amount NUMERIC,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_returns_status ON product_returns(status);
CREATE INDEX IF NOT EXISTS idx_product_returns_supplier ON product_returns(supplier_id);
CREATE INDEX IF NOT EXISTS idx_product_returns_date ON product_returns(created_at DESC);

-- Trigger for product_returns
CREATE OR REPLACE FUNCTION update_product_returns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_product_returns_updated_at ON product_returns;
CREATE TRIGGER trigger_update_product_returns_updated_at
  BEFORE UPDATE ON product_returns
  FOR EACH ROW
  EXECUTE FUNCTION update_product_returns_updated_at();


-- ============================================================
-- VIEWS & HELPER FUNCTIONS
-- ============================================================

-- Supplier performance summary view
CREATE OR REPLACE VIEW supplier_performance_summary AS
SELECT
  s.id,
  s.name,
  sp.total_orders,
  sp.on_time_deliveries,
  sp.quality_issues,
  sp.avg_delivery_days,
  sp.quality_rating,
  sp.delivery_rating,
  sp.price_rating,
  ROUND((COALESCE(sp.quality_rating, 0) + COALESCE(sp.delivery_rating, 0) + COALESCE(sp.price_rating, 0)) / 3, 2) as overall_rating,
  COUNT(DISTINCT si.id) FILTER (WHERE NOT si.resolved) as open_issues,
  sp.last_updated
FROM suppliers s
LEFT JOIN supplier_performance sp ON s.id = sp.supplier_id
LEFT JOIN supplier_issues si ON s.id = si.supplier_id
GROUP BY s.id, s.name, sp.total_orders, sp.on_time_deliveries, sp.quality_issues, 
         sp.avg_delivery_days, sp.quality_rating, sp.delivery_rating, sp.price_rating, sp.last_updated;


-- ============================================================
-- VERIFICATION
-- ============================================================

-- Check all new tables created
SELECT 'procedure_types' as table_name, COUNT(*) as row_count FROM procedure_types
UNION ALL
SELECT 'procedure_templates', COUNT(*) FROM procedure_templates
UNION ALL
SELECT 'procedure_template_items', COUNT(*) FROM procedure_template_items
UNION ALL
SELECT 'supplier_performance', COUNT(*) FROM supplier_performance
UNION ALL
SELECT 'supplier_issues', COUNT(*) FROM supplier_issues
UNION ALL
SELECT 'price_history', COUNT(*) FROM price_history
UNION ALL
SELECT 'product_returns', COUNT(*) FROM product_returns;

-- Migration completed successfully!
-- Next steps:
-- 1. Verify tables in list above
-- 2. Check columns added to existing tables
-- 3. Test application features
