
import { Supplier } from '@/types';
import { saveData } from '../../utils/storageUtils';
import { store } from '../store';

/**
 * Add a new supplier
 */
export const addSupplier = (supplier: Supplier) => {
  store.suppliers.push(supplier);
  
  const saved = saveData({ 
    manufacturers: store.manufacturers, 
    supplies: store.supplies, 
    consumptionRecords: store.consumptionRecords, 
    suppliers: store.suppliers, 
    supplyTypes: store.supplyTypes, 
    adminSettings: store.adminSettings 
  });
  
  return saved;
};

/**
 * Update an existing supplier
 */
export const updateSupplier = (supplierId: string, data: Partial<Supplier>) => {
  const index = store.suppliers.findIndex(s => s.id === supplierId);
  if (index === -1) return false;
  
  store.suppliers[index] = {
    ...store.suppliers[index],
    ...data
  };
  
  const saved = saveData({ 
    manufacturers: store.manufacturers, 
    supplies: store.supplies, 
    consumptionRecords: store.consumptionRecords, 
    suppliers: store.suppliers, 
    supplyTypes: store.supplyTypes, 
    adminSettings: store.adminSettings 
  });
  
  return saved;
};

/**
 * Delete a supplier
 */
export const deleteSupplier = (supplierId: string) => {
  const index = store.suppliers.findIndex(s => s.id === supplierId);
  if (index === -1) return { success: false, error: 'supplier_not_found' };
  
  // Check if this supplier is used by any supply
  const usedInSupplies = store.supplies.some(s => s.supplierId === supplierId);
  if (usedInSupplies) {
    return { success: false, error: 'supplier_in_use' };
  }
  
  store.suppliers.splice(index, 1);
  
  const saved = saveData({ 
    manufacturers: store.manufacturers, 
    supplies: store.supplies, 
    consumptionRecords: store.consumptionRecords, 
    suppliers: store.suppliers, 
    supplyTypes: store.supplyTypes, 
    adminSettings: store.adminSettings 
  });
  
  return { success: saved, error: saved ? null : 'save_failed' };
};

/**
 * Get all suppliers
 */
export const getSuppliers = () => {
  return store.suppliers;
};

/**
 * Get a supplier by ID
 */
export const getSupplierById = (supplierId: string) => {
  return store.suppliers.find(s => s.id === supplierId);
};
