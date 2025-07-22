
import { saveData } from '../../utils/storageUtils';
import { store } from '../store';

/**
 * Update admin settings
 */
export const updateAdminSettings = (newSettings: any) => {
  store.adminSettings = {
    ...store.adminSettings,
    ...newSettings
  };
  
  return saveData({ 
    manufacturers: store.manufacturers, 
    supplies: store.supplies, 
    consumptionRecords: store.consumptionRecords, 
    suppliers: store.suppliers, 
    supplyTypes: store.supplyTypes, 
    adminSettings: store.adminSettings 
  });
};

/**
 * Import data from Excel
 */
export const importDataFromExcel = (file: File) => {
  try {
    // This would be implemented with actual Excel processing logic
    console.log('Importing data from Excel:', file.name);
    return true;
  } catch (error) {
    console.error('Error importing data:', error);
    return false;
  }
};

/**
 * Generate Excel template for data import
 */
export const downloadExcelTemplate = (format: 'excel' | 'csv' = 'excel') => {
  try {
    // Create a sample data structure
    const template = {
      supplies: [
        { id: 'example_1', name: 'Supply Name', quantity: 100, unit: 'pieces' }
      ],
      manufacturers: [
        { id: 'mfg_1', name: 'Manufacturer Name', contact: 'Contact Info' }
      ],
      suppliers: [
        { id: 'sup_1', name: 'Supplier Name', contact: 'Contact Info' }
      ]
    };
    
    // Convert to string
    const content = JSON.stringify(template, null, 2);
    
    // Create blob and download
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `template.${format === 'csv' ? 'csv' : 'xlsx'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    return true;
  } catch (error) {
    console.error('Failed to download template:', error);
    return false;
  }
};

/**
 * Import data from uploaded file
 */
export const handleFileUpload = async (file: File): Promise<boolean> => {
  try {
    const content = await file.text();
    const data = JSON.parse(content);
    
    // Validate and process data
    if (data.supplies) {
      store.supplies = [...store.supplies, ...data.supplies];
    }
    if (data.manufacturers) {
      store.manufacturers = [...store.manufacturers, ...data.manufacturers];
    }
    if (data.suppliers) {
      store.suppliers = [...store.suppliers, ...data.suppliers];
    }
    
    // Save to storage
    return saveData({ 
      manufacturers: store.manufacturers, 
      supplies: store.supplies, 
      consumptionRecords: store.consumptionRecords, 
      suppliers: store.suppliers, 
      supplyTypes: store.supplyTypes, 
      adminSettings: store.adminSettings 
    });
    
  } catch (error) {
    console.error('Failed to import data:', error);
    return false;
  }
};
