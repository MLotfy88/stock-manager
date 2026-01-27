-- Migration to add 'opening_balance' to payment_method enum
-- This is required to support the 'Opening Balance' payment method in the Add Supply page.

ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'opening_balance';
