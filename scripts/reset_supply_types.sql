
-- THIS SCRIPT RESETS SUPPLY TYPES
-- RUN THIS IN SUPABASE SQL EDITOR

-- 1. Disable RLS temporarily (Optional, depends on your role, usually Admin overrides)
-- ALTER TABLE supply_types DISABLE ROW LEVEL SECURITY;

-- 2. Clear existing types (Cascades to products if foreign keys Allow)
-- WARNING: This will delete ALL products if there is a CASCADE DELETE.
DELETE FROM supply_types;

-- 3. Insert specific types needed for the CSV
INSERT INTO supply_types (name, name_en) VALUES
('Diagnostic Catheter', 'Diagnostic Catheter'),
('Guiding Catheter', 'Guiding Catheter'),
('SC Balloon', 'SC Balloon'),
('NC Balloon', 'NC Balloon'),
('CTO Balloon', 'CTO Balloon'),
('Drug-Coated Balloons', 'Drug-Coated Balloons'),
('Stents', 'Stents'),
('Guidewires', 'Guidewires'),
('Accessories', 'Accessories'),
('Other', 'Other');

-- 4. Re-enable RLS
-- ALTER TABLE supply_types ENABLE ROW LEVEL SECURITY;
