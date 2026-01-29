import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Product, ProductCategory } from '@/types/database';
import { toast } from 'sonner';

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
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
        .from('products')
        .insert([{ name, category }])
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

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('products')
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
