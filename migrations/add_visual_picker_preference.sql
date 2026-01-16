-- Add visual_picker_preference to product_definitions
ALTER TABLE product_definitions 
ADD COLUMN visual_picker_preference TEXT CHECK (visual_picker_preference IN ('matrix', 'curve', 'list', 'auto'));

-- Default to 'auto' for existing records
UPDATE product_definitions SET visual_picker_preference = 'auto';
