import { useState } from 'react';
import { useInventoryBatches, useInventorySummary } from '@/hooks/useInventory';
import { useDistributions } from '@/hooks/useDistributions';
import { PageLayout } from '@/components/PageLayout';
import { FileText, Download, Calendar, Coffee, Package } from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { generateDailyReport } from '@/lib/pdfReport';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function ReportsPage() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const { data: batches } = useInventoryBatches();
  const { data: summary } = useInventorySummary();
  const { data: distributions } = useDistributions(selectedDate);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateReport = async () => {
    if (!batches || !summary) return;
    
    setIsGenerating(true);
    try {
      generateDailyReport({
        date: selectedDate,
        batches: batches,
        distributions: distributions || [],
        summary: summary,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Calculate today's summary
  const todayBatches = batches?.filter(b => b.production_date === selectedDate) || [];
  const totalProduced = todayBatches.reduce((acc, b) => acc + b.initial_quantity, 0);
  const totalDistributed = distributions?.reduce((acc, d) => acc + d.quantity, 0) || 0;
  
  const totalCups = summary?.filter(s => s.category === 'product')
    .reduce((acc, s) => acc + s.total_in_inventory, 0) || 0;
  const totalAddons = summary?.filter(s => s.category === 'addon')
    .reduce((acc, s) => acc + s.total_in_inventory, 0) || 0;

  return (
    <PageLayout
      title="Laporan"
      subtitle="Buat dan unduh laporan harian"
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
      {/* Date Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Pilih Tanggal Laporan</label>
        <div className="flex gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="input-field max-w-xs"
          />
          <button
            onClick={() => setSelectedDate(format(new Date(), 'yyyy-MM-dd'))}
            className="btn-outline"
          >
            Hari Ini
          </button>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Laporan: {format(new Date(selectedDate), 'EEEE, dd MMMM yyyy', { locale: localeId })}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="stat-card bg-primary/5 border-primary/20">
          <div className="flex items-center gap-2 mb-2">
            <Coffee className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium">Total Cup</span>
          </div>
          <p className="stat-value text-primary">{totalCups}</p>
          <p className="text-xs text-muted-foreground">produk di inventori</p>
        </div>
        <div className="stat-card bg-secondary/5 border-secondary/20">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-5 h-5 text-secondary" />
            <span className="text-sm font-medium">Total Add-on</span>
          </div>
          <p className="stat-value text-secondary">{totalAddons}</p>
          <p className="text-xs text-muted-foreground">tidak dihitung cup</p>
        </div>
      </div>

      {/* Day Summary */}
      <div className="table-container mb-6">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold">Ringkasan Tanggal Terpilih</h3>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Produksi</span>
            <span className="font-medium">{totalProduced} unit dari {todayBatches.length} batch</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Distribusi</span>
            <span className="font-medium">{totalDistributed} unit ke {new Set(distributions?.map(d => d.rider_id)).size} rider</span>
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
      {todayBatches.length > 0 && (
        <div className="table-container mt-6">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold">Produksi Tanggal Ini</h3>
          </div>
          <div className="divide-y divide-border">
            {todayBatches.map((batch) => (
              <div key={batch.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{batch.product?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Exp: {format(new Date(batch.expiry_date), 'dd MMMM yyyy', { locale: localeId })}
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
      {distributions && distributions.length > 0 && (
        <div className="table-container mt-6">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold">Distribusi Tanggal Ini</h3>
          </div>
          <div className="divide-y divide-border">
            {distributions.map((dist) => (
              <div key={dist.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{dist.rider?.name}</p>
                  <p className="text-sm text-muted-foreground">{dist.batch?.product?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Batch: {format(new Date(dist.batch?.production_date || ''), 'dd/MM')} - {format(new Date(dist.batch?.expiry_date || ''), 'dd/MM')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{dist.quantity} unit</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(dist.distributed_at), 'HH:mm')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </PageLayout>
  );
}

export default ReportsPage;
