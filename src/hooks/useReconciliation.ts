import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Distribution } from '@/types/database';

export interface ReconciliationItem {
  id: string;
  batchId: string;
  productName: string;
  productId: string;
  riderId: string;
  riderName: string;
  distributedQuantity: number;
  soldQuantity: number;
  returnedQuantity: number;
  rejectedQuantity: number;
  unaccountedQuantity: number;
  accountingPercentage: number;
  status: 'complete' | 'pending' | 'mismatch';
  distributedAt: string;
  notes?: string;
}

export function useReconciliation(riderId?: string, dateRange?: { start: string; end: string }) {
  return useQuery({
    queryKey: ['reconciliation', riderId, dateRange],
    queryFn: async () => {
      let query = supabase
        .from('distributions' as never)
        .select(`
          id,
          batch_id,
          rider_id,
          quantity,
          sold_quantity,
          returned_quantity,
          rejected_quantity,
          distributed_at,
          notes,
          rider:riders(*),
          batch:inventory_batches(
            *,
            product:products(*)
          )
        `);
      
      if (riderId) {
        query = query.eq('rider_id', riderId);
      }
      
      if (dateRange) {
        query = query
          .gte('distributed_at', `${dateRange.start}T00:00:00`)
          .lte('distributed_at', `${dateRange.end}T23:59:59`);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      interface DistributionRow {
        id: string;
        batch_id: string;
        rider_id: string;
        quantity: number;
        sold_quantity?: number | null;
        returned_quantity?: number | null;
        rejected_quantity?: number | null;
        distributed_at: string;
        notes?: string | null;
        rider: { name: string } | null;
        batch: {
          product: { id: string; name: string } | null;
        } | null;
      }
      
      const distributions = (data || []) as DistributionRow[];
      
      const reconciliationItems: ReconciliationItem[] = distributions.map(dist => {
        const distributed = dist.quantity || 0;
        const sold = dist.sold_quantity || 0;
        const returned = dist.returned_quantity || 0;
        const rejected = dist.rejected_quantity || 0;
        const accounted = sold + returned + rejected;
        const unaccounted = distributed - accounted;
        
        let status: 'complete' | 'pending' | 'mismatch' = 'complete';
        if (unaccounted > 0) {
          status = 'pending';
        } else if (unaccounted < 0) {
          status = 'mismatch'; // Over-accounting (error condition)
        }
        
        return {
          id: dist.id,
          batchId: dist.batch_id,
          productName: dist.batch?.product?.name || 'Unknown',
          productId: dist.batch?.product?.id || '',
          riderId: dist.rider_id,
          riderName: dist.rider?.name || 'Unknown',
          distributedQuantity: distributed,
          soldQuantity: sold,
          returnedQuantity: returned,
          rejectedQuantity: rejected,
          unaccountedQuantity: Math.abs(unaccounted),
          accountingPercentage: distributed > 0 ? Math.round((accounted / distributed) * 100) : 0,
          status,
          distributedAt: dist.distributed_at,
          notes: dist.notes,
        };
      });
      
      return reconciliationItems;
    },
    enabled: true,
  });
}

export function useReconciliationSummary(dateRange?: { start: string; end: string }) {
  const { data: allItems } = useReconciliation(undefined, dateRange);
  
  return {
    totalDistributed: allItems?.reduce((sum, item) => sum + item.distributedQuantity, 0) || 0,
    totalSold: allItems?.reduce((sum, item) => sum + item.soldQuantity, 0) || 0,
    totalReturned: allItems?.reduce((sum, item) => sum + item.returnedQuantity, 0) || 0,
    totalRejected: allItems?.reduce((sum, item) => sum + item.rejectedQuantity, 0) || 0,
    totalUnaccounted: allItems?.reduce((sum, item) => sum + item.unaccountedQuantity, 0) || 0,
    pendingItems: allItems?.filter(item => item.status === 'pending') || [],
    mismatchItems: allItems?.filter(item => item.status === 'mismatch') || [],
    completeItems: allItems?.filter(item => item.status === 'complete') || [],
    overallAccountingPercentage: allItems && allItems.length > 0
      ? Math.round(
          allItems.reduce((sum, item) => sum + item.accountingPercentage, 0) / allItems.length
        )
      : 0,
  };
}
