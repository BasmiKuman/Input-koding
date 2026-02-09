# Fitur Product Reject - Dokumentasi

## Overview
Menambahkan fitur tracking untuk product reject yang terjadi di dua tempat:
1. **Production Reject** - Saat produksi sudah dilakukan tapi produk rusak
2. **Rider Reject** - Saat produk rusak/ditolak setelah didistribusikan ke rider

## Database Changes

### 1. Tambah Kolom ke distributions table
```sql
ALTER TABLE distributions
ADD COLUMN rejected_quantity INTEGER NOT NULL DEFAULT 0;

-- Optional: Add timestamp untuk tracking kapan reject terjadi
ALTER TABLE distributions
ADD COLUMN rejected_at TIMESTAMPTZ;
```

### 2. Update inventory_batches (jika belum ada)
```sql
-- Kolom notes sudah ada untuk production reject info
-- Format: REJECTED: {reason} at {timestamp}
-- Contoh: REJECTED: Rusak at 2026-01-30T10:30:45.123Z
```

## Implementation Plan

### Phase 1: Backend Updates (Database & Types)
- [x] ADD rejected_quantity to distributions table
- [ ] Update TypeScript types
- [ ] Update database migration file

### Phase 2: Frontend - Distribution Updates
- [ ] Update useAdjustRiderStock hook untuk better reject handling
- [ ] Improve reject UI di DistributionPage
- [ ] Add rejection reason tracking

### Phase 3: Reports
- [ ] Add reject summary ke ReportsPage UI
- [ ] Add reject details ke PDF report
- [ ] Show reject per rider
- [ ] Show reject per product

### Phase 4: Production Page
- [ ] Improve ProductionPage untuk track production rejects lebih baik
- [ ] Tampilkan batch yang di-reject dengan status visual

## Data Structure

### Production Reject
- Location: inventory_batches.notes
- Format: "REJECTED: {reason} at {ISO_timestamp}"
- Contoh: "REJECTED: Rusak saat produksi at 2026-01-30T10:30:45.123Z"

### Rider Reject
- Location: distributions.rejected_quantity, distributions.rejected_at
- Tracking: Per distribution record
- Info: Berapa unit yang ditolak dan kapan

## Reporting Format

### Summary Stats (akan ditambahkan ke laporan)
- Total Production Reject (per periode)
- Total Rider Reject (per periode)
- Total Reject per Product
- Total Reject per Rider

### Details
- Batch yang di-reject saat produksi dengan alasan
- Distribution dengan reject quantity per rider
- Timeline reject events
