
import { SupplyTypeItem } from '@/types';
import { saveData } from '../../utils/storageUtils';
import { store } from '../store';

/**
 * Add a new supply type
 */
export const addSupplyType = (supplyType: SupplyTypeItem) => {
  store.supplyTypes.push(supplyType);
  
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
 * Update an existing supply type
 */
export const updateSupplyType = (supplyTypeId: string, data: Partial<SupplyTypeItem>) => {
  const index = store.supplyTypes.findIndex(t => t.id === supplyTypeId);
  if (index === -1) return false;
  
  store.supplyTypes[index] = {
    ...store.supplyTypes[index],
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
 * Delete a supply type
 */
export const deleteSupplyType = (supplyTypeId: string) => {
  const index = store.supplyTypes.findIndex(t => t.id === supplyTypeId);
  if (index === -1) return { success: false, error: 'supply_type_not_found' };
  
  // Check if this supply type is used by any supply
  const usedInSupplies = store.supplies.some(s => s.typeId === supplyTypeId);
  if (usedInSupplies) {
    return { success: false, error: 'supply_type_in_use' };
  }
  
  store.supplyTypes.splice(index, 1);
  
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
 * Get all supply types
 */
export const getSupplyTypes = () => {
  return store.supplyTypes;
};

/**
 * Get a supply type by ID
 */
export const getSupplyTypeById = (supplyTypeId: string) => {
  return store.supplyTypes.find(t => t.id === supplyTypeId);
};
