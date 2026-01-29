import { useState } from 'react';
import { useProducts } from '@/hooks/useProducts';
import { useInventoryBatches, useAddBatch } from '@/hooks/useInventory';
import { PageLayout } from '@/components/PageLayout';
import { Factory, Plus, Calendar, Package, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, addDays } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

function ProductionPage() {
  const { data: products } = useProducts();
  const { data: batches, isLoading } = useInventoryBatches();
  const addBatch = useAddBatch();
  const [isOpen, setIsOpen] = useState(false);
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [productionDate, setProductionDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [expiryDate, setExpiryDate] = useState(format(addDays(new Date(), 3), 'yyyy-MM-dd'));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || !quantity || !productionDate || !expiryDate) return;

    await addBatch.mutateAsync({
      product_id: productId,
      initial_quantity: parseInt(quantity),
      production_date: productionDate,
      expiry_date: expiryDate,
    });
    
    setProductId('');
    setQuantity('');
    setProductionDate(format(new Date(), 'yyyy-MM-dd'));
    setExpiryDate(format(addDays(new Date(), 3), 'yyyy-MM-dd'));
    setIsOpen(false);
  };

  const getDaysUntilExpiry = (expiryDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getExpiryStatus = (days: number) => {
    if (days < 0) return { label: 'Expired', class: 'badge-danger' };
    if (days === 0) return { label: 'Hari ini', class: 'badge-danger' };
    if (days <= 2) return { label: `${days} hari`, class: 'badge-warning' };
    return { label: `${days} hari`, class: 'badge-success' };
  };

  // Group batches by production date
  const groupedBatches = batches?.reduce((acc, batch) => {
    const date = batch.production_date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(batch);
    return acc;
  }, {} as Record<string, typeof batches>) || {};

  const sortedDates = Object.keys(groupedBatches).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );

  return (
    <PageLayout
      title="Produksi"
      subtitle="Kelola batch produksi dan tanggal expired"
      action={
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <button className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Produksi Baru</span>
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tambah Produksi Baru</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div>
                <label className="block text-sm font-medium mb-2">Produk</label>
                <Select value={productId} onValueChange={setProductId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih produk" />
                  </SelectTrigger>
                  <SelectContent>
                    {products?.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} ({product.category === 'product' ? 'Produk' : 'Add-on'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Jumlah Produksi</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Contoh: 50"
                  className="input-field"
                  min="1"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-2">Tanggal Produksi</label>
                  <input
                    type="date"
                    value={productionDate}
                    onChange={(e) => setProductionDate(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Tanggal Expired</label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="input-field"
                    min={productionDate}
                  />
                </div>
              </div>
              <Button 
                type="submit" 
                className="w-full"
                disabled={!productId || !quantity || addBatch.isPending}
              >
                {addBatch.isPending ? 'Menyimpan...' : 'Simpan Produksi'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      }
    >
      {/* Batch List by Date */}
      <div className="space-y-6">
        {sortedDates.map((date) => {
          const batchesForDate = groupedBatches[date] || [];
          const formattedDate = format(new Date(date), 'EEEE, dd MMMM yyyy', { locale: localeId });
          const isToday = date === format(new Date(), 'yyyy-MM-dd');

          return (
            <div key={date}>
              <div className="flex items-center gap-2 mb-3">
                <Calendar className={cn('w-4 h-4', isToday ? 'text-primary' : 'text-muted-foreground')} />
                <h3 className={cn('font-medium text-sm', isToday ? 'text-primary' : 'text-muted-foreground')}>
                  {isToday ? 'Hari ini' : formattedDate}
                </h3>
              </div>
              <div className="table-container">
                <AnimatePresence>
                  {batchesForDate.map((batch, index) => {
                    const daysUntil = getDaysUntilExpiry(batch.expiry_date);
                    const status = getExpiryStatus(daysUntil);
                    
                    return (
                      <motion.div
                        key={batch.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="p-4 border-b border-border last:border-0"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              'w-10 h-10 rounded-lg flex items-center justify-center',
                              batch.product?.category === 'product'
                                ? 'bg-primary/10 text-primary'
                                : 'bg-secondary/10 text-secondary'
                            )}>
                              <Package className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-medium">{batch.product?.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-muted-foreground">
                                  Produksi: {batch.initial_quantity}
                                </span>
                                <span className="text-muted-foreground">•</span>
                                <span className="text-xs text-muted-foreground">
                                  Sisa: {batch.current_quantity}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={status.class}>{status.label}</span>
                            <p className="text-xs text-muted-foreground mt-1">
                              Exp: {format(new Date(batch.expiry_date), 'dd/MM/yyyy')}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          );
        })}

        {sortedDates.length === 0 && (
          <div className="table-container p-8 text-center text-muted-foreground">
            <Factory className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Belum ada data produksi</p>
            <p className="text-sm">Tambahkan produksi baru untuk memulai</p>
          </div>
        )}
      </div>
    </PageLayout>
  );
}

export default ProductionPage;
