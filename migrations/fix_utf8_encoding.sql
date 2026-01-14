-- UTF-8 Encoding Fix for Supabase
-- Run this to ensure proper UTF-8 support

-- Verify database encoding
SHOW SERVER_ENCODING;
SHOW CLIENT_ENCODING;

-- Set client encoding to UTF-8 (if needed)
SET CLIENT_ENCODING TO 'UTF8';

-- Check collation for text columns
SELECT 
    table_name, 
    column_name, 
    character_set_name, 
    collation_name
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND data_type IN ('text', 'character varying');

-- If you need to alter existing columns to UTF-8 (usually not needed with Supabase)
-- This is just for reference:
-- ALTER TABLE product_definitions ALTER COLUMN name TYPE TEXT COLLATE "default";

-- Verify by testing special characters
SELECT '2.5×20' as test_multiply,
       '÷' as test_divide,
       '±' as test_plus_minus,
       'قسطرة' as test_arabic;

-- Expected output: all characters should display correctly
