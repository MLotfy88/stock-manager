-- Fix UTF-8 encoding issues in product_definitions table
-- This script replaces corrupted multiplication signs with the correct UTF-8 character

-- 1. Fix variants column (JSONB array)
UPDATE product_definitions
SET variants = (
  SELECT jsonb_agg(
    jsonb_set(
      variant,
      '{name}',
      to_jsonb(
        replace(
          replace(
            variant->>'name',
            '�',  -- Replacement character
            '×'   -- Correct multiplication sign (U+00D7)
          ),
          ' ×', -- Fix spacing issues
          '×'
        )
      )
    )
  )
  FROM jsonb_array_elements(variants) AS variant
)
WHERE variants::text LIKE '%�%';

-- 2. Verify the changes
SELECT 
  id,
  name,
  variants
FROM product_definitions
WHERE name LIKE '%Synergy%'
OR name LIKE '%سينيرجي%';

-- 3. Optional: Show all affected products before running UPDATE
-- SELECT 
--   id,
--   name,
--   variants
-- FROM product_definitions
-- WHERE variants::text LIKE '%�%';
