-- Add warehouse_rejected_quantity to inventory_batches table
-- This tracks per-piece rejections for damaged products in warehouse
-- Different from rider rejections tracked in distributions table

ALTER TABLE public.inventory_batches
ADD COLUMN IF NOT EXISTS warehouse_rejected_quantity INTEGER NOT NULL DEFAULT 0;

-- Add timestamp for when warehouse rejection occurred
ALTER TABLE public.inventory_batches
ADD COLUMN IF NOT EXISTS warehouse_rejected_at TIMESTAMPTZ;

-- Add warehouse rejection reason in a dedicated notes field
-- This tracks why items were rejected at warehouse level
-- Pattern can be stored in existing notes column with prefix: "WAREHOUSE_REJECTED: {amount} - {reason}"

-- Create index for better query performance on warehouse rejected items
CREATE INDEX IF NOT EXISTS idx_inventory_batches_warehouse_rejected_quantity 
ON public.inventory_batches(warehouse_rejected_quantity) 
WHERE warehouse_rejected_quantity > 0;
