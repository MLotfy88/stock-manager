
import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ConsumptionItem, MedicalSupply } from '@/types';

interface ConsumptionItemsTableProps {
  items: ConsumptionItem[];
  addItem: () => void;
  removeItem: (itemId: string) => void;
  updateItem: (itemId: string, field: keyof ConsumptionItem, value: any) => void;
  availableSupplies: MedicalSupply[];
}

const ConsumptionItemsTable: React.FC<ConsumptionItemsTableProps> = ({ 
  items, 
  addItem, 
  removeItem, 
  updateItem,
  availableSupplies
}) => {
  const { t } = useLanguage();

  if (items.length === 0) {
    return (
      <div className="text-center py-8 bg-muted/20 border border-dashed rounded-md">
        <p className="text-muted-foreground">{t('no_items_added')}</p>
        <Button 
          type="button" 
          variant="ghost" 
          size="sm" 
          className="mt-2"
          onClick={addItem}
        >
          <Plus className="h-4 w-4 mr-1" />
          {t('add_item')}
        </Button>
      </div>
    );
  }
  
  return (
    <div className="border rounded-md overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('supply')}</TableHead>
            <TableHead className="w-20">{t('quantity')}</TableHead>
            <TableHead className="w-40">{t('available')}</TableHead>
            <TableHead className="w-32">{t('actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const selectedSupply = availableSupplies.find(s => s.id === item.supplyId);
            const isExceeded = selectedSupply ? item.quantity > selectedSupply.quantity : false;
            
            return (
              <TableRow key={item.id}>
                <TableCell>
                  <Select value={item.supplyId} onValueChange={(value) => updateItem(item.id, 'supplyId', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('select_supply')} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSupplies.map(supply => (
                        <SelectItem key={supply.id} value={supply.id}>
                          {supply.name} ({supply.quantity} {t('available')})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Input 
                    type="number" 
                    min="1"
                    max={selectedSupply?.quantity || 999}
                    value={item.quantity} 
                    onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                    className={isExceeded ? "border-red-500" : ""}
                  />
                </TableCell>
                <TableCell>
                  {selectedSupply ? (
                    <div className="flex items-center">
                      <Badge variant={isExceeded ? "destructive" : "secondary"}>
                        {selectedSupply.quantity} {t('units')}
                      </Badge>
                      {isExceeded && (
                        <span className="text-destructive text-xs ml-2">
                          {t('exceeds_available')}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    className="text-destructive hover:text-destructive"
                    onClick={() => removeItem(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default ConsumptionItemsTable;
