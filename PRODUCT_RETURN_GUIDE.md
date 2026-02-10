# 📦 Panduan Pengembalian Produk ke Gudang

## Overview

Fitur pengembalian produk memungkinkan Anda untuk menginventaris kembali produk yang tidak terjual kepada rider tanpa cacat atau kualitas yang menurun. Produk ini akan kembali masuk ke stok gudang dan bisa didistribusikan kembali ke rider lain.

---

## 🎯 Kapan Menggunakan Fitur Return?

**Gunakan fitur "Dikembalikan" jika:**
- ✅ Produk tidak terjual (tidak ada pembeli)
- ✅ Produk masih dalam kondisi baik (tidak rusak)
- ✅ Ingin kembalikan ke gudang untuk didistribusikan ulang
- ✅ Rider mau mengembalikan karena tidak ada demand di area mereka

**Jangan gunakan untuk:**
- ❌ Produk rusak/tidak layak jual → gunakan "Ditolak" 
- ❌ Produk sudah laku terjual → gunakan "Terjual"

---

## 📋 Step-by-Step Cara Return Produk

### 1️⃣ Buka Halaman Distribusi
- Klik menu **"Distribusi"** di sidebar
- Lihat daftar rider yang menerima distribusi hari ini

### 2️⃣ Pilih Rider yang Ingin Di-Close
- Klik pada rider card untuk membuka detail distribusi
- Akan menampilkan semua produk yang diterima rider hari ini

### 3️⃣ Isi Form Adjustment untuk Setiap Produk

Untuk produk yang akan dikembalikan:

| Field | Isi |
|-------|-----|
| **Aksi** | Pilih "**Dikembalikan**" |
| **Jumlah** | Berapa unit yang dikembalikan |
| **Tombol "Semua"** (opsional) | Untuk return seluruh stok yang tersisa |

### 4️⃣ Simpan Perubahan
- Setelah mengisi semua adjustment per produk
- Klik tombol **"Simpan Semua Perubahan"**
- Sistem akan memproses return

---

## ✨ Apa yang Terjadi Saat Produk Di-Return?

✅ **Di Sistem:**
- Produk quality masuk kembali ke inventory stok
- Dipetakan ke batch asalnya (dengan expiry date yang sama)
- Bisa didistribusikan kembali ke rider lain
- Tercatat di data historical untuk audit trail

✅ **Di Display:**
- Status return ditampilkan di halaman Distribusi
- Laporan akan menampilkan breakdown "Dikembalikan per produk"
- Tidak mengurangi stok gudang (returned items masuk kembali)

---

## 📊 Melihat Data Return di Laporan

### Di Halaman Laporan
1. Buka **"Laporan"** di menu
2. Pilih periode (Harian, Mingguan, Bulanan, dll)
3. Scroll ke bagian **"Ringkasan Distribusi"**
4. Lihat kolom **"🔄 Dikembalikan"** per rider

### Di PDF Report
1. Buka halaman Laporan
2. Klik **"Unduh PDF"**
3. Cari bagian **"📊 Tabel Distribusi Rider"**
4. Lihat kolom "Dikembalikan" per rider

---

## 🔄 Contoh Skenario Return

### Skenario 1: Rider Tidak Laku Hari Ini
```
Rider: Budi
- Kopi Aren: Dikirim 30 unit
  → Terjual: 25 unit
  → Dikembalikan: 5 unit ✅ (masuk stok)
  
- Matcha: Dikirim 5 unit
  → Terjual: 2 unit
  → Dikembalikan: 3 unit ✅ (masuk stok)
```

**Hasil:**
- Stok berkurang 27 unit (25 + 2 Terjual)
- Stok bertambah 8 unit dari return (5 + 3)
- Net loss hanya yang terjual: 27 unit

### Skenario 2: Rider Minta Tukar Produk
```
Rider: Imas
- Coklat: Dikirim 10 unit
  → Terjual: 3 unit
  → Dikembalikan: 7 unit ✅ (masuk stok)
  → Diganti dengan: Taro 10 unit baru
```

**Hasil:**
- Coklat return masuk stok → bisa jadi stok buffer
- Taro baru dikirim ke rider
- Sistem tetap record semua pergerakan

---

## ⚠️ Perbedaan Antara 3 Status

| Status | Keterangan | Ke Stok Gudang? | Catatan |
|--------|-----------|-----------------|---------|
| **📦 Terjual** | Produk berhasil terjual ke customer | ❌ Tidak | Uang masuk, produk hilang |
| **🔄 Dikembalikan** | Produk tidak terjual, kondisi baik | ✅ Ya! | Balik ke stok, bisa distribusi ulang |
| **❌ Ditolak** | Produk rusak/tidak layak jual | ❌ Tidak | Dihitung rugi/loss |

---

## 🎯 Best Practices

### ✅ Lakukan
- ✅ Return produk setiap hari jika ada yang tidak laku
- ✅ Cek kondisi produk sebelum accept return (pastikan not damaged)
- ✅ Catat di notes jika ada kondisi khusus (misal: tergores tapi masih ok)
- ✅ Review laporan return untuk analisa demand area

### ❌ Jangan Lakukan
- ❌ Jangan return produk yang rusak (gunakan "Ditolak")
- ❌ Jangan lupa untuk input return → stok akan kelihatan kurang
- ❌ Jangan return lebih dari jumlah yang tersisa di rider
- ❌ Jangan input return tanpa persetujuan rider

---

## 🔧 Troubleshooting

### ❓ Pertanyaan Umum

**Q: Berapa lama produk yang di-return bisa didistribusikan ulang?**  
A: Langsung bisa hari berikutnya. Produk sudah masuk stok dan tersedia untuk distribusi ke rider lain.

**Q: Bagaimana kalau produk yang di-return sudah mendekati expired date?**  
A: Sistem tetap terima return. Tapi sebaiknya prioritaskan untuk di-restock atau di-promo agar tidak expired.

**Q: Bisa return hanya sebagian aja?**  
A: Ya, bisa. Inputkan jumlah yang ingin di-return saja, sisanya akan tercatat sebagai stok yang hilang di rider (jika tidak di-action).

**Q: Data return bisa di-export?**  
A: Ya, di laporan PDF ada breakdown return per rider dan per produk.

---

## 📈 Analisis Data Return

Gunakan data return untuk:
- 📊 Analisa demand per area (dari rider mana yang banyak return = demand rendah)
- 💡 Optimasi distribusi (jangan terlalu banyak ke area yang demand rendah)
- 📋 Buffer stok (return bisa jadi stok safety buffer untuk unexpected demand)
- 🎯 Rider performance (track rata-rata return rate per rider)

---

## 📞 Butuh Bantuan?

Jika ada kendala dengan fitur return:
1. Cek panduan ini kembali
2. Lihat bagian "Troubleshooting"
3. Hubungi admin untuk bantuan lebih lanjut
