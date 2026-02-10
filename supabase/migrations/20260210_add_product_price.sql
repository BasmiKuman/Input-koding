-- Add price column to products table
-- This allows tracking product pricing for revenue calculations

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS price INTEGER NOT NULL DEFAULT 0;

-- Add notes/description column for additional info
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS description TEXT;

-- Update existing records to have a default price of 0
-- Admin will need to update prices via UI
UPDATE public.products SET price = 0 WHERE price IS NULL;

-- Create index for better query performance if filtering by price
CREATE INDEX IF NOT EXISTS idx_products_price ON public.products(price);
