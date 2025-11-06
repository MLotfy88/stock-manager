
import React from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { deleteInventoryItem } from '@/data/operations/suppliesOperations';
import { useToast } from '@/components/ui/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { Clock, Calendar, Package2, Tag, Building2, Truck, Trash2 } from 'lucide-react';
import { InventoryItem } from '@/types';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

// Define a more specific type for the enriched supply item
type EnrichedSupplyItem = InventoryItem & {
  name: string;
  manufacturerName: string;
  supplierName?: string;
};

interface SupplyCardProps {
  supply: EnrichedSupplyItem;
  onDelete?: () => void;
}

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'expired':
      return 'bg-destructive text-destructive-foreground';
    case 'expiring_soon':
      return 'bg-warning text-warning-foreground';
    default:
      return 'bg-primary text-primary-foreground';
  }
};

const SupplyCard: React.FC<SupplyCardProps> = ({ supply, onDelete }) => {
  const { t, direction } = useLanguage();
  const { toast } = useToast();
  
  const handleDelete = async () => {
    try {
      const result = await deleteInventoryItem(supply.id);
      
      if (result.success) {
        toast({
          title: t('success'),
          description: t('item_deleted'),
        });
        if (onDelete) {
          onDelete();
        }
      } else {
        // Handle specific errors returned from the operation
        const errorMessage = result.error === 'item_in_use'
          ? t('error_item_in_use')
          : t('error_deleting_item');
        
        toast({
          title: t('error'),
          description: errorMessage,
          variant: "destructive",
        });
      }
    } catch (error) {
      // Handle unexpected errors (e.g., network issues)
      toast({
        title: t('error'),
        description: t('error_deleting_item'),
        variant: "destructive",
      });
    }
  };
  
  return (
    <Card className="overflow-hidden hover:bg-muted/50 transition-colors duration-200">
      <CardContent className="p-3 flex items-center gap-3">
        <div className={`w-1.5 h-12 rounded-full ${getStatusColor(supply.status)}`}></div>
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <h3 className="font-medium text-sm line-clamp-1">{supply.name}</h3>
            <div className="text-xs font-bold">
              {supply.quantity} <span className="text-muted-foreground font-normal">{t('units')}</span>
            </div>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {supply.variant} &bull; {supply.manufacturerName}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs font-semibold">
            {format(new Date(supply.expiry_date), 'MMM yyyy')}
          </div>
          <div className="text-xs text-muted-foreground">
            {t('expiry_date')}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SupplyCard;
