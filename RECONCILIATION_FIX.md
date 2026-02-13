# Fix untuk Issue Penyimpanan Data Distribusi

Tanggal: 13 Februari 2026

## Masalah

Ketika melakukan input massal pada halaman distribusi, terutama ketika mengedit status riders (terjual/dikembalikan/ditolak), ada item yang tidak tersimpan dengan benar:
- Input: Syrup Vanilla = 3 unit (Terjual)
- Tersimpan: Hanya 1 unit yang tercatat
- Masalah: Item yang tidak dijual/dikembalikan/ditolak tidak ter-track dengan baik, menyebabkan data loss atau mismatch

## Root Causes yang Diidentifikasi

1. **Data Stale/Cache**: Query data pada UI tidak selalu match dengan data aktual di database
2. **Validasi Tidak Ketat**: Input tidak di-validate terhadap remaining stock yang sebenarnya
3. **Visibility Issue**: User tidak bisa melihat preview dari apa yang akan disimpan sebelum submit
4. **Track Item Tertinggal**: Tidak ada fitur untuk mengidentifikasi item yang belum tercatat statusnya

## Solusi yang Diimplementasikan

### 1. Enhanced Validation & Logging
- File: `src/pages/DistributionPage.tsx`
- Menambahkan detailed logging saat adjustment processing untuk track apa yang submit
- Menambahkan safety checks sebelum mutate backend
- Improved error messages yang menunjukkan remaining vs input quantity

### 2. Reconciliation Hook (Tracking)
- File: `src/hooks/useReconciliation.ts` (BARU)
- Hook ini menghitung:
  - Total distributed vs total accounted (sold + returned + rejected)
  - Unaccounted quantity yang menunjukkan item yang belum tercatat
  - Status setiap distribution (complete, pending, mismatch)
  - Summary untuk periode tertentu

```typescript
// Contoh penggunaan:
const reconciliation = useReconciliation(riderId, dateRange);
// Returns: { status, unaccounted, accountingPercentage, etc }
```

### 3. Reconciliation Summary Widget
- File: `src/pages/DistributionPage.tsx`
- Menampilkan key metrics harian:
  - Total dikirim ke riders
  - Total terjual ✓
  - Total dikembalikan
  - Total ditolak
  - **Total belum tercatat** (dengan warning jika > 0)
- Menampilkan list top 3 item yang pending/unaccounted

Warna indicator:
- 🔵 Blue - Normal reconciliation widget
- 🟠 Orange - Alert jika ada item unaccounted

### 4. Preview Before Submit
- File: `src/pages/DistributionPage.tsx`
- Sebelum klik "Simpan Semua Perubahan":
  - User bisa lihat PREVIEW semua item yang akan disimpan
  - Menampilkan produk name + jumlah + action (Terjual/Kembali/Tolak)
  - Button SIMPAN di-disable jika tidak ada perubahan
  - Prevent user mengsubmit while validation pending

### 5. Improved State Clearing
- File: `src/pages/DistributionPage.tsx`
- Memastikan `setAdjustmentStates({})` di-clear dengan benar setelah success
- Mencegah stale state yang carry over ke adjustment berikutnya

### 6. Better Error Detail Reporting
- Menampilkan error messages yang lebih detail:
  ```
  ❌ 2 item gagal:
  Product A: Jumlah 5 melebihi stok rider saat ini. Diminta: 5, Sisa: 2 unit (input: 5, max: 2)
  Product B: Distribution not found (input: 3, max: 0)
  ```

## Cara Menggunakan Fitur Baru

### 1. Monitor Reconciliation
- Lihat widget 📊 Reconciliation di bagian atas Distribution Page
- Jika "Belum Tercatat" > 0, itu menunjukkan ada item yang perlu di-follow up
- Link items yang pending untuk quick action

### 2. Preview Sebelum Submit
1. Input status rider untuk semua produk
2. Lihat preview di bagian "📋 Preview Perubahan" sebelum klik Simpan
3. Verify sebelum submit untuk prevent data loss

### 3. Check Reconciliation Report
- Gunakan hook `useReconciliation` untuk membuat custom reports
- Query status per rider, per date range
- Identify mismatch atau over-accounting situations

## Testing Checklist

- [ ] Input 3 untuk Syrup Vanilla → Verify tersimpan = 3 (bukan 1)
- [ ] Input dengan invalid number → Should show error
- [ ] Input melebihi max remaining → Should show validation error & clamp to max
- [ ] Preview menampilkan semua item yang akan disimpan
- [ ] After success, reconciliation summary di-update with new data
- [ ] Clear state tidak leave stale data
- [ ] Multiple riders dapat di-adjust di session yang sama
- [ ] Pending view juga working dengan preview
- [ ] Reconciliation widget menunjukkan unaccounted count yang tepat

## Migration / Database Impact

Tidak ada database schema changes/mutations di fix ini.
- `useReconciliation` hanya query data yang sudah ada
- Semua calculations adalah at-runtime based on query data

## Performance Notes

- Reconciliation query hanya fetch data untuk tanggal tertentu (indexed dengan distributed_at)
- Widget update hanya ketika data berubah via React Query invalidation
- Preview rendering optimized dengan filter & slice

## Dokumentasi untuk User

Ketika user melihat widget reconciliation dengan "Belum Tercatat > 0":
1. Klik rider yang bersangkutan
2. Lihat item mana yang unaccounted
3. Update status di adjustment panel
4. Submit & verify di preview sebelum simpan
5. Monitor reconciliation widget untuk update

## Future Improvements

- [ ] Export reconciliation report to CSV/PDF
- [ ] Bulk reconciliation untuk multiple riders
- [ ] Auto-suggest most likely action berdasarkan historical data
- [ ] Anomaly detection untuk quantity mismatches
- [ ] Audit trail/changelog per distribution record
- [ ] Integration dengan payment system untuk automatic reconciliation
