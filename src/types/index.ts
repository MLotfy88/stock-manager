
export type SupplyType = 
  | 'catheter' 
  | 'surgical_tool' 
  | 'medication' 
  | 'consumable'
  | 'implant'
  | 'other';

export type SupplyStatus = 
  | 'valid' 
  | 'expiring_soon' 
  | 'expired';

export interface Manufacturer {
  id: string;
  name: string;
  logo?: string;
  alert_period: number; // Period in days to alert before expiration
  created_at?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact?: string;
  phone?: string;
  email?: string;
}

export interface SupplyTypeItem {
  id: string;
  name: string;
  name_en?: string; // Added nameEn property
  description?: string;
}

export interface Store {
  id: string;
  name: string;
  location?: string;
}

export interface ProductVariant {
  name: string;
  reorder_point: number;
}

export interface ProductDefinition {
  id:string;
  name: string;
  type_id: string;
  variant_label: string; // e.g., "Size", "Curve"
  variants: ProductVariant[]; // e.g., [{ name: "2x10", reorder_point: 5 }]
  created_at: string;
  updated_at: string;
}

export interface InventoryItem {
  id: string;
  product_definition_id: string;
  variant: string;
  barcode?: string;
  quantity: number;
  store_id: string;
  manufacturer_id: string;
  supplier_id?: string;
  batch_number: string;
  production_date?: string;
  purchase_price?: number;
  expiry_date: string;
  image?: string;
  status: SupplyStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  totalSupplies: number;
  expiringSupplies: number;
  expiredSupplies: number;
  reorderPointItems: number; // Added for urgent actions
  typeCounts: Record<SupplyType, number>;
  manufacturerCounts: Record<string, number>;
}

export type AdminSettings = {
  username: string;
  password: string;
};

export interface AlertPeriod {
  id: string;
  value: number; // in months
  label: string;
}

// أنواع بيانات لسجلات الاستهلاك
export interface ConsumptionItem {
  id: string;
  inventory_item_id: string; // Changed from supplyId
  item_name: string; // e.g., "Diagnostic Catheter - L3.5"
  quantity: number;
  notes?: string;
}

export interface ConsumptionRecord {
  id: string;
  date: string;
  department: string;
  requested_by: string;
  approved_by?: string;
  status: 'pending' | 'approved' | 'completed';
  purpose?: 'use' | 'expired' | 'damaged';
  items: ConsumptionItem[];
  notes?: string;
  created_at: string;
}

export interface SignInCredentials {
  email: string;
  password: string;
}
