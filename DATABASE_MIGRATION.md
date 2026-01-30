# Database Migration - Add Notes Column

## Problem
Fitur pemusnahan (rejection) memerlukan kolom `notes` di tabel `inventory_batches`, tetapi kolom ini belum ada di database.

## Solution
Jalankan SQL berikut di Supabase SQL Editor:

### 1. Add Notes Column to inventory_batches table
```sql
ALTER TABLE inventory_batches
ADD COLUMN notes TEXT;
```

## Steps di Supabase Dashboard:
1. Buka https://app.supabase.com
2. Login ke project Inventory Master
3. Pilih **SQL Editor** di sidebar kiri
4. Klik **New Query**
5. Copy & paste SQL di atas
6. Klik **Run**
7. Tunggu sampai selesai (sukses/error)

## Verification
Setelah migration, kolom `notes` akan tersedia dan fitur berikut akan bekerja:
- ✅ Pemusnahan (rejection) produk
- ✅ Menyimpan alasan rejection dengan timestamp
- ✅ Menampilkan status "Dimusnahkan" di dashboard
- ✅ Filter expired/rejected batches di auto-distribution

## Notes
- Kolom ini optional (bisa NULL)
- Formatnya: `REJECTED: {reason} at {ISO timestamp}`
- Contoh: `REJECTED: Rusak at 2026-01-30T10:30:45.123Z`
