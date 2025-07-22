
import { MedicalSupply } from '@/types';
import { saveData } from '../../utils/storageUtils';
import { store } from '../store';

/**
 * Add a new medical supply
 */
export const addSupply = (supply: MedicalSupply) => {
  // Ensure supply has required fields
  const newSupply = {
    ...supply,
    id: supply.id || `supply_${Date.now()}`,
    status: supply.status || 'valid',
    createdAt: supply.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  store.supplies.push(newSupply);
  
  const saved = saveData({ 
    manufacturers: store.manufacturers, 
    supplies: store.supplies, 
    consumptionRecords: store.consumptionRecords, 
    suppliers: store.suppliers, 
    supplyTypes: store.supplyTypes, 
    adminSettings: store.adminSettings 
  });
  
  return saved ? newSupply : false;
};

/**
 * Update an existing medical supply
 */
export const updateSupply = (supplyId: string, data: Partial<MedicalSupply>) => {
  const index = store.supplies.findIndex(s => s.id === supplyId);
  if (index === -1) return false;
  
  store.supplies[index] = {
    ...store.supplies[index],
    ...data,
    updatedAt: new Date().toISOString()
  };
  
  // Update status based on quantity and expiry
  if (store.supplies[index].quantity <= 0) {
    store.supplies[index].status = 'empty';
  } else if (new Date(store.supplies[index].expiryDate) < new Date()) {
    store.supplies[index].status = 'expired';
  } else {
    store.supplies[index].status = 'valid';
  }
  
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
 * Delete a medical supply
 */
export const deleteSupply = (supplyId: string) => {
  const index = store.supplies.findIndex(s => s.id === supplyId);
  if (index === -1) return { success: false, error: 'supply_not_found' };
  
  // Check if this supply is used by any consumption record
  const usedInConsumption = store.consumptionRecords.some(record => 
    record.items.some(item => item.supplyId === supplyId)
  );
  
  if (usedInConsumption) {
    return { success: false, error: 'supply_in_use' };
  }
  
  store.supplies.splice(index, 1);
  
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
 * Get all medical supplies
 */
export const getSupplies = () => {
  return store.supplies;
};

/**
 * Get a medical supply by ID
 */
export const getSupplyById = (supplyId: string) => {
  return store.supplies.find(s => s.id === supplyId);
};

/**
 * Get medical supplies by type
 */
export const getSuppliesByType = (typeId: string) => {
  return store.supplies.filter(s => s.typeId === typeId);
};

/**
 * Get medical supplies by manufacturer
 */
export const getSuppliesByManufacturer = (manufacturerId: string) => {
  return store.supplies.filter(s => s.manufacturerId === manufacturerId);
};

/**
 * Get medical supplies by supplier
 */
export const getSuppliesBySupplier = (supplierId: string) => {
  return store.supplies.filter(s => s.supplierId === supplierId);
};

/**
 * Get expired medical supplies
 */
export const getExpiredSupplies = () => {
  return store.supplies.filter(s => s.status === 'expired');
};

/**
 * Get soon to expire medical supplies
 */
export const getSoonToExpireSupplies = (daysThreshold: number) => {
  const today = new Date();
  const threshold = new Date();
  threshold.setDate(today.getDate() + daysThreshold);
  
  return store.supplies.filter(s => {
    const expiryDate = new Date(s.expiryDate);
    return s.status === 'valid' && expiryDate <= threshold && expiryDate > today;
  });
};

/**
 * Get low stock medical supplies
 */
export const getLowStockSupplies = (threshold: number) => {
  return store.supplies.filter(s => 
    s.status === 'valid' && s.quantity > 0 && s.quantity <= threshold
  );
};
