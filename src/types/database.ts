export type ProductCategory = 'product' | 'addon';

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  created_at: string;
}

export interface InventoryBatch {
  id: string;
  product_id: string;
  production_date: string;
  expiry_date: string;
  initial_quantity: number;
  current_quantity: number;
  created_at: string;
  rejected_quantity?: number;
  rejection_reason?: string;
  rejected_at?: string;
  product?: Product;
}

export interface Rider {
  id: string;
  name: string;
  phone?: string;
  created_at: string;
}

export interface Distribution {
  id: string;
  rider_id: string;
  batch_id: string;
  quantity: number;
  distributed_at: string;
  returned_quantity: number;
  sold_quantity: number;
  notes?: string;
  rider?: Rider;
  batch?: InventoryBatch;
}

export interface InventorySummary {
  product_id: string;
  product_name: string;
  category: ProductCategory;
  total_in_inventory: number;
  total_distributed: number;
  total_sold: number;
  total_returned: number;
  batches: InventoryBatch[];
}

export interface DailyReport {
  date: string;
  productions: {
    product_name: string;
    quantity: number;
    production_date: string;
    expiry_date: string;
  }[];
  distributions: {
    rider_name: string;
    product_name: string;
    quantity: number;
    batch_info: string;
  }[];
  summary: {
    total_cups: number;
    total_addons: number;
    products: InventorySummary[];
  };
}
