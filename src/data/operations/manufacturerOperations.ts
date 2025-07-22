
import { Manufacturer } from '@/types';
import { saveData } from '../../utils/storageUtils';
import { store } from '../store';

/**
 * Add a new manufacturer
 */
export const addManufacturer = (manufacturer: Manufacturer) => {
  store.manufacturers.push(manufacturer);
  
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
 * Update an existing manufacturer
 */
export const updateManufacturer = (manufacturerId: string, data: Partial<Manufacturer>) => {
  const index = store.manufacturers.findIndex(m => m.id === manufacturerId);
  if (index === -1) return false;
  
  store.manufacturers[index] = {
    ...store.manufacturers[index],
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
 * Delete a manufacturer
 */
export const deleteManufacturer = (manufacturerId: string) => {
  const index = store.manufacturers.findIndex(m => m.id === manufacturerId);
  if (index === -1) return { success: false, error: 'manufacturer_not_found' };
  
  // Check if this manufacturer is used by any supply
  const usedInSupplies = store.supplies.some(s => s.manufacturerId === manufacturerId);
  if (usedInSupplies) {
    return { success: false, error: 'manufacturer_in_use' };
  }
  
  store.manufacturers.splice(index, 1);
  
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
 * Get all manufacturers
 */
export const getManufacturers = () => {
  return store.manufacturers;
};

/**
 * Get a manufacturer by ID
 */
export const getManufacturerById = (manufacturerId: string) => {
  return store.manufacturers.find(m => m.id === manufacturerId);
};
