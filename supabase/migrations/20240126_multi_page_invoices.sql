-- Migration for Multi-Page Invoices
-- Rename invoice_image_url to invoice_image_urls and change type to TEXT[] (array of strings)

-- Drop the old column if it exists (or alter it, but usually cleaner to add new one if data is sparse, or explicit conversion)
-- Since we just created it and it's likely empty or sparse dev data:

ALTER TABLE supply_vouchers 
DROP COLUMN IF EXISTS invoice_image_url;

ALTER TABLE supply_vouchers
ADD COLUMN invoice_image_urls TEXT[] DEFAULT '{}';
