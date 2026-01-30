-- Create enum for product categories
CREATE TYPE product_category AS ENUM ('product', 'addon');

-- Create products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category product_category NOT NULL DEFAULT 'product',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create inventory_batches table
CREATE TABLE public.inventory_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  production_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  initial_quantity INTEGER NOT NULL DEFAULT 0,
  current_quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create riders table
CREATE TABLE public.riders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create distributions table
CREATE TABLE public.distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id UUID REFERENCES public.riders(id) ON DELETE CASCADE NOT NULL,
  batch_id UUID REFERENCES public.inventory_batches(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  distributed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sold_quantity INTEGER NOT NULL DEFAULT 0,
  returned_quantity INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Disable RLS for now (public access for inventory management)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.riders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distributions ENABLE ROW LEVEL SECURITY;

-- Create public access policies (no auth required for this inventory app)
CREATE POLICY "Allow public read access on products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on products" ON public.products FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on products" ON public.products FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on products" ON public.products FOR DELETE USING (true);

CREATE POLICY "Allow public read access on inventory_batches" ON public.inventory_batches FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on inventory_batches" ON public.inventory_batches FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on inventory_batches" ON public.inventory_batches FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on inventory_batches" ON public.inventory_batches FOR DELETE USING (true);

CREATE POLICY "Allow public read access on riders" ON public.riders FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on riders" ON public.riders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on riders" ON public.riders FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on riders" ON public.riders FOR DELETE USING (true);

CREATE POLICY "Allow public read access on distributions" ON public.distributions FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on distributions" ON public.distributions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on distributions" ON public.distributions FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on distributions" ON public.distributions FOR DELETE USING (true);

-- Create indexes for better performance
CREATE INDEX idx_inventory_batches_product_id ON public.inventory_batches(product_id);
CREATE INDEX idx_inventory_batches_expiry_date ON public.inventory_batches(expiry_date);
CREATE INDEX idx_distributions_rider_id ON public.distributions(rider_id);
CREATE INDEX idx_distributions_batch_id ON public.distributions(batch_id);
CREATE INDEX idx_distributions_distributed_at ON public.distributions(distributed_at);