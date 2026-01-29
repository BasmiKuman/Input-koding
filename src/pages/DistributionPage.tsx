import { useState } from 'react';
import { useRiders, useAddRider } from '@/hooks/useRiders';
import { useAvailableBatches } from '@/hooks/useInventory';
import { useDistributions, useAddDistribution, useBulkDistribution } from '@/hooks/useDistributions';
import { PageLayout } from '@/components/PageLayout';
import { Truck, Plus, User, Package, Send, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
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
import { Checkbox } from '@/components/ui/checkbox';

function DistributionPage() {
  const { data: riders } = useRiders();
  const { data: availableBatches } = useAvailableBatches();
  const today = format(new Date(), 'yyyy-MM-dd');
  const { data: todayDistributions } = useDistributions(today);
  const addRider = useAddRider();
  const addDistribution = useAddDistribution();
  const bulkDistribution = useBulkDistribution();

  const [isRiderOpen, setIsRiderOpen] = useState(false);
  const [isDistOpen, setIsDistOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  
  // Rider form
  const [riderName, setRiderName] = useState('');
  const [riderPhone, setRiderPhone] = useState('');
  
  // Distribution form
  const [selectedRider, setSelectedRider] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [distQuantity, setDistQuantity] = useState('');

  // Bulk distribution form
  const [bulkRider, setBulkRider] = useState('');
  const [selectedBatches, setSelectedBatches] = useState<string[]>([]);
  const [bulkQuantity, setBulkQuantity] = useState('5');

  const handleAddRider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!riderName.trim()) return;
    await addRider.mutateAsync({ name: riderName.trim(), phone: riderPhone.trim() || undefined });
    setRiderName('');
    setRiderPhone('');
    setIsRiderOpen(false);
  };

  const handleDistribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRider || !selectedBatch || !distQuantity) return;
    await addDistribution.mutateAsync({
      rider_id: selectedRider,
      batch_id: selectedBatch,
      quantity: parseInt(distQuantity),
    });
    setSelectedBatch('');
    setDistQuantity('');
    setIsDistOpen(false);
  };

  const handleBulkDistribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkRider || selectedBatches.length === 0 || !bulkQuantity) return;
    await bulkDistribution.mutateAsync({
      rider_id: bulkRider,
      batch_ids: selectedBatches,
      quantity_per_product: parseInt(bulkQuantity),
    });
    setBulkRider('');
    setSelectedBatches([]);
    setBulkQuantity('5');
    setIsBulkOpen(false);
  };

  const toggleBatchSelection = (batchId: string) => {
    setSelectedBatches(prev => 
      prev.includes(batchId) 
        ? prev.filter(id => id !== batchId)
        : [...prev, batchId]
    );
  };

  const selectAllBatches = () => {
    if (selectedBatches.length === availableBatches?.length) {
      setSelectedBatches([]);
    } else {
      setSelectedBatches(availableBatches?.map(b => b.id) || []);
    }
  };

  return (
    <PageLayout
      title="Distribusi"
      subtitle="Kirim produk ke rider"
      action={
        <div className="flex gap-2">
          <Dialog open={isBulkOpen} onOpenChange={setIsBulkOpen}>
            <DialogTrigger asChild>
              <button className="btn-secondary flex items-center gap-2">
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Bulk</span>
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Distribusi Bulk ke Rider</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleBulkDistribute} className="space-y-4 mt-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Pilih Rider</label>
                  <Select value={bulkRider} onValueChange={setBulkRider}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih rider" />
                    </SelectTrigger>
                    <SelectContent>
                      {riders?.map((rider) => (
                        <SelectItem key={rider.id} value={rider.id}>
                          {rider.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Jumlah per Produk</label>
                  <input
                    type="number"
                    value={bulkQuantity}
                    onChange={(e) => setBulkQuantity(e.target.value)}
                    placeholder="Jumlah untuk setiap produk"
                    className="input-field"
                    min="1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Jumlah ini akan dikirim untuk setiap produk yang dipilih
                  </p>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium">Pilih Produk</label>
                    <button
                      type="button"
                      onClick={selectAllBatches}
                      className="text-xs text-primary hover:underline"
                    >
                      {selectedBatches.length === availableBatches?.length ? 'Hapus Semua' : 'Pilih Semua'}
                    </button>
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto border border-border rounded-lg p-2">
                    {availableBatches?.map((batch) => (
                      <label
                        key={batch.id}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors',
                          selectedBatches.includes(batch.id)
                            ? 'bg-primary/10 border border-primary/20'
                            : 'bg-muted/50 hover:bg-muted'
                        )}
                      >
                        <Checkbox
                          checked={selectedBatches.includes(batch.id)}
                          onCheckedChange={() => toggleBatchSelection(batch.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{batch.product?.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Stok: {batch.current_quantity} • Exp: {format(new Date(batch.expiry_date), 'dd/MM')}
                          </p>
                        </div>
                      </label>
                    ))}
                    {(!availableBatches || availableBatches.length === 0) && (
                      <p className="text-center text-muted-foreground py-4">
                        Tidak ada stok tersedia
                      </p>
                    )}
                  </div>
                </div>
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={!bulkRider || selectedBatches.length === 0 || bulkDistribution.isPending}
                >
                  {bulkDistribution.isPending 
                    ? 'Memproses...' 
                    : `Kirim ${selectedBatches.length} Produk (${parseInt(bulkQuantity || '0') * selectedBatches.length} unit)`
                  }
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isDistOpen} onOpenChange={setIsDistOpen}>
            <DialogTrigger asChild>
              <button className="btn-primary flex items-center gap-2">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Kirim</span>
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Distribusi Produk</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleDistribute} className="space-y-4 mt-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Pilih Rider</label>
                  <Select value={selectedRider} onValueChange={setSelectedRider}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih rider" />
                    </SelectTrigger>
                    <SelectContent>
                      {riders?.map((rider) => (
                        <SelectItem key={rider.id} value={rider.id}>
                          {rider.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Pilih Batch Produk</label>
                  <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih batch" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableBatches?.map((batch) => (
                        <SelectItem key={batch.id} value={batch.id}>
                          {batch.product?.name} - Stok: {batch.current_quantity} (Exp: {format(new Date(batch.expiry_date), 'dd/MM')})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Jumlah</label>
                  <input
                    type="number"
                    value={distQuantity}
                    onChange={(e) => setDistQuantity(e.target.value)}
                    placeholder="Jumlah unit"
                    className="input-field"
                    min="1"
                    max={availableBatches?.find(b => b.id === selectedBatch)?.current_quantity || 999}
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={!selectedRider || !selectedBatch || !distQuantity || addDistribution.isPending}
                >
                  {addDistribution.isPending ? 'Mengirim...' : 'Kirim ke Rider'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      }
    >
      {/* Riders Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">Daftar Rider</h2>
          </div>
          <Dialog open={isRiderOpen} onOpenChange={setIsRiderOpen}>
            <DialogTrigger asChild>
              <button className="btn-outline text-sm py-1.5 px-3">
                <Plus className="w-4 h-4 mr-1 inline" />
                Rider
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tambah Rider Baru</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddRider} className="space-y-4 mt-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Nama Rider</label>
                  <input
                    type="text"
                    value={riderName}
                    onChange={(e) => setRiderName(e.target.value)}
                    placeholder="Nama lengkap"
                    className="input-field"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">No. Telepon (opsional)</label>
                  <input
                    type="tel"
                    value={riderPhone}
                    onChange={(e) => setRiderPhone(e.target.value)}
                    placeholder="08xxx"
                    className="input-field"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={!riderName.trim() || addRider.isPending}
                >
                  {addRider.isPending ? 'Menyimpan...' : 'Simpan Rider'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {riders?.map((rider) => (
            <div
              key={rider.id}
              className="flex-shrink-0 bg-card border border-border rounded-lg px-4 py-3 min-w-[120px]"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-medium text-sm">{rider.name}</p>
                  {rider.phone && (
                    <p className="text-xs text-muted-foreground">{rider.phone}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
          {(!riders || riders.length === 0) && (
            <p className="text-sm text-muted-foreground">Belum ada rider</p>
          )}
        </div>
      </div>

      {/* Today's Distributions */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Truck className="w-5 h-5 text-success" />
          <h2 className="font-semibold">Distribusi Hari Ini</h2>
        </div>
        <div className="table-container">
          <AnimatePresence>
            {todayDistributions?.map((dist, index) => (
              <motion.div
                key={dist.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 border-b border-border last:border-0"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-success/10 text-success flex items-center justify-center">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium">{dist.rider?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {dist.batch?.product?.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Batch: {format(new Date(dist.batch?.production_date || ''), 'dd/MM')} - {format(new Date(dist.batch?.expiry_date || ''), 'dd/MM')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{dist.quantity} unit</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(dist.distributed_at), 'HH:mm')}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {(!todayDistributions || todayDistributions.length === 0) && (
            <div className="p-8 text-center text-muted-foreground">
              <Truck className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Belum ada distribusi hari ini</p>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}

export default DistributionPage;
