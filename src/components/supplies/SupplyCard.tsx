
import React from 'react';
import { format } from 'date-fns';
import { MedicalSupply } from '@/types';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { deleteSupply } from '@/data/mockData';
import { useToast } from '@/components/ui/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { Clock, Calendar, Package2, Tag, Building2, Truck, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface SupplyCardProps {
  supply: MedicalSupply;
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
  
  const handleDelete = () => {
    // Fix: Remove the second argument here
    const success = deleteSupply(supply.id);
    
    if (success) {
      toast({
        title: t('success'),
        description: t('item_deleted'),
      });
      
      if (onDelete) {
        onDelete();
      }
    } else {
      toast({
        title: t('error'),
        description: t('error_deleting'),
        variant: "destructive",
      });
    }
  };
  
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow duration-300">
      <CardContent className="p-0">
        <div className="flex flex-col h-full">
          <div className="p-4 pb-2">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-medium text-base line-clamp-1">{supply.name}</h3>
              <Badge className={getStatusColor(supply.status)}>
                {t(supply.status)}
              </Badge>
            </div>
            
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Package2 className="h-4 w-4" />
                <span>{t(supply.type)}</span>
              </div>
              
              {supply.size && (
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  <span>{t('size')}: {supply.size}</span>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <span>{supply.manufacturerName}</span>
              </div>
              
              {supply.supplierName && (
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  <span>{supply.supplierName}</span>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{t('batch')}: {supply.batchNumber}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>
                  {t('expiry')}: {format(new Date(supply.expiryDate), 'yyyy-MM-dd')}
                </span>
              </div>
            </div>
          </div>
          
          <div className="mt-auto p-4 pt-2 flex items-center justify-between border-t">
            <div className="font-semibold">
              {t('quantity')}: {supply.quantity}
            </div>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('confirm_delete')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('confirm_delete_supply')}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                    {t('delete')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SupplyCard;
