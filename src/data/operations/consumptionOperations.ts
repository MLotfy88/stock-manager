
import { ConsumptionRecord } from '@/types';
import { saveData } from '../../utils/storageUtils';
import { store } from '../store';

/**
 * Add a new consumption record
 */
export const addConsumptionRecord = (record: ConsumptionRecord) => {
  // Check if we have enough quantity for each item
  for (const item of record.items) {
    const supplyIndex = store.supplies.findIndex(s => s.id === item.supplyId);
    if (supplyIndex === -1) return false;
    
    if (store.supplies[supplyIndex].quantity < item.quantity) {
      return false;
    }
  }
  
  // Add the record
  const newRecord = {
    ...record,
    id: `consumption_${Date.now()}`,
    createdAt: new Date().toISOString()
  };
  
  store.consumptionRecords.push(newRecord);
  
  // Update supplies quantities
  for (const item of record.items) {
    const supplyIndex = store.supplies.findIndex(s => s.id === item.supplyId);
    if (supplyIndex !== -1) {
      store.supplies[supplyIndex].quantity -= item.quantity;
      
      // Mark as empty if quantity is 0
      if (store.supplies[supplyIndex].quantity <= 0) {
        store.supplies[supplyIndex].status = 'empty';
      }
    }
  }
  
  const saved = saveData({ 
    manufacturers: store.manufacturers, 
    supplies: store.supplies, 
    consumptionRecords: store.consumptionRecords, 
    suppliers: store.suppliers, 
    supplyTypes: store.supplyTypes, 
    adminSettings: store.adminSettings 
  });
  
  return saved ? newRecord : false;
};

/**
 * Get all consumption records
 */
export const getConsumptionRecords = () => {
  return store.consumptionRecords;
};

/**
 * Get a consumption record by ID
 */
export const getConsumptionRecordById = (recordId: string) => {
  return store.consumptionRecords.find(r => r.id === recordId);
};

/**
 * Get consumption records for a specific department
 */
export const getConsumptionRecordsByDepartment = (department: string) => {
  return store.consumptionRecords.filter(r => r.department === department);
};

/**
 * Get consumption records for a specific date range
 */
export const getConsumptionRecordsByDateRange = (startDate: string, endDate: string) => {
  return store.consumptionRecords.filter(r => {
    const recordDate = new Date(r.date);
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return recordDate >= start && recordDate <= end;
  });
};
