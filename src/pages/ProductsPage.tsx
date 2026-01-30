import { useState } from 'react';
import { useProducts, useAddProduct, useUpdateProduct, useDeleteProduct } from '@/hooks/useProducts';
import { PageLayout } from '@/components/PageLayout';
import { Package, Plus, Trash2, Coffee, Cookie, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { ProductCategory } from '@/types/database';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

function ProductsPage() {
  const { data: products, isLoading } = useProducts();
  const addProduct = useAddProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ProductCategory>('product');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingId) {
      await updateProduct.mutateAsync({ id: editingId, name: name.trim(), category });
      setEditingId(null);
    } else {
      await addProduct.mutateAsync({ name: name.trim(), category });
    }
    setName('');
    setCategory('product');
    setIsOpen(false);
  };

  const handleEdit = (id: string, currentName: string, currentCategory: ProductCategory) => {
    setEditingId(id);
    setName(currentName);
    setCategory(currentCategory);
    setIsOpen(true);
  };

  const handleCloseDialog = () => {
    setIsOpen(false);
    setEditingId(null);
    setName('');
    setCategory('product');
  };

  const handleDelete = async (id: string) => {
    if (confirm('Hapus produk ini? Data inventori terkait juga akan terhapus.')) {
      await deleteProduct.mutateAsync(id);
    }
  };

  const productList = products?.filter(p => p.category === 'product') || [];
  const addonList = products?.filter(p => p.category === 'addon') || [];

  return (
    <PageLayout
      title="Kelola Produk"
      subtitle="Daftar produk dan add-on"
      action={
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <button className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Tambah</span>
            </button>
          </DialogTrigger>
          <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Produk' : 'Tambah Produk Baru'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nama Produk</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Kopi Aren"
                  className="input-field"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Kategori</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCategory('product')}
                    className={cn(
                      'p-4 rounded-xl border-2 transition-all text-left',
                      category === 'product'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <Coffee className={cn(
                      'w-6 h-6 mb-2',
                      category === 'product' ? 'text-primary' : 'text-muted-foreground'
                    )} />
                    <p className="font-medium">Produk</p>
                    <p className="text-xs text-muted-foreground">Dihitung sebagai cup</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategory('addon')}
                    className={cn(
                      'p-4 rounded-xl border-2 transition-all text-left',
                      category === 'addon'
                        ? 'border-secondary bg-secondary/5'
                        : 'border-border hover:border-secondary/50'
                    )}
                  >
                    <Cookie className={cn(
                      'w-6 h-6 mb-2',
                      category === 'addon' ? 'text-secondary' : 'text-muted-foreground'
                    )} />
                    <p className="font-medium">Add-on</p>
                    <p className="text-xs text-muted-foreground">Tidak dihitung cup</p>
                  </button>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  type="submit" 
                  className="flex-1"
                  disabled={!name.trim() || (editingId ? updateProduct.isPending : addProduct.isPending)}
                >
                  {editingId ? 
                    (updateProduct.isPending ? 'Menyimpan...' : 'Simpan Perubahan') 
                    : (addProduct.isPending ? 'Menyimpan...' : 'Simpan Produk')
                  }
                </Button>
                <Button
                  type="button"
                  onClick={handleCloseDialog}
                  className="btn-outline"
                >
                  Batal
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      }
    >
      {/* Products Section */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Coffee className="w-5 h-5 text-primary" />
          <h2 className="font-semibold">Produk ({productList.length})</h2>
        </div>
        <div className="table-container">
          <AnimatePresence>
            {productList.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between p-4 border-b border-border last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Coffee className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <span className="badge-success">Cup</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(product.id, product.name, product.category)}
                    className="p-2 text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(product.id)}
                    className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {productList.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              <Coffee className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Belum ada produk</p>
            </div>
          )}
        </div>
      </div>

      {/* Addons Section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Cookie className="w-5 h-5 text-secondary" />
          <h2 className="font-semibold">Add-on ({addonList.length})</h2>
        </div>
        <div className="table-container">
          <AnimatePresence>
            {addonList.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between p-4 border-b border-border last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center">
                    <Cookie className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <span className="bg-secondary/10 text-secondary px-2 py-0.5 rounded-full text-xs font-medium">Add-on</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(product.id, product.name, product.category)}
                    className="p-2 text-muted-foreground hover:text-secondary transition-colors"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(product.id)}
                    className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {addonList.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              <Cookie className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Belum ada add-on</p>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}

export default ProductsPage;
