import { useState } from 'react';
import { useProducts } from '@/hooks/useProducts';
import { useInventorySummary, useInventoryBatches, useRejectBatch } from '@/hooks/useInventory';
import { useDistributions } from '@/hooks/useDistributions';
import { PageLayout } from '@/components/PageLayout';
import { StatCard } from '@/components/StatCard';
import { Package, Factory, Truck, AlertTriangle, Coffee, Plus, X } from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

function Dashboard() {
  const { data: products } = useProducts();
  const { data: summary } = useInventorySummary();
  const { data: batches } = useInventoryBatches();
  const rejectBatch = useRejectBatch();
  const today = format(new Date(), 'yyyy-MM-dd');
  const { data: todayDistributions } = useDistributions(today);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedExpiryType, setSelectedExpiryType] = useState<'expiring' | 'expired' | null>(null);
  const [rejectionBatch, setRejectionBatch] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Calculate stats
  const totalInInventory = summary?.reduce((acc, s) => acc + s.total_in_inventory, 0) || 0;
  const totalDistributed = summary?.reduce((acc, s) => {
    const inRider = s.total_distributed - s.total_sold - s.total_returned;
    return acc + inRider;
  }, 0) || 0;
  
  const totalCups = summary?.filter(s => s.category === 'product')
    .reduce((acc, s) => acc + s.total_in_inventory, 0) || 0;

  // Batches approaching expiry (3 days)
  const expiringBatches = batches?.filter(b => {
    const daysUntil = Math.ceil(
      (new Date(b.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysUntil <= 3 && daysUntil >= 0 && b.current_quantity > 0;
  }) || [];

  // Already expired batches
  const expiredBatches = batches?.filter(b => {
    const daysUntil = Math.ceil(
      (new Date(b.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysUntil < 0 && b.current_quantity > 0;
  }) || [];

  const productCount = products?.filter(p => p.category === 'product').length || 0;

  const handleRejectBatch = async () => {
    if (!rejectionBatch) return;
    
    await rejectBatch.mutateAsync({
      id: rejectionBatch.id,
      quantity: rejectionBatch.current_quantity,
      reason: rejectionReason || 'Produk expired/rusak'
    });
    setRejectionBatch(null);
    setRejectionReason('');
  };

  return (
    <PageLayout 
      title="Dashboard" 
      subtitle={format(new Date(), 'EEEE, dd MMMM yyyy', { locale: localeId })}
      // Force redeployment
    >
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <StatCard
          icon={Package}
          label="Total Stok"
          value={totalInInventory}
          subValue="unit di gudang"
          variant="primary"
        />
        <StatCard
          icon={Truck}
          label="Di Rider"
          value={totalDistributed}
          subValue="unit didistribusikan"
          variant="success"
        />
        <StatCard
          icon={Coffee}
          label="Total Cup"
          value={totalCups}
          subValue={`dari ${productCount} produk`}
        />
        <StatCard
          icon={AlertTriangle}
          label="Mendekati Expired"
          value={expiringBatches.length}
          subValue="batch"
          variant={expiringBatches.length > 0 ? 'warning' : 'default'}
        />
      </div>

      {/* Expiring Soon Alert - 3 Days */}
      {expiringBatches.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="bg-warning/10 border border-warning/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-warning" />
              <h3 className="font-semibold text-warning">Produk Mendekati Expired (3 hari)</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {expiringBatches.slice(0, 4).map((batch) => {
                const daysUntil = Math.ceil(
                  (new Date(batch.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                );
                return (
                  <button
                    key={batch.id}
                    onClick={() => setSelectedExpiryType('expiring')}
                    className={cn(
                      'bg-background/50 rounded-lg px-3 py-2 text-left hover:bg-background transition-colors',
                      daysUntil === 0 && 'border border-danger/30'
                    )}
                  >
                    <p className="font-medium text-sm truncate">{batch.product?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Stok: {batch.current_quantity} • {daysUntil === 0 ? 'Hari ini' : `${daysUntil} hari`}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}

      {/* Already Expired Alert */}
      {expiredBatches.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="bg-danger/10 border border-danger/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-danger" />
              <h3 className="font-semibold text-danger">Produk Expired</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {expiredBatches.slice(0, 4).map((batch) => (
                <button
                  key={batch.id}
                  onClick={() => {
                    setRejectionBatch(batch);
                    setSelectedExpiryType('expired');
                  }}
                  className="bg-background/50 rounded-lg px-3 py-2 text-left hover:bg-background transition-colors border border-danger/30"
                >
                  <p className="font-medium text-sm truncate">{batch.product?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Stok: {batch.current_quantity} • {format(new Date(batch.expiry_date), 'dd/MM')}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Product Summary - Clickable */}
      <div className="table-container">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold">Ringkasan Stok per Produk</h3>
        </div>
        <div className="divide-y divide-border">
          {summary?.map((item) => {
            const inRider = item.total_distributed - item.total_sold - item.total_returned - item.total_rejected;
            return (
              <button
                key={item.product_id}
                onClick={() => setSelectedProduct(item)}
                className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors text-left"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center',
                    item.category === 'product' 
                      ? 'bg-primary/10 text-primary' 
                      : 'bg-secondary/10 text-secondary'
                  )}>
                    <Package className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{item.product_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.category === 'product' ? 'Produk' : 'Add-on'} • {item.batches.length} batch
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{item.total_in_inventory + inRider}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.total_in_inventory} gudang • {inRider} rider
                  </p>
                </div>
              </button>
            );
          })}
          {(!summary || summary.length === 0) && (
            <div className="p-8 text-center text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Belum ada data inventori</p>
              <p className="text-sm">Mulai dengan menambahkan produk dan produksi</p>
            </div>
          )}
        </div>
      </div>

      {/* Product Detail Modal */}
      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedProduct?.product_name}</DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Di Gudang</p>
                  <p className="text-2xl font-bold">{selectedProduct.total_in_inventory}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Di Rider</p>
                  <p className="text-2xl font-bold">
                    {selectedProduct.total_distributed - selectedProduct.total_sold - selectedProduct.total_returned}
                  </p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Terjual</p>
                  <p className="text-2xl font-bold">{selectedProduct.total_sold}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Dikembalikan</p>
                  <p className="text-2xl font-bold">{selectedProduct.total_returned}</p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Detail Batch ({selectedProduct.batches.length})</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {selectedProduct.batches.map((batch: any) => {
                    const daysUntil = Math.ceil(
                      (new Date(batch.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                    );
                    let statusClass = 'badge-success';
                    if (daysUntil < 0) statusClass = 'badge-danger';
                    else if (daysUntil <= 3) statusClass = 'badge-warning';

                    return (
                      <div key={batch.id} className="p-2 bg-muted/50 rounded-lg text-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">
                            {format(new Date(batch.production_date), 'dd/MM/yy')}
                          </span>
                          <span className={batch.notes && batch.notes.includes('REJECTED') ? 'badge-danger' : statusClass}>
                            {batch.notes && batch.notes.includes('REJECTED') ? 'Dimusnahkan' : (daysUntil < 0 ? 'Expired' : `${daysUntil} hari`)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Awal: {batch.initial_quantity} • Sisa: {batch.current_quantity}
                        </p>
                        {batch.notes && batch.notes.includes('REJECTED') && (
                          <p className="text-xs text-danger mt-1">{batch.notes}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Rejection Modal */}
      <Dialog open={!!rejectionBatch} onOpenChange={() => setRejectionBatch(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Musnahkan Produk</DialogTitle>
          </DialogHeader>
          {rejectionBatch && (
            <div className="space-y-4 mt-4">
              <div className="p-4 bg-danger/10 border border-danger/20 rounded-lg">
                <p className="font-semibold">{rejectionBatch.product?.name}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Stok: {rejectionBatch.current_quantity} unit
                </p>
                <p className="text-sm text-muted-foreground">
                  Expired: {format(new Date(rejectionBatch.expiry_date), 'dd/MM/yyyy')}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Catatan (opsional)</label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Alasan pemusnahan..."
                  className="input-field resize-none h-20"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleRejectBatch}
                  disabled={rejectBatch.isPending}
                  className="flex-1 btn-danger"
                >
                  {rejectBatch.isPending ? 'Memproses...' : 'Musnahkan'}
                </button>
                <button
                  onClick={() => setRejectionBatch(null)}
                  className="flex-1 btn-outline"
                >
                  Batal
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Today's Activity */}
      {todayDistributions && todayDistributions.length > 0 && (
        <div className="table-container mt-6">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold">Aktivitas Hari Ini</h3>
          </div>
          <div className="divide-y divide-border">
            {todayDistributions.slice(0, 5).map((dist) => (
              <div key={dist.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-success/10 text-success flex items-center justify-center">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium">{dist.rider?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {dist.batch?.product?.name} • {dist.quantity} unit
                    </p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(dist.distributed_at), 'HH:mm')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </PageLayout>
  );
}

export default Dashboard;
