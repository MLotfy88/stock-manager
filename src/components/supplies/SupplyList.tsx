
import React, { useState, useEffect } from 'react';
import SupplyCard from './SupplyCard';
import { InventoryItem, ProductDefinition, Manufacturer } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { getInventoryItems } from '@/data/operations/suppliesOperations';
import { getProductDefinitions } from '@/data/operations/productDefinitionOperations';
import { getManufacturers } from '@/data/operations/manufacturerOperations';

interface SupplyListProps {
  title: string;
  status?: 'all' | 'valid' | 'expiring_soon' | 'expired';
  limit?: number;
}

const SupplyList: React.FC<SupplyListProps> = ({ 
  title, 
  status = 'all',
  limit
}) => {
  const { t } = useLanguage();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [productDefs, setProductDefs] = useState<ProductDefinition[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [inventoryData, defsData, manufacturersData] = await Promise.all([
          getInventoryItems(),
          getProductDefinitions(),
          getManufacturers(),
        ]);
        setInventory(inventoryData);
        setProductDefs(defsData);
        setManufacturers(manufacturersData);
      } catch (error) {
        console.error("Failed to fetch supply list data", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);
  
  const filteredSupplies = React.useMemo(() => {
    let filtered = [...inventory];
    
    if (status !== 'all') {
      filtered = filtered.filter(item => item.status === status);
    }
    
    // Sort by expiry date (earliest first)
    filtered.sort((a, b) => {
      const dateA = new Date(a.expiry_date).getTime();
      const dateB = new Date(b.expiry_date).getTime();
      return dateA - dateB;
    });
    
    if (limit) {
      filtered = filtered.slice(0, limit);
    }
    
    return filtered.map(item => {
      const def = productDefs.find(d => d.id === item.product_definition_id);
      const manufacturer = manufacturers.find(m => m.id === item.manufacturer_id);
      return {
        ...item,
        name: def?.name || 'N/A',
        manufacturerName: manufacturer?.name || 'N/A',
      }
    });
  }, [inventory, productDefs, manufacturers, status, limit]);
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">{title}</h2>
        {filteredSupplies.length > 0 && (
          <button className="text-primary text-sm font-medium hover:underline">
            {t('view_all')}
          </button>
        )}
      </div>
      
      {isLoading ? (
        <div className="bg-muted/50 rounded-lg p-8 text-center">
          <p className="text-muted-foreground">{t('loading')}</p>
        </div>
      ) : filteredSupplies.length === 0 ? (
        <div className="bg-muted/50 rounded-lg p-8 text-center">
          <p className="text-muted-foreground">{t('no_supplies')}</p>
        </div>
      ) : (
        <div className="card-grid">
          {filteredSupplies.map((supply) => (
            <SupplyCard key={supply.id} supply={supply} />
          ))}
        </div>
      )}
    </div>
  );
};

export default SupplyList;
