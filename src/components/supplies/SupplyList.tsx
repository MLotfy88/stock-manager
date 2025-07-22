
import React from 'react';
import { supplies } from '@/data/mockData';
import SupplyCard from './SupplyCard';
import { MedicalSupply } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';

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
  
  const filteredSupplies = React.useMemo(() => {
    let filtered = [...supplies];
    
    if (status !== 'all') {
      filtered = filtered.filter(supply => supply.status === status);
    }
    
    // Sort by expiry date (earliest first)
    filtered.sort((a, b) => {
      const dateA = new Date(a.expiryDate).getTime();
      const dateB = new Date(b.expiryDate).getTime();
      return dateA - dateB;
    });
    
    if (limit) {
      filtered = filtered.slice(0, limit);
    }
    
    return filtered;
  }, [status, limit]);
  
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
      
      {filteredSupplies.length === 0 ? (
        <div className="bg-muted/50 rounded-lg p-8 text-center">
          <p className="text-muted-foreground">{t('no_supplies')}</p>
        </div>
      ) : (
        <div className="card-grid">
          {filteredSupplies.map((supply: MedicalSupply) => (
            <SupplyCard key={supply.id} supply={supply} />
          ))}
        </div>
      )}
    </div>
  );
};

export default SupplyList;
