
import { store } from '../store';
import { MedicalSupply } from '@/types';

/**
 * Get total supplies count
 */
export const getTotalSuppliesCount = () => {
  return store.supplies.length;
};

/**
 * Get total valid supplies count
 */
export const getValidSuppliesCount = () => {
  return store.supplies.filter(s => s.status === 'valid').length;
};

/**
 * Get expired supplies count
 */
export const getExpiredSuppliesCount = () => {
  return store.supplies.filter(s => s.status === 'expired').length;
};

/**
 * Get soon to expire supplies count
 */
export const getSoonToExpireSuppliesCount = () => {
  return store.supplies.filter(s => s.status === 'expiring_soon').length;
};

/**
 * Get soon to expire supplies
 */
export const getSoonToExpireSupplies = () => {
  return store.supplies.filter(s => s.status === 'expiring_soon');
};

/**
 * Get empty supplies count
 */
export const getEmptySuppliesCount = () => {
  return store.supplies.filter(s => s.status === 'empty' || s.quantity <= 0).length;
};

/**
 * Get total inventory value
 */
export const getTotalInventoryValue = () => {
  return store.supplies.reduce((total, supply) => {
    return total + (supply.price * supply.quantity);
  }, 0);
};

/**
 * Get inventory value by type
 */
export const getInventoryValueByType = () => {
  const valueByType: Record<string, number> = {};
  
  for (const supply of store.supplies) {
    if (supply.status === 'valid' && supply.quantity > 0) {
      const typeId = supply.typeId;
      if (!valueByType[typeId]) {
        valueByType[typeId] = 0;
      }
      valueByType[typeId] += supply.price * supply.quantity;
    }
  }
  
  return valueByType;
};

/**
 * Get inventory quantity by type
 */
export const getInventoryQuantityByType = () => {
  const quantityByType: Record<string, number> = {};
  
  for (const supply of store.supplies) {
    if (supply.status === 'valid' && supply.quantity > 0) {
      const typeId = supply.typeId;
      if (!quantityByType[typeId]) {
        quantityByType[typeId] = 0;
      }
      quantityByType[typeId] += supply.quantity;
    }
  }
  
  return quantityByType;
};

/**
 * Get consumption by department
 */
export const getConsumptionByDepartment = () => {
  const consumptionByDepartment: Record<string, number> = {};
  
  for (const record of store.consumptionRecords) {
    const department = record.department;
    if (!consumptionByDepartment[department]) {
      consumptionByDepartment[department] = 0;
    }
    
    // Count total items consumed
    for (const item of record.items) {
      consumptionByDepartment[department] += item.quantity;
    }
  }
  
  return consumptionByDepartment;
};

/**
 * Get consumption by month
 */
export const getConsumptionByMonth = () => {
  const consumptionByMonth: Record<string, number> = {};
  
  for (const record of store.consumptionRecords) {
    const date = new Date(record.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!consumptionByMonth[monthKey]) {
      consumptionByMonth[monthKey] = 0;
    }
    
    // Count total items consumed
    for (const item of record.items) {
      consumptionByMonth[monthKey] += item.quantity;
    }
  }
  
  return consumptionByMonth;
};

/**
 * Get consumption by purpose
 */
export const getConsumptionByPurpose = () => {
  const consumptionByPurpose: Record<string, number> = {
    use: 0,
    expired: 0,
    damaged: 0
  };
  
  for (const record of store.consumptionRecords) {
    const purpose = record.purpose || 'use';
    
    // Count total items consumed
    for (const item of record.items) {
      consumptionByPurpose[purpose] += item.quantity;
    }
  }
  
  return consumptionByPurpose;
};

/**
 * Calculate expiry stats
 */
export const calculateExpiryStats = () => {
  const expired = getExpiredSuppliesCount();
  const expiring = getSoonToExpireSuppliesCount();
  const valid = getValidSuppliesCount();
  
  return {
    expired,
    expiring,
    valid,
    total: expired + expiring + valid
  };
};

/**
 * Calculate inventory stats
 */
export const calculateInventoryStats = () => {
  return {
    totalValue: getTotalInventoryValue(),
    valueByType: getInventoryValueByType(),
    quantityByType: getInventoryQuantityByType()
  };
};

/**
 * Calculate consumption stats
 */
export const calculateConsumptionStats = () => {
  return {
    byDepartment: getConsumptionByDepartment(),
    byMonth: getConsumptionByMonth(),
    byPurpose: getConsumptionByPurpose()
  };
};

/**
 * Get inventory summary
 */
export const getInventorySummary = () => {
  return {
    totalSupplies: getTotalSuppliesCount(),
    validSupplies: getValidSuppliesCount(),
    expiredSupplies: getExpiredSuppliesCount(),
    emptySuplies: getEmptySuppliesCount(),
    totalValue: getTotalInventoryValue()
  };
};
