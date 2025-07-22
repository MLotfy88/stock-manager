
import { 
  defaultManufacturers, 
  defaultSupplies, 
  defaultConsumptionRecords, 
  defaultSuppliers, 
  defaultSupplyTypes, 
  defaultAdminSettings 
} from './defaultData';
import { loadData } from '../utils/storageUtils';

// Load data from localStorage or use defaults
const data = loadData(
  defaultManufacturers,
  defaultSupplies,
  defaultConsumptionRecords,
  defaultSuppliers,
  defaultSupplyTypes,
  defaultAdminSettings
);

// Central data store
export const store = {
  manufacturers: data.manufacturers,
  supplies: data.supplies,
  consumptionRecords: data.consumptionRecords,
  suppliers: data.suppliers,
  supplyTypes: data.supplyTypes,
  adminSettings: data.adminSettings
};
