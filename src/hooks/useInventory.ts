import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { InventoryBatch, InventorySummary, Distribution } from '@/types/database';
import { toast } from 'sonner';

export function useInventoryBatches() {
  return useQuery({
    queryKey: ['inventory-batches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_batches' as never)
        .select(`
          *,
          product:products(*)
        `)
        .order('expiry_date', { ascending: true });
      
      if (error) throw error;
      return data as InventoryBatch[];
    },
  });
}

export function useAvailableBatches() {
  return useQuery({
    queryKey: ['available-batches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_batches' as never)
        .select(`
          *,
          product:products(*)
        `)
        .gt('current_quantity', 0)
        .order('expiry_date', { ascending: true });
      
      if (error) throw error;
      return data as InventoryBatch[];
    },
  });
}

export function useInventorySummary() {
  return useQuery({
    queryKey: ['inventory-summary'],
    queryFn: async () => {
      const { data: batches, error: batchError } = await supabase
        .from('inventory_batches' as never)
        .select(`
          *,
          product:products(*)
        `)
        .order('expiry_date', { ascending: true });

      if (batchError) throw batchError;

      const { data: distributions, error: distError } = await supabase
        .from('distributions' as never)
        .select('*');

      if (distError) throw distError;

      const typedBatches = batches as InventoryBatch[];
      const typedDistributions = distributions as Distribution[];

      // Group by product
      const summaryMap = new Map<string, InventorySummary>();

      for (const batch of typedBatches || []) {
        const productId = batch.product_id;
        const product = batch.product;

        if (!summaryMap.has(productId)) {
          summaryMap.set(productId, {
            product_id: productId,
            product_name: product?.name || 'Unknown',
            category: product?.category || 'product',
            total_in_inventory: 0,
            total_distributed: 0,
            total_sold: 0,
            total_returned: 0,
            batches: [],
          });
        }

        const summary = summaryMap.get(productId)!;
        summary.total_in_inventory += batch.current_quantity;
        summary.batches.push(batch);
      }

      // Add distribution data
      for (const dist of typedDistributions || []) {
        const batch = typedBatches?.find(b => b.id === dist.batch_id);
        if (batch) {
          const summary = summaryMap.get(batch.product_id);
          if (summary) {
            summary.total_distributed += dist.quantity;
            summary.total_sold += dist.sold_quantity || 0;
            summary.total_returned += dist.returned_quantity || 0;
          }
        }
      }

      return Array.from(summaryMap.values());
    },
  });
}

export function useAddBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      product_id,
      production_date,
      expiry_date,
      initial_quantity,
    }: {
      product_id: string;
      production_date: string;
      expiry_date: string;
      initial_quantity: number;
    }) => {
      const { data, error } = await supabase
        .from('inventory_batches' as never)
        .insert([{
          product_id,
          production_date,
          expiry_date,
          initial_quantity,
          current_quantity: initial_quantity,
        }] as never)
        .select()
        .single();
      
      if (error) throw error;
      return data as InventoryBatch;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-batches'] });
      queryClient.invalidateQueries({ queryKey: ['available-batches'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-summary'] });
      toast.success('Batch produksi berhasil ditambahkan');
    },
    onError: (error: Error) => {
      toast.error('Gagal menambahkan batch: ' + error.message);
    },
  });
}

export function useUpdateBatchQuantity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, quantity }: { id: string; quantity: number }) => {
      const { error } = await supabase
        .from('inventory_batches' as never)
        .update({ current_quantity: quantity } as never)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-batches'] });
      queryClient.invalidateQueries({ queryKey: ['available-batches'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-summary'] });
    },
  });
}
