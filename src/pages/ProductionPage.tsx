import { useState } from 'react';
import { useProducts } from '@/hooks/useProducts';
import { useInventoryBatches, useAddBatch } from '@/hooks/useInventory';
import { PageLayout } from '@/components/PageLayout';
import { Factory, Plus, Calendar, Package, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, addDays } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
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
  const [expiryDate, setExpiryDate] = useState(format(addDays(new Date(), 7), 'yyyy-MM-dd'));
  const [expandedProducts, setExpandedProducts] = useState<Record<string, boolean>>({});

  // Get selected product to determine expiry days
  const selectedProduct = products?.find(p => p.id === productId);
  const expiryDays = selectedProduct?.category === 'product' ? 7 : 3;

  // Auto-update expiry when product changes
  const handleProductChange = (value: string) => {
    setProductId(value);
    const product = products?.find(p => p.id === value);
    const days = product?.category === 'product' ? 7 : 3;
    const newExpiryDate = format(addDays(new Date(productionDate), days), 'yyyy-MM-dd');
    setExpiryDate(newExpiryDate);
  };

  // Auto-update expiry when production date changes
  const handleProductionDateChange = (value: string) => {
    setProductionDate(value);
    const days = selectedProduct?.category === 'product' ? 7 : 3;
    const newExpiryDate = format(addDays(new Date(value), days), 'yyyy-MM-dd');
    setExpiryDate(newExpiryDate);
  };

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
    setExpiryDate(format(addDays(new Date(), 7), 'yyyy-MM-dd'));
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
    if (days <= 3) return { label: `${days} hari`, class: 'badge-warning' };
    return { label: `${days} hari`, class: 'badge-success' };
  };

  // Group and consolidate batches by product name
  const consolidatedBatches = batches?.reduce((acc, batch) => {
    const productName = batch.product?.name || 'Unknown';
    if (!acc[productName]) {
      acc[productName] = {
        productName,
        productId: batch.product_id,
        category: batch.product?.category,
        batches: [],
        totalProduced: 0,
        totalCurrent: 0,
      };
    }
    acc[productName].batches.push(batch);
    acc[productName].totalProduced += batch.initial_quantity;
    acc[productName].totalCurrent += batch.current_quantity;
    return acc;
  }, {} as Record<string, any>) || {};

  // Sort by product name
  const sortedProducts = Object.values(consolidatedBatches).sort((a, b) => 
    a.productName.localeCompare(b.productName)
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
                <Select value={productId} onValueChange={handleProductChange}>
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
                {selectedProduct && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Expired default: {expiryDays} hari dari tanggal produksi
                  </p>
                )}
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
                    onChange={(e) => handleProductionDateChange(e.target.value)}
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
                  {selectedProduct && (
                    <p className="text-xs text-muted-foreground mt-1">
                      ({expiryDays} hari otomatis)
                    </p>
                  )}
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
      {/* Consolidated Product List */}
      <div className="space-y-3">
        {sortedProducts.map((consolidated, index) => {
          const isExpanded = expandedProducts[consolidated.productName];
          const latestBatch = consolidated.batches.sort((a, b) => 
            new Date(b.production_date).getTime() - new Date(a.production_date).getTime()
          )[0];
          const daysUntil = latestBatch ? getDaysUntilExpiry(latestBatch.expiry_date) : 0;
          const status = getExpiryStatus(daysUntil);

          return (
            <motion.div
              key={consolidated.productName}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="border border-border rounded-lg overflow-hidden"
            >
              {/* Summary Row */}
              <button
                onClick={() => setExpandedProducts(prev => ({
                  ...prev,
                  [consolidated.productName]: !prev[consolidated.productName]
                }))}
                className="w-full p-4 hover:bg-muted/30 transition-colors text-left flex items-center justify-between"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center',
                    consolidated.category === 'product'
                      ? 'bg-primary/10 text-primary'
                      : 'bg-secondary/10 text-secondary'
                  )}>
                    <Package className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{consolidated.productName}</p>
                    <p className="text-xs text-muted-foreground">
                      {consolidated.batches.length} batch • Produksi: {consolidated.totalProduced} • Sisa: {consolidated.totalCurrent}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className={status.class}>{status.label}</span>
                    {latestBatch && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Exp: {format(new Date(latestBatch.expiry_date), 'dd/MM')}
                      </p>
                    )}
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </button>

              {/* Expanded Batch Details */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-border bg-muted/20"
                  >
                    <div className="divide-y divide-border">
                      {consolidated.batches
                        .sort((a, b) => new Date(b.production_date).getTime() - new Date(a.production_date).getTime())
                        .map((batch) => {
                          const daysUntil = getDaysUntilExpiry(batch.expiry_date);
                          const status = getExpiryStatus(daysUntil);
                          return (
                            <div key={batch.id} className="p-3 text-sm">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-muted-foreground">
                                    Produksi: {format(new Date(batch.production_date), 'dd/MM/yy')}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Awal: {batch.initial_quantity} • Sisa: {batch.current_quantity}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <span className={status.class}>{status.label}</span>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {format(new Date(batch.expiry_date), 'dd/MM/yy')}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}

        {sortedProducts.length === 0 && (
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
