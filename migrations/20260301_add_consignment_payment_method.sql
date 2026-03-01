-- Migration to add 'consignment' to payment_method enum
-- Date: 2026-03-01
-- Reason: Frontend supports consignment (على سبيل الأمانة) but DB enum was missing this value

ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'consignment';
