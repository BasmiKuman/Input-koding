# Setup Product Reject Feature

## 📋 Deskripsi Fitur

Fitur ini memungkinkan Anda untuk melacak produk yang ditolak/rusak di dua tempat:

1. **Production Reject** - Saat produksi sudah selesai tapi produk rusak/tidak layak
2. **Rider Reject** - Saat produk rusak/ditolak setelah didistribusikan ke rider

---

## 🗄️ Database Setup

Jalankan SQL migration berikut di Supabase Dashboard:

### 1. Buka Supabase Dashboard
- Kunjungi https://app.supabase.com
- Login ke project Inventory Master

### 2. Jalankan Migration
- Pilih **SQL Editor** di sidebar kiri
- Klik **New Query**
- Copy & paste SQL berikut:

```sql
-- Add rejected_quantity column to distributions table
ALTER TABLE public.distributions
ADD COLUMN IF NOT EXISTS rejected_quantity INTEGER NOT NULL DEFAULT 0;

-- Add timestamp for when rejection occurred
ALTER TABLE public.distributions
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_distributions_rejected_quantity 
ON public.distributions(rejected_quantity) WHERE rejected_quantity > 0;
```

- Klik **Run**
- Tunggu sampai selesai (sukses/error)

---

## ✨ Cara Menggunakan

### A. Reject Saat Produksi

**Skenario:** Batch produk sudah dibuat tapi ada cacat/rusak saat quality check

1. Buka halaman **Produksi**
2. Expand produk yang ingin di-reject
3. Klik ikon **🗑️ (Trash)** di batch yang rusak
4. Isi **Alasan Reject** (misalnya: "Kemasan rusak", "Warna tidak sesuai", dll)
5. Klik **Reject Batch**

**Hasil:**
- ✅ Batch ditandai sebagai "Ditolak" (warna merah)
- ✅ Status berubah dan tidak bisa didistribusikan lagi
- ✅ Informasi disimpan dengan timestamp dan alasan

---

### B. Reject Saat Rider

**Skenario:** Produk sudah didistribusikan tapi rider melaporkan ada yang rusak/tidak layak jual

1. Buka halaman **Distribusi**
2. Expand rider yang menerima reject
3. Di setiap produk, ada 3 input:
   - **Aksi**: Pilih "Ditolak"
   - **Jumlah**: Berapa unit yang ditolak
   - **Tombol Semua**: Untuk mengisi maksimal jumlah yang tersisa
4. Klik **Simpan Semua Perubahan**

**Hasil:**
- ✅ Reject quantity tercatat per rider & produk
- ✅ Produk yang ditolak tidak dikembalikan ke inventory (hilang)
- ✅ Timestamp otomatis disimpan

---

## 📊 Melihat Laporan Reject

### Di Dashboard Laporan

1. Buka halaman **Laporan**
2. Pilih periode waktu (Harian, Mingguan, Bulanan, dll)
3. Scroll ke bawah, Anda akan melihat:

   - **Kartu "❌ Ditolak"** - Total reject di periode ini
   - **Tabel "Detail Produk yang Ditolak/Rusak"** - Breakdown per produk
   - **Tabel "Penolakan Per Rider"** - Breakdown per rider

### Export ke PDF

1. Di halaman Laporan, klik **Unduh PDF**
2. PDF akan berisi:
   - Ringkasan stok produk
   - Metrik utama (termasuk total reject)
   - Distribusi (dengan kolom Tolak)
   - **Halaman khusus untuk Reject Detail:**
     - Reject by Product
     - Reject by Rider

---

## 🔍 Data yang Dilacak

### Production Reject
```
inventory_batches.notes = "REJECTED: {alasan} at {ISO timestamp}"
Contoh: "REJECTED: Kemasan rusak at 2026-02-09T10:30:45.123Z"
```

### Rider Reject
```
distributions.rejected_quantity = {jumlah unit yang ditolak}
distributions.rejected_at = {timestamp saat reject dicatat}
```

---

## 📈 Metrics yang Tersedia

Di halaman Laporan, Anda bisa melihat:

- **Total Ditolak/Rusak (Rider)** - Total dari semua rider dalam periode
- **Detail Produk yang Ditolak/Rusak** - Berapa banyak reject per produk + berapa kali
- **Penolakan Per Rider** - Berapa banyak reject per rider + jumlah produk yang ditolak

---

## 💡 Best Practices

1. **Selalu isi alasan reject** - Untuk quality control yang lebih baik
2. **Record secepatnya** - Jangan tunda pencatatan reject agar data akurat
3. **Periksa laporan mingguan** - Monitor tren reject untuk identifikasi masalah
4. **Kategorisasi alasan** - Gunakan alasan yang konsisten (misal: selalu "Kemasan Rusak")
5. **Follow up dengan supplier** - Jika dari produksi atau dengan rider jika dari distribusi

---

## ⚠️ Catatan Penting

- **Reject di Produksi**: Jumlah akan dihitung dalam "stok ditolak" dan tidak akan didistribusikan
- **Reject di Rider**: Produk dihitung hilang/rusak dan tidak dikembalikan ke inventory
- **Tidak bisa di-undo**: Pastikan sebelum mengklik reject
- **Data tetap tersimpan**: History reject akan tetap ada untuk audit trail

---

## 🆘 Troubleshooting

### Q: Tidak melihat kolom "Ditolak" di PDF?
**A:** Pastikan sudah menjalankan migration SQL di Supabase. Refresh halaman setelah migration berhasil.

### Q: Reject tidak muncul di laporan?
**A:** 
- Pastikan sudah submit/save reject dari halaman Distribusi atau Produksi
- Cek period laporan, mungkin reject tidak masuk dalam periode yang dipilih
- Refresh halaman laporan

### Q: Ingin membatalkan reject?
**A:** Hubungi admin database. Reject bisa dihapus langsung via Supabase Dashboard dengan update query (tidak ada UI untuk delete saat ini).

---

## 🔄 Workflow Lengkap

```
PRODUKSI
   ↓
[✅ OK] → Kirim ke Inventory
   ↓
[❌ Reject] → Tandai Reject + Alasan → Archive (tidak distribusi)
   ↓
DISTRIBUTION
   ↓
[✅ Terjual] → Update sold_quantity
   ↓
[🔄 Dikembalikan] → Update returned_quantity → Kembali ke inventory
   ↓
[❌ Reject] → Update rejected_quantity + rejected_at → Archive (hilang)
   ↓
LAPORAN
   ↓
Summary % Detail Reject + PDF Export
```

---

## 📞 Support

Jika ada pertanyaan atau issue, silakan hubungi tim development.
