
-- Add missing columns to inventory_batches
ALTER TABLE public.inventory_batches 
ADD COLUMN IF NOT EXISTS notes text,
ADD COLUMN IF NOT EXISTS warehouse_rejected_quantity integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS warehouse_rejected_at timestamp with time zone;

-- Add missing columns to distributions
ALTER TABLE public.distributions
ADD COLUMN IF NOT EXISTS rejected_quantity integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS rejected_at timestamp with time zone;

-- Add missing columns to products
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS price integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS description text;
