
import { MedicalSupply, Manufacturer, ConsumptionRecord, Supplier, SupplyTypeItem } from '../types';

// localStorage key for data
export const localStorageKey = 'medicalSuppliesData';

/**
 * Save data to localStorage
 */
export const saveData = (data: { 
  manufacturers: Manufacturer[], 
  supplies: MedicalSupply[],
  consumptionRecords: ConsumptionRecord[],
  suppliers: Supplier[],
  supplyTypes: SupplyTypeItem[],
  adminSettings: any
}) => {
  try {
    localStorage.setItem(localStorageKey, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Error saving data to localStorage:', error);
    return false;
  }
};

/**
 * Load data from localStorage
 */
export const loadData = (
  defaultManufacturers: Manufacturer[],
  defaultSupplies: MedicalSupply[],
  defaultConsumptionRecords: ConsumptionRecord[],
  defaultSuppliers: Supplier[],
  defaultSupplyTypes: SupplyTypeItem[],
  defaultAdminSettings: any
) => {
  try {
    const savedData = localStorage.getItem(localStorageKey);
    if (savedData) {
      const parsedData = JSON.parse(savedData);
      return {
        manufacturers: parsedData.manufacturers || defaultManufacturers,
        supplies: parsedData.supplies || defaultSupplies,
        consumptionRecords: parsedData.consumptionRecords || defaultConsumptionRecords,
        suppliers: parsedData.suppliers || defaultSuppliers,
        supplyTypes: parsedData.supplyTypes || defaultSupplyTypes,
        adminSettings: parsedData.adminSettings || defaultAdminSettings
      };
    }
  } catch (error) {
    console.error('Error loading data from localStorage:', error);
  }
  
  return {
    manufacturers: defaultManufacturers,
    supplies: defaultSupplies,
    consumptionRecords: defaultConsumptionRecords,
    suppliers: defaultSuppliers,
    supplyTypes: defaultSupplyTypes,
    adminSettings: defaultAdminSettings
  };
};
