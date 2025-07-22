// هذا الملف يعمل كواجهة للعمليات والبيانات المرتبطة بالتطبيق

// استيراد البيانات من المخزن المركزي
import { store } from './store';

// استيراد جميع العمليات للتصدير
import {
  addManufacturer,
  updateManufacturer,
  deleteManufacturer,
  getManufacturers,
  getManufacturerById
} from './operations/manufacturerOperations';

import {
  addSupplier,
  updateSupplier,
  deleteSupplier,
  getSuppliers,
  getSupplierById
} from './operations/supplierOperations';

import {
  addSupplyType,
  updateSupplyType,
  deleteSupplyType,
  getSupplyTypes,
  getSupplyTypeById
} from './operations/supplyTypeOperations';

import {
  addSupply,
  updateSupply,
  deleteSupply,
  getSupplies,
  getSupplyById,
  getSuppliesByType,
  getSuppliesByManufacturer,
  getSuppliesBySupplier,
  getExpiredSupplies,
  getSoonToExpireSupplies,
  getLowStockSupplies
} from './operations/suppliesOperations';

import {
  addConsumptionRecord,
  getConsumptionRecords,
  getConsumptionRecordById,
  getConsumptionRecordsByDepartment,
  getConsumptionRecordsByDateRange
} from './operations/consumptionOperations';

import {
  getTotalSuppliesCount,
  getValidSuppliesCount,
  getExpiredSuppliesCount,
  getEmptySuppliesCount,
  getTotalInventoryValue,
  getInventoryValueByType,
  getInventoryQuantityByType,
  getConsumptionByDepartment,
  getConsumptionByMonth,
  getConsumptionByPurpose
} from './operations/statsOperations';

import {
  updateAdminSettings,
  importDataFromExcel
} from './operations/adminOperations';

// Supply type translations for UI
export const supplyTypeTranslations = {
  medicine: 'الأدوية',
  medical_supply: 'مستلزمات طبية',
  equipment: 'أجهزة طبية',
  consumable: 'مستهلكات طبية',
  lab_supply: 'مستلزمات معملية',
  surgical_supply: 'مستلزمات جراحية',
  dental_supply: 'مستلزمات أسنان',
  other: 'أخرى'
};

// Calculate dashboard stats function
export const calculateDashboardStats = (filter: string = 'all') => {
  // Count soon to expire supplies (we'll use getSoonToExpireSupplies)
  const soonToExpireSupplies = getSoonToExpireSupplies().length;
  
  // Get type counts
  const supplies = getSupplies();
  const typeCounts = {};
  supplies.forEach(supply => {
    if (!typeCounts[supply.type]) {
      typeCounts[supply.type] = 0;
    }
    typeCounts[supply.type]++;
  });
  
  return {
    totalSupplies: getTotalSuppliesCount(),
    validSupplies: getValidSuppliesCount(),
    expiredSupplies: getExpiredSuppliesCount(),
    expiringSupplies: soonToExpireSupplies, // Added missing property
    emptySupplies: getEmptySuppliesCount(),
    totalValue: getTotalInventoryValue(),
    byType: getInventoryValueByType(),
    quantityByType: getInventoryQuantityByType(),
    consumptionByDepartment: getConsumptionByDepartment(),
    consumptionByMonth: getConsumptionByMonth(),
    consumptionByPurpose: getConsumptionByPurpose(),
    typeCounts: typeCounts // Added missing property
  };
};

// Function to delete consumption records
export const deleteConsumptionRecord = (recordId: string) => {
  const index = store.consumptionRecords.findIndex(r => r.id === recordId);
  if (index === -1) return { success: false, error: 'record_not_found' };
  
  store.consumptionRecords.splice(index, 1);
  
  // Save data to localStorage
  const { saveData } = require('../utils/storageUtils');
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

// تصدير البيانات المباشرة من المخزن للوصول المباشر
export const manufacturers = store.manufacturers;
export const supplies = store.supplies;
export const consumptionRecords = store.consumptionRecords;
export const suppliers = store.suppliers;
export const supplyTypes = store.supplyTypes;
export const adminSettings = store.adminSettings;

// تصدير جميع العمليات
export {
  // عمليات الشركات المصنعة
  addManufacturer,
  updateManufacturer,
  deleteManufacturer,
  getManufacturers,
  getManufacturerById,
  
  // عمليات الموردين
  addSupplier,
  updateSupplier,
  deleteSupplier,
  getSuppliers,
  getSupplierById,
  
  // عمليات أنواع المستلزمات
  addSupplyType,
  updateSupplyType,
  deleteSupplyType,
  getSupplyTypes,
  getSupplyTypeById,
  
  // عمليات المستلزمات
  addSupply,
  updateSupply,
  deleteSupply,
  getSupplies,
  getSupplyById,
  getSuppliesByType,
  getSuppliesByManufacturer,
  getSuppliesBySupplier,
  getExpiredSupplies,
  getSoonToExpireSupplies,
  getLowStockSupplies,
  
  // عمليات سجلات الاستهلاك
  addConsumptionRecord,
  getConsumptionRecords,
  getConsumptionRecordById,
  getConsumptionRecordsByDepartment,
  getConsumptionRecordsByDateRange,
  
  // عمليات الإحصائيات
  getTotalSuppliesCount,
  getValidSuppliesCount,
  getExpiredSuppliesCount,
  getEmptySuppliesCount,
  getTotalInventoryValue,
  getInventoryValueByType,
  getInventoryQuantityByType,
  getConsumptionByDepartment,
  getConsumptionByMonth,
  getConsumptionByPurpose,
  
  // عمليات الإدارة
  updateAdminSettings,
  importDataFromExcel
};
