# Setup Database Supabase

Berikut adalah SQL queries yang diperlukan untuk setup database di Supabase. Jalankan queries ini di SQL Editor di Supabase dashboard.

## 1. Table Products

Table ini menyimpan daftar produk yang dijual (Produk atau Add-on).

```sql
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  category VARCHAR(50) NOT NULL CHECK (category IN ('product', 'addon')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS for products table
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Create policy to allow read access
CREATE POLICY "Allow read access" ON products
  FOR SELECT USING (true);

-- Create policy to allow write access
CREATE POLICY "Allow write access" ON products
  FOR ALL USING (true) WITH CHECK (true);
```

## 2. Table Inventory Batches

Table ini menyimpan batch produksi dengan stok awal dan stok saat ini.

```sql
CREATE TABLE IF NOT EXISTS inventory_batches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  production_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  initial_quantity INTEGER NOT NULL,
  current_quantity INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE inventory_batches ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow read access" ON inventory_batches
  FOR SELECT USING (true);

CREATE POLICY "Allow write access" ON inventory_batches
  FOR ALL USING (true) WITH CHECK (true);

-- Create index for better query performance
CREATE INDEX idx_inventory_batches_product_id ON inventory_batches(product_id);
CREATE INDEX idx_inventory_batches_expiry_date ON inventory_batches(expiry_date);
```

## 3. Table Riders

Table ini menyimpan data rider untuk distribusi produk.

```sql
CREATE TABLE IF NOT EXISTS riders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE riders ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow read access" ON riders
  FOR SELECT USING (true);

CREATE POLICY "Allow write access" ON riders
  FOR ALL USING (true) WITH CHECK (true);
```

## 4. Table Distributions

Table ini menyimpan data distribusi produk ke rider beserta status penjualan, pengembalian, dan reject.

```sql
CREATE TABLE IF NOT EXISTS distributions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rider_id UUID NOT NULL REFERENCES riders(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL REFERENCES inventory_batches(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  distributed_at TIMESTAMP WITH TIME ZONE NOT NULL,
  sold_quantity INTEGER DEFAULT 0,
  returned_quantity INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE distributions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow read access" ON distributions
  FOR SELECT USING (true);

CREATE POLICY "Allow write access" ON distributions
  FOR ALL USING (true) WITH CHECK (true);

-- Create indexes
CREATE INDEX idx_distributions_rider_id ON distributions(rider_id);
CREATE INDEX idx_distributions_batch_id ON distributions(batch_id);
CREATE INDEX idx_distributions_distributed_at ON distributions(distributed_at);
```

## Catatan Penting

- **Rejected items**: Item yang ditolak (reject) akan mengurangi `quantity` di table `distributions` dan **tidak akan dikembalikan** ke `inventory_batches.current_quantity`
- **Returned items**: Item yang dikembalikan akan menambah `returned_quantity` dan **mengembalikan stok** ke `inventory_batches.current_quantity`
- **Sold items**: Item yang terjual menambah `sold_quantity` saja

## Struktur Update Stok

Ketika rider melakukan update stok:

1. **Terjual** → `distributions.sold_quantity += amount`
2. **Dikembalikan** → `distributions.returned_quantity += amount` dan `inventory_batches.current_quantity += amount`
3. **Ditolak** → `distributions.quantity -= amount` dan `distributions.notes += "rejected:X"`

## Troubleshooting: Jika Update Stok Tidak Berjalan

### 1. Periksa RLS Policy

Jika update stok tidak berjalan, kemungkinan RLS policy terlalu ketat. Jalankan query ini untuk **DISABLE RLS** (untuk development):

```sql
-- DISABLE RLS untuk semua table (HANYA untuk development!)
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_batches DISABLE ROW LEVEL SECURITY;
ALTER TABLE riders DISABLE ROW LEVEL SECURITY;
ALTER TABLE distributions DISABLE ROW LEVEL SECURITY;
```

### 2. Atau Update Policy Menjadi Lebih Permissive

```sql
-- Update distributions policy
DROP POLICY IF EXISTS "Allow read access" ON distributions;
DROP POLICY IF EXISTS "Allow write access" ON distributions;

CREATE POLICY "distributions_all_access" ON distributions
  FOR ALL
  USING (true)
  WITH CHECK (true);
```

### 3. Buka Browser DevTools

Saat klik "Simpan Semua Perubahan", buka **Console** (F12):
- Lihat `🚀 handleAdjustment started` 
- Lihat `Adjustment States:` - pastikan data ada
- Lihat error message jika ada

### 4. Test dengan curl/Postman

Test langsung ke Supabase REST API:

```bash
curl -X PATCH 'https://your-project.supabase.co/rest/v1/distributions?id=eq.DIST_ID' \
  -H 'apikey: your-anon-key' \
  -H 'Content-Type: application/json' \
  -d '{"sold_quantity": 5}'
```
