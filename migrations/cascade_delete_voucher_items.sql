-- Migration: Change supply_voucher_id foreign key to CASCADE delete
-- This ensures that when a supply voucher is deleted, all related inventory items are also deleted

-- Step 1: Drop the existing foreign key constraint
ALTER TABLE inventory_items
DROP CONSTRAINT IF EXISTS inventory_items_supply_voucher_id_fkey;

-- Step 2: Add the new foreign key constraint with ON DELETE CASCADE
ALTER TABLE inventory_items
ADD CONSTRAINT inventory_items_supply_voucher_id_fkey
FOREIGN KEY (supply_voucher_id)
REFERENCES supply_vouchers(id)
ON DELETE CASCADE;

-- Note: This change means that deleting a supply voucher will automatically delete all inventory items linked to it
-- Make sure this is the desired behavior before running this migration
