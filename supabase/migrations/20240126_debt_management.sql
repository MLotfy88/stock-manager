-- Migration for Debt Management System

-- 1. Create enum types for payment method and status
CREATE TYPE payment_method AS ENUM ('cash', 'deferred', 'installments', 'check');
CREATE TYPE payment_status AS ENUM ('paid', 'pending', 'partially_paid', 'overdue');

-- 2. Add new columns to supply_vouchers
ALTER TABLE supply_vouchers 
ADD COLUMN payment_method payment_method DEFAULT 'cash',
ADD COLUMN payment_status payment_status DEFAULT 'paid',
ADD COLUMN total_amount DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN paid_amount DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN invoice_image_url TEXT;

-- 3. Create voucher_installments table
CREATE TABLE voucher_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id UUID REFERENCES supply_vouchers(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  due_date DATE NOT NULL,
  status payment_status DEFAULT 'pending',
  payment_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable RLS (Row Level Security) for new table
ALTER TABLE voucher_installments ENABLE ROW LEVEL SECURITY;

-- 5. Add policy for authenticated users (adjust based on your actual auth policies)
CREATE POLICY "Enable all for authenticated/anon users" ON voucher_installments
FOR ALL USING (true) WITH CHECK (true);
