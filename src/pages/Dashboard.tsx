import { useState } from 'react';
import { useProducts } from '@/hooks/useProducts';
import { useInventorySummary, useInventoryBatches } from '@/hooks/useInventory';
import { useDistributions } from '@/hooks/useDistributions';
import { PageLayout } from '@/components/PageLayout';
import { StatCard } from '@/components/StatCard';
import { Package, Factory, Truck, AlertTriangle, Coffee, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

function Dashboard() {
  const { data: products } = useProducts();
  const { data: summary } = useInventorySummary();
  const { data: batches } = useInventoryBatches();
  const today = format(new Date(), 'yyyy-MM-dd');
  const { data: todayDistributions } = useDistributions(today);

  // Calculate stats
  const totalInInventory = summary?.reduce((acc, s) => acc + s.total_in_inventory, 0) || 0;
  const totalDistributed = summary?.reduce((acc, s) => {
    const inRider = s.total_distributed - s.total_sold - s.total_returned;
    return acc + inRider;
  }, 0) || 0;
  
  const totalCups = summary?.filter(s => s.category === 'product')
    .reduce((acc, s) => acc + s.total_in_inventory, 0) || 0;

  const expiringBatches = batches?.filter(b => {
    const daysUntil = Math.ceil(
      (new Date(b.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysUntil <= 2 && daysUntil >= 0 && b.current_quantity > 0;
  }) || [];

  const productCount = products?.filter(p => p.category === 'product').length || 0;

  return (
    <PageLayout 
      title="Dashboard" 
      subtitle={format(new Date(), 'EEEE, dd MMMM yyyy', { locale: localeId })}
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

      {/* Expiring Soon Alert */}
      {expiringBatches.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="bg-warning/10 border border-warning/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-warning" />
              <h3 className="font-semibold text-warning">Produk Mendekati Expired</h3>
            </div>
            <div className="space-y-2">
              {expiringBatches.slice(0, 3).map((batch) => {
                const daysUntil = Math.ceil(
                  (new Date(batch.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                );
                return (
                  <div 
                    key={batch.id} 
                    className="flex items-center justify-between bg-background/50 rounded-lg px-3 py-2"
                  >
                    <div>
                      <p className="font-medium text-sm">{batch.product?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Stok: {batch.current_quantity} • Exp: {format(new Date(batch.expiry_date), 'dd/MM')}
                      </p>
                    </div>
                    <span className={cn(
                      'badge-warning',
                      daysUntil === 0 && 'badge-danger'
                    )}>
                      {daysUntil === 0 ? 'Hari ini' : `${daysUntil} hari`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}

      {/* Product Summary */}
      <div className="table-container">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold">Ringkasan Stok per Produk</h3>
        </div>
        <div className="divide-y divide-border">
          {summary?.map((item) => {
            const inRider = item.total_distributed - item.total_sold - item.total_returned;
            return (
              <div key={item.product_id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center',
                    item.category === 'product' 
                      ? 'bg-primary/10 text-primary' 
                      : 'bg-secondary/10 text-secondary'
                  )}>
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
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
              </div>
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
