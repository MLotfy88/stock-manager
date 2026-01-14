-- Combined Migration: All Remaining Features
-- Date: 2026-01-14
-- Description: Creates tables for all remaining features

-- Feature 4: Shelf/Location Management
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS location TEXT;
COMMENT ON COLUMN inventory_items.location IS 'Physical location (format: "R-L-P" e.g., "A-3-2" for Shelf A, Level 3, Position 2)';

-- Feature 5: Min-Max Stock Levels
ALTER TABLE product_definitions 
ADD COLUMN IF NOT EXISTS min_stock INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_stock INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS optimal_stock INTEGER DEFAULT NULL;

COMMENT ON COLUMN product_definitions.min_stock IS 'Minimum stock level - urgent reorder below this';
COMMENT ON COLUMN product_definitions.max_stock IS 'Maximum stock level - do not order above this';
COMMENT ON COLUMN product_definitions.optimal_stock IS 'Optimal stock level for smooth operations';

-- Feature 6: Supplier Performance Tracking
CREATE TABLE IF NOT EXISTS supplier_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  
  -- Metrics
  total_orders INTEGER DEFAULT 0,
  on_time_deliveries INTEGER DEFAULT 0,
  quality_issues INTEGER DEFAULT 0,
  avg_delivery_days NUMERIC,
  
  -- Ratings (1-5)
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

-- Feature 7: Price History & Trends
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

-- Feature 8 (Excluded per user): QR Code for Everything - No DB changes needed

-- Feature 9: Return/Defect Management
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
  photos TEXT[], -- Array of photo URLs/paths
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

-- Comments
COMMENT ON TABLE supplier_performance IS 'Tracks supplier performance metrics and ratings';
COMMENT ON TABLE supplier_issues IS 'Records issues with suppliers for tracking and analysis';
COMMENT ON TABLE price_history IS 'Historical price data for products to track trends and unusual prices';
COMMENT ON TABLE product_returns IS 'Manages product returns, defects, and replacements';

-- Trigger for product_returns updated_at
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

-- Create view for supplier performance summary
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
