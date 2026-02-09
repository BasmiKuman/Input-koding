-- Add rejected_quantity column to distributions table
-- This tracks how many items were rejected per rider distribution

ALTER TABLE public.distributions
ADD COLUMN IF NOT EXISTS rejected_quantity INTEGER NOT NULL DEFAULT 0;

-- Add timestamp for when rejection occurred
ALTER TABLE public.distributions
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;

-- Add rejection reason in notes format
-- This allows tracking why items were rejected
-- Pattern: "rejected: {amount} - {reason}"
-- The notes column already exists and can have multiple patterns concatenated

-- Create index for better query performance on rejected items
CREATE INDEX IF NOT EXISTS idx_distributions_rejected_quantity ON public.distributions(rejected_quantity) WHERE rejected_quantity > 0;
