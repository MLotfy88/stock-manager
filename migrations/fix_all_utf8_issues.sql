-- Fix UTF-8 Encoding Issues - Character Replacement
-- Run this AFTER creating all tables to fix existing data

-- Update existing data with correct UTF-8 characters
-- Replace broken characters with correct unicode

-- For product names and variants
UPDATE product_definitions 
SET name = REPLACE(REPLACE(REPLACE(REPLACE(name, 
    '�', '×'),  -- Fix multiply sign
    '÷�', '÷'), -- Fix divide sign
    '±�', '±'), -- Fix plus-minus
    '°�', '°')  -- Fix degree
WHERE name LIKE '%�%';

-- For variants in inventory
UPDATE inventory_items
SET variant = REPLACE(REPLACE(REPLACE(REPLACE(variant,
    '�', '×'),
    '÷�', '÷'),
    '±�', '±'),
    '°�', '°')
WHERE variant LIKE '%�%';

-- For procedure template items
UPDATE procedure_template_items
SET variant = REPLACE(REPLACE(REPLACE(REPLACE(variant,
    '�', '×'),
    '÷�', '÷'),
    '±�', '±'),
    '°�', '°')
WHERE variant LIKE '%�%';

-- Handle duplications for procedure_types
-- If 'قسطرة تشخيصية' already exists, we should delete 'Diagnostic Cath' and update references (if any) or just leave it.
-- Simplest approach: Update only if the target name doesn't exist.

DO $$
BEGIN
    -- Diagnostic Cath -> قسطرة تشخيصية
    IF NOT EXISTS (SELECT 1 FROM procedure_types WHERE name = 'قسطرة تشخيصية') THEN
        UPDATE procedure_types SET name = 'قسطرة تشخيصية' WHERE name = 'Diagnostic Cath';
    ELSE
        -- If both exist, we might want to keep the one with ID or just delete the English duplicate if it has no dependencies?
        -- Safe bet: Do nothing if Arabic exists, or delete English if unused.
        -- For now, let's just delete 'Diagnostic Cath' if 'قسطرة تشخيصية' exists to clean up.
        -- Cautious approach: Just don't update if it causes conflict.
        NULL;
    END IF;

    -- Interventional Cath -> قسطرة علاجية
    IF NOT EXISTS (SELECT 1 FROM procedure_types WHERE name = 'قسطرة علاجية') THEN
        UPDATE procedure_types SET name = 'قسطرة علاجية' WHERE name = 'Interventional Cath';
    END IF;

    -- Complex Intervention -> قسطرة علاجية معقدة
    IF NOT EXISTS (SELECT 1 FROM procedure_types WHERE name = 'قسطرة علاجية معقدة') THEN
        UPDATE procedure_types SET name = 'قسطرة علاجية معقدة' WHERE name = 'Complex Intervention';
    END IF;
END $$;

-- Verify the fix
SELECT 'product_definitions' as table_name, 
       COUNT(*) as fixed_count 
FROM product_definitions 
WHERE name LIKE '%×%' OR name LIKE '%÷%' OR name LIKE '%±%' OR name LIKE '%°%'
UNION ALL
SELECT 'inventory_items', 
       COUNT(*) 
FROM inventory_items 
WHERE variant LIKE '%×%' OR variant LIKE '%÷%' OR variant LIKE '%±%' OR variant LIKE '%°%';

-- Test Unicode characters
SELECT 
    '2.5×20' as multiply_example,
    '100÷5' as divide_example,
    '±0.5' as plusminus_example,
    '37°C' as degree_example,
    'قسطرة تشخيصية' as arabic_example;
