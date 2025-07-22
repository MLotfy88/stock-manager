
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
  alertPeriod: number; // Period in days to alert before expiration
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
  nameEn?: string; // Added nameEn property
  description?: string;
}

export interface Store {
  id: string;
  name: string;
  location?: string;
}

export interface ProductVariant {
  name: string;
  reorderPoint: number;
}

export interface ProductDefinition {
  id:string;
  name: string;
  typeId: string;
  variantLabel: string; // e.g., "Size", "Curve"
  variants: ProductVariant[]; // e.g., [{ name: "2x10", reorderPoint: 5 }]
  createdAt: string;
  updatedAt: string;
}

export interface InventoryItem {
  id: string;
  productDefinitionId: string;
  variant: string;
  barcode?: string;
  quantity: number;
  storeId: string;
  manufacturerId: string;
  supplierId?: string;
  batchNumber: string;
  productionDate?: string;
  purchasePrice?: number;
  expiryDate: string;
  image?: string;
  status: SupplyStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalSupplies: number;
  expiringSupplies: number;
  expiredSupplies: number;
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
  inventoryItemId: string; // Changed from supplyId
  itemName: string; // e.g., "Diagnostic Catheter - L3.5"
  quantity: number;
  notes?: string;
}

export interface ConsumptionRecord {
  id: string;
  date: string;
  department: string;
  requestedBy: string;
  approvedBy?: string;
  status: 'pending' | 'approved' | 'completed';
  purpose?: 'use' | 'expired' | 'damaged';
  items: ConsumptionItem[];
  notes?: string;
  createdAt: string;
}
