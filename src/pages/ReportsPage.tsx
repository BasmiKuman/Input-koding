import { useState } from 'react';
import { useInventoryBatches, useInventorySummary } from '@/hooks/useInventory';
import { useDistributions } from '@/hooks/useDistributions';
import { PageLayout } from '@/components/PageLayout';
import { FileText, Download, Calendar, Coffee, Package } from 'lucide-react';
import { format, startOfWeek, startOfMonth, startOfYear, endOfWeek, endOfMonth, endOfYear, addDays } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { generateDailyReport } from '@/lib/pdfReport';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type FilterType = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'range';

function ReportsPage() {
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  
  const [filterType, setFilterType] = useState<FilterType>('daily');
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [rangeStart, setRangeStart] = useState(format(addDays(today, -7), 'yyyy-MM-dd'));
  const [rangeEnd, setRangeEnd] = useState(todayStr);
  
  const { data: batches } = useInventoryBatches();
  const { data: summary } = useInventorySummary();
  const { data: distributions } = useDistributions(selectedDate);
  const [isGenerating, setIsGenerating] = useState(false);

  // Determine date range based on filter type
  const getDateRange = () => {
    const baseDate = new Date(selectedDate);
    
    switch (filterType) {
      case 'daily':
        return { start: selectedDate, end: selectedDate };
      case 'weekly': {
        const weekStart = startOfWeek(baseDate, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(baseDate, { weekStartsOn: 1 });
        return { 
          start: format(weekStart, 'yyyy-MM-dd'), 
          end: format(weekEnd, 'yyyy-MM-dd') 
        };
      }
      case 'monthly': {
        const monthStart = startOfMonth(baseDate);
        const monthEnd = endOfMonth(baseDate);
        return { 
          start: format(monthStart, 'yyyy-MM-dd'), 
          end: format(monthEnd, 'yyyy-MM-dd') 
        };
      }
      case 'yearly': {
        const yearStart = startOfYear(baseDate);
        const yearEnd = endOfYear(baseDate);
        return { 
          start: format(yearStart, 'yyyy-MM-dd'), 
          end: format(yearEnd, 'yyyy-MM-dd') 
        };
      }
      case 'range':
        return { start: rangeStart, end: rangeEnd };
      default:
        return { start: selectedDate, end: selectedDate };
    }
  };

  const dateRange = getDateRange();

  // Filter data based on date range
  const filteredBatches = batches?.filter(b => {
    const bDate = b.production_date;
    return bDate >= dateRange.start && bDate <= dateRange.end;
  }) || [];

  const filteredDistributions = distributions?.filter(d => {
    const dDate = d.distributed_at?.split('T')[0];
    return dDate && dDate >= dateRange.start && dDate <= dateRange.end;
  }) || [];

  // Calculate summary stats
  const calculateStats = (batchesData: typeof batches, distData: typeof distributions) => {
    let totalProduced = 0;
    let totalDistributed = 0;
    let totalSold = 0;
    let totalReturned = 0;
    let totalRejected = 0;

    batchesData?.forEach(b => {
      totalProduced += b.initial_quantity;
    });

    distData?.forEach(d => {
      totalDistributed += d.quantity;
      totalSold += d.sold_quantity || 0;
      totalReturned += d.returned_quantity || 0;
      totalRejected += d.rejected_quantity || 0;
    });

    return { totalProduced, totalDistributed, totalSold, totalReturned, totalRejected };
  };

  const stats = calculateStats(filteredBatches, filteredDistributions);

  const todayBatches = filteredBatches || [];
  const totalCups = summary?.filter(s => s.category === 'product')
    .reduce((acc, s) => acc + s.total_in_inventory, 0) || 0;
  const totalAddons = summary?.filter(s => s.category === 'addon')
    .reduce((acc, s) => acc + s.total_in_inventory, 0) || 0;

  const handleGenerateReport = async () => {
    if (!batches || !summary) return;
    
    setIsGenerating(true);
    try {
      generateDailyReport({
        date: selectedDate,
        batches: filteredBatches,
        distributions: filteredDistributions,
        summary: summary,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Format display date range
  const getDisplayDateRange = () => {
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    
    if (filterType === 'daily') {
      return format(start, 'EEEE, dd MMMM yyyy', { locale: localeId });
    } else if (filterType === 'weekly') {
      return `${format(start, 'dd MMM')} - ${format(end, 'dd MMMM yyyy', { locale: localeId })}`;
    } else if (filterType === 'monthly') {
      return format(start, 'MMMM yyyy', { locale: localeId });
    } else if (filterType === 'yearly') {
      return format(start, 'yyyy');
    }
    return `${format(start, 'dd/MM/yyyy')} - ${format(end, 'dd/MM/yyyy')}`;
  };

  return (
    <PageLayout
      title="Laporan"
      subtitle="Buat dan unduh laporan inventori"
      action={
        <Button
          onClick={handleGenerateReport}
          disabled={isGenerating || !batches}
          className="flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">
            {isGenerating ? 'Membuat...' : 'Unduh PDF'}
          </span>
        </Button>
      }
    >
      {/* Filter Type Selection */}
      <div className="mb-6 p-4 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-lg border border-primary/20">
        <label className="block text-sm font-semibold mb-3 text-foreground">📅 Tipe Laporan</label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {[
            { id: 'daily', label: '📆 Harian' },
            { id: 'weekly', label: '📊 Mingguan' },
            { id: 'monthly', label: '📈 Bulanan' },
            { id: 'yearly', label: '📉 Tahunan' },
            { id: 'range', label: '📍 Custom' },
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setFilterType(id as FilterType)}
              className={cn(
                'py-2 px-3 rounded-lg text-sm font-medium transition-all border',
                filterType === id
                  ? 'bg-primary text-primary-foreground border-primary shadow-md'
                  : 'bg-background border-border hover:border-primary/50 hover:bg-primary/5'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Date Selection */}
      <div className="mb-6 p-4 bg-card border border-border rounded-lg">
        {filterType === 'range' ? (
          <div className="space-y-3">
            <label className="block text-sm font-semibold">Pilih Rentang Tanggal</label>
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <input
                type="date"
                value={rangeStart}
                onChange={(e) => setRangeStart(e.target.value)}
                className="input-field flex-1"
              />
              <span className="text-muted-foreground">sampai</span>
              <input
                type="date"
                value={rangeEnd}
                onChange={(e) => setRangeEnd(e.target.value)}
                className="input-field flex-1"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <label className="block text-sm font-semibold">Pilih Tanggal Referensi</label>
            <div className="flex gap-3 items-center">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="input-field flex-1 max-w-xs"
              />
              <button
                onClick={() => setSelectedDate(todayStr)}
                className="btn-outline text-sm"
              >
                Hari Ini
              </button>
            </div>
          </div>
        )}
        
        <div className="mt-3 p-2 bg-primary/5 rounded border border-primary/20">
          <p className="text-sm text-foreground">
            <Calendar className="w-4 h-4 inline mr-2" />
            <strong>Periode:</strong> {getDisplayDateRange()}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <div className="stat-card bg-primary/5 border-primary/20">
          <div className="flex items-center gap-2 mb-2">
            <Coffee className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium">Total Cup</span>
          </div>
          <p className="stat-value text-primary">{totalCups}</p>
          <p className="text-xs text-muted-foreground">stok saat ini</p>
        </div>
        <div className="stat-card bg-secondary/5 border-secondary/20">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-5 h-5 text-secondary" />
            <span className="text-sm font-medium">Total Add-on</span>
          </div>
          <p className="stat-value text-secondary">{totalAddons}</p>
          <p className="text-xs text-muted-foreground">stok saat ini</p>
        </div>
        <div className="stat-card bg-green-500/5 border-green-500/20">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium">📦 Diproduksi</span>
          </div>
          <p className="stat-value text-green-600">{stats.totalProduced}</p>
          <p className="text-xs text-muted-foreground">periode ini</p>
        </div>
        <div className="stat-card bg-blue-500/5 border-blue-500/20">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium">📈 Terjual</span>
          </div>
          <p className="stat-value text-blue-600">{stats.totalSold}</p>
          <p className="text-xs text-muted-foreground">periode ini</p>
        </div>
        <div className="stat-card bg-red-500/5 border-red-500/20">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium">❌ Ditolak</span>
          </div>
          <p className="stat-value text-red-600">{stats.totalRejected}</p>
          <p className="text-xs text-muted-foreground">periode ini</p>
        </div>
      </div>

      {/* Period Summary */}
      <div className="table-container mb-6">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold">📊 Ringkasan Periode</h3>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-border/50">
            <span className="text-muted-foreground">Total Diproduksi</span>
            <span className="font-semibold text-lg">{stats.totalProduced} unit</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-border/50">
            <span className="text-muted-foreground">Total Didistribusi</span>
            <span className="font-semibold text-lg">{stats.totalDistributed} unit</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-border/50">
            <span className="text-muted-foreground">Total Terjual</span>
            <span className="font-semibold text-lg text-green-600">{stats.totalSold} unit</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-border/50">
            <span className="text-muted-foreground">Total Dikembalikan</span>
            <span className="font-semibold text-lg text-orange-600">{stats.totalReturned} unit</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-muted-foreground">Total Ditolak/Rusak (Rider)</span>
            <span className="font-semibold text-lg text-red-600">{stats.totalRejected} unit</span>
          </div>
        </div>
      </div>

      {/* Product Summary */}
      <div className="table-container">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold">Detail per Produk</h3>
        </div>
        <div className="divide-y divide-border">
          {summary?.map((item) => {
            const inRider = item.total_distributed - item.total_sold - item.total_returned;
            const total = item.total_in_inventory + inRider;
            
            return (
              <div key={item.product_id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{item.product_name}</span>
                    <span className={cn(
                      'px-2 py-0.5 rounded-full text-xs font-medium',
                      item.category === 'product' 
                        ? 'bg-primary/10 text-primary' 
                        : 'bg-secondary/10 text-secondary'
                    )}>
                      {item.category === 'product' ? 'Cup' : 'Add-on'}
                    </span>
                  </div>
                  <span className="font-semibold">{total}</span>
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>Di Gudang: {item.total_in_inventory}</span>
                  <span>Di Rider: {inRider}</span>
                  <span>Terjual: {item.total_sold}</span>
                </div>
              </div>
            );
          })}
          {(!summary || summary.length === 0) && (
            <div className="p-8 text-center text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Belum ada data untuk laporan</p>
            </div>
          )}
        </div>
      </div>

      {/* Production Batches for Selected Date */}
      {filteredBatches.length > 0 && (
        <div className="table-container mt-6">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold">🏭 Produksi Periode Ini</h3>
          </div>
          <div className="divide-y divide-border">
            {filteredBatches.map((batch) => (
              <div key={batch.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{batch.product?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Produksi: {format(new Date(batch.production_date), 'dd MMMM', { locale: localeId })} • Exp: {format(new Date(batch.expiry_date), 'dd MMMM yyyy', { locale: localeId })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{batch.initial_quantity}</p>
                  <p className="text-xs text-muted-foreground">Sisa: {batch.current_quantity}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Distributions for Selected Date */}
      {filteredDistributions && filteredDistributions.length > 0 && (
        <div className="table-container mt-6">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold">🚚 Distribusi Periode Ini</h3>
          </div>
          <div className="divide-y divide-border">
            {filteredDistributions.map((dist) => (
              <div key={dist.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{dist.rider?.name}</p>
                  <p className="text-sm text-muted-foreground">{dist.batch?.product?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Batch: {format(new Date(dist.batch?.production_date || ''), 'dd/MM')} - Exp: {format(new Date(dist.batch?.expiry_date || ''), 'dd/MM')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{dist.quantity} unit</p>
                  <p className="text-xs text-muted-foreground">
                    Terjual: {dist.sold_quantity || 0} • Retur: {dist.returned_quantity || 0} • Tolak: {dist.rejected_quantity || 0}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reject Summary by Product */}
      {filteredDistributions && filteredDistributions.some(d => d.rejected_quantity > 0) && (
        <div className="table-container mt-6">
          <div className="p-4 border-b border-border bg-red-500/5">
            <h3 className="font-semibold">❌ Detail Produk yang Ditolak/Rusak</h3>
          </div>
          <div className="divide-y divide-border">
            {(() => {
              const rejectMap = new Map<string, { product: string, quantity: number, count: number }>();
              filteredDistributions.forEach(dist => {
                if (dist.rejected_quantity > 0) {
                  const key = dist.batch?.product?.name || 'Unknown';
                  const existing = rejectMap.get(key) || { product: key, quantity: 0, count: 0 };
                  existing.quantity += dist.rejected_quantity;
                  existing.count += 1;
                  rejectMap.set(key, existing);
                }
              });
              return Array.from(rejectMap.values()).map((item) => (
                <div key={item.product} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{item.product}</p>
                    <p className="text-xs text-muted-foreground">{item.count} kalinya ditolak</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-red-600">{item.quantity} unit</p>
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      )}

      {/* Reject Summary by Rider */}
      {filteredDistributions && filteredDistributions.some(d => d.rejected_quantity > 0) && (
        <div className="table-container mt-6">
          <div className="p-4 border-b border-border bg-red-500/5">
            <h3 className="font-semibold">👤 Penolakan Per Rider</h3>
          </div>
          <div className="divide-y divide-border">
            {(() => {
              const riderRejectMap = new Map<string, { rider: string, quantity: number, count: number }>();
              filteredDistributions.forEach(dist => {
                if (dist.rejected_quantity > 0) {
                  const rider = dist.rider?.name || 'Unknown';
                  const existing = riderRejectMap.get(rider) || { rider, quantity: 0, count: 0 };
                  existing.quantity += dist.rejected_quantity;
                  existing.count += 1;
                  riderRejectMap.set(rider, existing);
                }
              });
              return Array.from(riderRejectMap.values()).map((item) => (
                <div key={item.rider} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{item.rider}</p>
                    <p className="text-xs text-muted-foreground">{item.count} produk ditolak</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-red-600">{item.quantity} unit</p>
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      )}
    </PageLayout>
  );
}

export default ReportsPage;
