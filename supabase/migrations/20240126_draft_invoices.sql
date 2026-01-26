-- Add status and draft_items to supply_vouchers
ALTER TABLE supply_vouchers 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed' CHECK (status IN ('draft', 'completed')),
ADD COLUMN IF NOT EXISTS draft_items JSONB DEFAULT '[]';

-- Update existing rows to be completed
UPDATE supply_vouchers SET status = 'completed' WHERE status IS NULL;
