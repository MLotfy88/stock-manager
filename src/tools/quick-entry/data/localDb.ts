import Dexie, { Table } from 'dexie';

export interface LocalInventoryEntry {
  id?: number;
  barcode: string;
  gtin?: string;
  lotNumber: string;
  expiryDate: string;
  quantity: number;
  purchasePrice?: number;
  productDefinitionId: string;
  productName: string;
  variant: string;
  manufacturerId?: string;
  manufacturerName?: string;
  supplierId: string;
  supplierName: string;
  storeId?: string;
  timestamp: number;
}

export interface CachedData {
  id: string; // e.g. 'suppliers', 'products'
  data: any[];
  updatedAt: number;
}

export class QuickEntryDatabase extends Dexie {
  inventory_entries!: Table<LocalInventoryEntry>;
  cache!: Table<CachedData>;

  constructor() {
    super('QuickEntryDatabase');
    this.version(1).stores({
      inventory_entries: '++id, barcode, gtin, productDefinitionId, supplierId, timestamp',
      cache: 'id'
    });
  }
}

export const db = new QuickEntryDatabase();
