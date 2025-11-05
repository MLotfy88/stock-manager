
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
  | 'expired'
  | 'needs_replacement_action';

export interface Manufacturer {
  id: string;
  name: string;
  logo?: string;
  created_at?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact?: string;
  phone?: string;
  email?: string;
  alert_period: number; // Period in days to alert before expiration
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
  reorder_point: number;
  created_at: string;
  updated_at: string;
}

export type StockType = 'purchased' | 'on_shelf';

export interface SupplyVoucher {
  id: string;
  voucher_number?: string;
  supplier_id?: string;
  date: string;
  stock_type: StockType;
  notes?: string;
  created_at: string;
}

export interface InventoryItem {
  id: string;
  barcode: string | null;
  batch_number: string | null;
  expiry_date: string;
  quantity: number;
  initial_quantity: number;
  purchase_price: number | null;
  variant: string;
  product_definition_id: string;
  store_id: string;
  manufacturer_id: string | null;
  supplier_id: string | null;
  supply_voucher_id?: string | null;
  stock_type: StockType;
  
  // Joined fields from the new view
  store_name: string;
  product_name: string;
  reorder_point: number;
  supply_type_name: string;
  manufacturer_name: string;
  supplier_name: string;
  status: string;
}

export type InvoicingStatus = 'not_consumed' | 'consumed_not_invoiced' | 'partially_invoiced' | 'fully_invoiced';

export interface OnShelfItemStatus {
  inventory_item_id: string;
  product_name: string;
  variant: string;
  batch_number: string;
  supplier_name: string;
  initial_quantity: number;
  consumed_quantity: number;
  remaining_quantity: number;
  invoicing_status: InvoicingStatus;
}

export interface OnShelfInvoiceItem {
  consumption_item_id: string;
  consumption_date: string;
  department: string;
  product_name: string;
  variant: string;
  batch_number: string;
  supplier_name: string;
  consumed_quantity: number;
  purchase_price: number;
  total_cost: number;
  inventory_item_id: string;
  supplier_id: string;
}

export interface RecentActivity {
  type: 'supply' | 'consumption';
  date: Date;
  description: string;
}

export interface DashboardStats {
  totalSupplies: number;
  expiringSupplies: number;
  expiredSupplies: number;
  validSupplies: number;
  reorderPointItems: number;
  typeCounts: Record<string, number>;
  recentActivities: RecentActivity[];
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
  is_invoiced?: boolean;
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
