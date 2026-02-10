import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Product, ProductCategory } from '@/types/database';
import { toast } from 'sonner';

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products' as never)
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Product[];
    },
  });
}

export function useAddProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, category }: { name: string; category: ProductCategory }) => {
      const { data, error } = await supabase
        .from('products' as never)
        .insert([{ name, category }] as never)
        .select()
        .single();
      
      if (error) throw error;
      return data as Product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Produk berhasil ditambahkan');
    },
    onError: (error: Error) => {
      toast.error('Gagal menambahkan produk: ' + error.message);
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name, category, price, description }: { id: string; name: string; category: ProductCategory; price?: number; description?: string }) => {
      const updateData: any = { name, category };
      if (price !== undefined) updateData.price = price;
      if (description !== undefined) updateData.description = description;

      const { data, error } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Produk berhasil diperbarui');
    },
    onError: (error: Error) => {
      toast.error('Gagal memperbarui produk: ' + error.message);
    },
  });
}

export function useUpdateProductPrice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, price }: { id: string; price: number }) => {
      if (price < 0) throw new Error('Harga tidak boleh negatif');

      const { data, error } = await supabase
        .from('products')
        .update({ price })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Harga produk berhasil diperbarui');
    },
    onError: (error: Error) => {
      toast.error('Gagal memperbarui harga: ' + error.message);
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('products' as never)
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Produk berhasil dihapus');
    },
    onError: (error: Error) => {
      toast.error('Gagal menghapus produk: ' + error.message);
    },
  });
}
