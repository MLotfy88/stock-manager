import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Package, Tag, Calendar, Hash, DollarSign, Truck, FileText, Barcode } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { InventoryItem } from '@/types';
import { format } from 'date-fns';

type EnrichedInventoryItem = InventoryItem & {
  name: string;
  typeName: string;
  storeName: string;
  supplierName?: string;
};

interface DetailedSupplyCardProps {
  supply: EnrichedInventoryItem;
}

const DetailedSupplyCard: React.FC<DetailedSupplyCardProps> = ({ supply }) => {
  const { t } = useLanguage();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'valid':
        return <Badge variant="default" className="bg-green-500 text-white">{t('status_valid')}</Badge>;
      case 'expiring_soon':
        return <Badge variant="destructive" className="bg-yellow-500 text-white">{t('status_expiring_soon')}</Badge>;
      case 'expired':
        return <Badge variant="destructive">{t('status_expired')}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <Card className="w-full overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="bg-gray-50 p-4 border-b">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg font-bold text-gray-800">{supply.name}</CardTitle>
            <p className="text-sm text-muted-foreground">{supply.variant}</p>
          </div>
          {getStatusBadge(supply.status)}
        </div>
      </CardHeader>
      <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
        <div className="flex items-center gap-3">
          <Package className="h-5 w-5 text-gray-500" />
          <div>
            <p className="font-semibold">{t('quantity')}</p>
            <p>{supply.quantity}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Tag className="h-5 w-5 text-gray-500" />
          <div>
            <p className="font-semibold">{t('supply_type')}</p>
            <p>{supply.typeName}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Building2 className="h-5 w-5 text-gray-500" />
          <div>
            <p className="font-semibold">{t('manufacturer')}</p>
            <p>{supply.manufacturer_name || t('unknown_manufacturer')}</p>
          </div>
        </div>
        {supply.supplierName && (
          <div className="flex items-center gap-3">
            <Truck className="h-5 w-5 text-gray-500" />
            <div>
              <p className="font-semibold">{t('supplier')}</p>
              <p>{supply.supplierName}</p>
            </div>
          </div>
        )}
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-gray-500" />
          <div>
            <p className="font-semibold">{t('expiry_date')}</p>
            <p>{format(new Date(supply.expiry_date), 'PPP')}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Hash className="h-5 w-5 text-gray-500" />
          <div>
            <p className="font-semibold">{t('batch_number')}</p>
            <p>{supply.batch_number}</p>
          </div>
        </div>
        {supply.purchase_price && (
          <div className="flex items-center gap-3">
            <DollarSign className="h-5 w-5 text-gray-500" />
            <div>
              <p className="font-semibold">{t('purchase_price')}</p>
              <p>{supply.purchase_price}</p>
            </div>
          </div>
        )}
        {supply.barcode && (
          <div className="flex items-center gap-3">
            <Barcode className="h-5 w-5 text-gray-500" />
            <div>
              <p className="font-semibold">{t('barcode')}</p>
              <p>{supply.barcode}</p>
            </div>
          </div>
        )}
        {supply.notes && (
          <div className="md:col-span-2 lg:col-span-3 flex items-start gap-3">
            <FileText className="h-5 w-5 text-gray-500 mt-1" />
            <div>
              <p className="font-semibold">{t('notes')}</p>
              <p className="text-muted-foreground whitespace-pre-wrap">{supply.notes}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DetailedSupplyCard;
