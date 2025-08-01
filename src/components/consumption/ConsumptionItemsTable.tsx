import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Trash2, ScanBarcode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ConsumptionItem, InventoryItem, ProductDefinition } from '@/types';
import { format } from 'date-fns';

interface ConsumptionItemsTableProps {
  items: (Partial<ConsumptionItem> & { id: string; availableQuantity?: number })[];
  handleItemChange: (itemId: string, field: keyof ConsumptionItem, value: any) => void;
  removeItem: (itemId: string) => void;
  startScan: (itemId: string) => void;
  availableSupplies: InventoryItem[];
  productDefs: ProductDefinition[];
  isScanning: boolean;
  activeScannerId: string | null;
  stopScan: () => void;
}

const ConsumptionItemsTable: React.FC<ConsumptionItemsTableProps> = ({
  items,
  handleItemChange,
  removeItem,
  startScan,
  availableSupplies,
  productDefs,
}) => {
  const { t } = useLanguage();

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader className="hidden md:table-header-group">
          <TableRow>
            <TableHead className="w-[250px]">{t('product')}</TableHead>
            <TableHead>{t('batch_number')}</TableHead>
            <TableHead>{t('expiry_date')}</TableHead>
            <TableHead className="text-center">{t('available_quantity')}</TableHead>
            <TableHead className="w-[100px]">{t('quantity')}</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const selectedSupply = availableSupplies.find(s => s.id === item.inventory_item_id);
            const productDef = selectedSupply ? productDefs.find(p => p.id === selectedSupply.product_definition_id) : null;
            const isExceeded = item.quantity && item.availableQuantity ? item.quantity > item.availableQuantity : false;

            return (
              <TableRow key={item.id} className="flex flex-col md:table-row mb-4 md:mb-0 border md:border-none rounded-lg md:rounded-none">
                <TableCell className="min-w-[300px] p-2 md:p-4" data-label={t('product')}>
                  <div className="flex items-center gap-2">
                    <Select
                      value={item.inventory_item_id}
                      onValueChange={(value) => handleItemChange(item.id, 'inventory_item_id', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('select_supply')} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSupplies.map(supply => {
                          const def = productDefs.find(p => p.id === supply.product_definition_id);
                          return (
                            <SelectItem key={supply.id} value={supply.id}>
                              {def?.name || '...'} - {supply.variant} (Batch: {supply.batch_number})
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                     <Button type="button" size="icon" variant="ghost" onClick={() => startScan(item.id)}><ScanBarcode className="h-5 w-5" /></Button>
                  </div>
                </TableCell>
                <TableCell className="p-2 md:p-4" data-label={t('batch_number')}>{selectedSupply?.batch_number || '-'}</TableCell>
                <TableCell className="p-2 md:p-4" data-label={t('expiry_date')}>{selectedSupply ? format(new Date(selectedSupply.expiry_date), 'yyyy-MM-dd') : '-'}</TableCell>
                <TableCell className="text-center p-2 md:p-4" data-label={t('available_quantity')}>
                  {selectedSupply && <Badge variant="secondary">{selectedSupply.quantity}</Badge>}
                </TableCell>
                <TableCell className="p-2 md:p-4" data-label={t('quantity')}>
                  <Input
                    type="number"
                    min="1"
                    max={selectedSupply?.quantity || undefined}
                    value={item.quantity || ''}
                    onChange={(e) => handleItemChange(item.id, 'quantity', parseInt(e.target.value) || 1)}
                    className={isExceeded ? "border-destructive" : ""}
                  />
                </TableCell>
                <TableCell className="p-2 md:p-4 text-right">
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(item.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
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
