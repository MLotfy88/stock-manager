-- Migration: Add Procedure Templates System
-- Date: 2026-01-14
-- Description: Creates tables for procedure-based consumption templates

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

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_procedure_templates_type ON procedure_templates(procedure_type_id);
CREATE INDEX IF NOT EXISTS idx_procedure_template_items_template ON procedure_template_items(template_id);
CREATE INDEX IF NOT EXISTS idx_procedure_template_items_product ON procedure_template_items(product_definition_id);

-- Add comments
COMMENT ON TABLE procedure_types IS 'Types of medical procedures (e.g., Diagnostic Cath, Therapeutic Cath)';
COMMENT ON TABLE procedure_templates IS 'Predefined templates for procedures with common supplies';
COMMENT ON TABLE procedure_template_items IS 'Items included in each procedure template';

-- Insert common procedure types
INSERT INTO procedure_types (name, description) VALUES
  ('قسطرة تشخيصية', 'Diagnostic Catheterization'),
  ('قسطرة علاجية', 'Therapeutic/Interventional Catheterization'),
  ('قسطرة علاجية معقدة', 'Complex Interventional Procedures')
ON CONFLICT (name) DO NOTHING;

-- Function to auto-update timestamp
CREATE OR REPLACE FUNCTION update_procedure_template_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update timestamp
DROP TRIGGER IF EXISTS trigger_update_procedure_template_updated_at ON procedure_templates;
CREATE TRIGGER trigger_update_procedure_template_updated_at
  BEFORE UPDATE ON procedure_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_procedure_template_updated_at();
