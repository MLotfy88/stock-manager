
// Re-exporting functions from various operations files
export * from './adminOperations';
export * from './consumptionOperations';
export * from './manufacturerOperations';

// Re-exporting from supplierOperations
export * from './supplierOperations';

// Re-exporting from suppliesOperations
export * from './suppliesOperations';

// Re-exporting from supplyTypeOperations
export * from './supplyTypeOperations';

// Selectively re-exporting from statsOperations to avoid naming conflicts
export {
  getTotalSuppliesCount,
  getValidSuppliesCount,
  getExpiredSuppliesCount,
  getSoonToExpireSuppliesCount,
  getSoonToExpireSupplies,
  getEmptySuppliesCount,
  getTotalInventoryValue,
  getInventoryValueByType,
  getInventoryQuantityByType,
  getConsumptionByDepartment,
  getConsumptionByMonth,
  getConsumptionByPurpose,
  calculateExpiryStats,
  calculateInventoryStats,
  calculateConsumptionStats,
  getInventorySummary,
  // Use a different name for the re-export to avoid ambiguity
  getSoonToExpireSupplies as getExpiringSuppliesFromStats
} from './statsOperations';
