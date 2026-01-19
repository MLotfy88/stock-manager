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
import { cn } from '@/lib/utils';
import { MobileSupplyItemCard } from '@/components/supplies/MobileSupplyItemCard';

interface ConsumptionItemsTableProps {
  items: (Partial<ConsumptionItem> & { id: string; availableQuantity?: number })[];
  handleItemChange: (itemId: string, field: keyof ConsumptionItem, value: any) => void;
  removeItem: (itemId: string) => void;
  startScan: (itemId: string, continuous?: boolean) => void;
  availableSupplies: InventoryItem[];
  productDefs: ProductDefinition[];
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
    <div>
      {/* Desktop Table */}
      <div className="overflow-x-auto hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[150px]">{t('barcode')}</TableHead>
              <TableHead className="w-[150px]">GTIN</TableHead>
              <TableHead className="w-[120px]">{t('batch_number')}</TableHead>
              <TableHead className="w-[120px]">{t('expiry_date')}</TableHead>
              <TableHead>{t('product')}</TableHead>
              <TableHead className="text-center w-[80px]">{t('available_quantity')}</TableHead>
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
                <TableRow key={item.id} className="transition-colors">
                  {/* 1. Barcode */}
                  <TableCell className="p-2">
                    <div className="flex items-center gap-1">
                      <Input
                        value={selectedSupply?.barcode || ''}
                        readOnly
                        placeholder={t('barcode')}
                        className="font-mono text-xs h-8 bg-muted/30"
                      />
                      <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => startScan(item.id)}>
                        <ScanBarcode className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>

                  {/* 2. GTIN */}
                  <TableCell className="p-2">
                    <Input
                      value={selectedSupply?.gtin || ''}
                      readOnly
                      placeholder="GTIN"
                      className="font-mono text-xs h-8 bg-muted/30"
                    />
                  </TableCell>

                  {/* 3. LOT */}
                  <TableCell className="p-2">
                    <Input
                      value={selectedSupply?.batch_number || ''}
                      readOnly
                      placeholder="LOT"
                      className="font-mono text-xs h-8 bg-muted/30"
                    />
                  </TableCell>

                  {/* 4. Expiry */}
                  <TableCell className="p-2">
                    <Input
                      value={selectedSupply ? format(new Date(selectedSupply.expiry_date), 'yyyy-MM-dd') : ''}
                      readOnly
                      placeholder={t('expiry_date')}
                      className="text-xs h-8 bg-muted/30"
                    />
                  </TableCell>

                  {/* 5. Product (Choice) */}
                  <TableCell className="p-2">
                    <Select
                      value={item.inventory_item_id || undefined}
                      onValueChange={(value) => handleItemChange(item.id, 'inventory_item_id', value)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder={t('select_supply')} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSupplies.filter(s => s.id && s.id.trim() !== '').map(supply => {
                          const def = productDefs.find(p => p.id === supply.product_definition_id);
                          return (
                            <SelectItem key={supply.id} value={supply.id}>
                              {def?.name || '...'} - {supply.variant} (LOT: {supply.batch_number})
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </TableCell>

                  {/* 6. Available */}
                  <TableCell className="text-center p-2">
                    {selectedSupply && <Badge variant="secondary" className="text-xs">{selectedSupply.quantity}</Badge>}
                  </TableCell>

                  {/* 7. Quantity */}
                  <TableCell className="p-2">
                    <Input
                      type="number"
                      min="1"
                      max={selectedSupply?.quantity || undefined}
                      value={item.quantity || ''}
                      onChange={(e) => handleItemChange(item.id, 'quantity', parseInt(e.target.value) || 1)}
                      className={cn("h-8 text-xs font-bold", isExceeded && "border-destructive")}
                    />
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="p-2 text-right">
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeItem(item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {items.map((item) => {
          const selectedSupply = availableSupplies.find(s => s.id === item.inventory_item_id);
          const productDef = selectedSupply ? productDefs.find(p => p.id === selectedSupply.product_definition_id) : null;
          const isExceeded = item.quantity && item.availableQuantity ? item.quantity > item.availableQuantity : false;

          return (
            <MobileSupplyItemCard
              key={item.id}
              itemId={item.id}
              onScan={() => startScan(item.id, false)}
              onRemove={() => removeItem(item.id)}
              canRemove={items.length > 0}
            >
              <div className="space-y-4">
                {/* 1 & 2: Barcode & GTIN (Display Only) */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase text-muted-foreground">{t('barcode')}</p>
                    <p className="font-mono text-xs">{selectedSupply?.barcode || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase text-muted-foreground">GTIN</p>
                    <p className="font-mono text-xs">{selectedSupply?.gtin || '-'}</p>
                  </div>
                </div>

                {/* 3 & 4: LOT & Expiry (Display Only) */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase text-muted-foreground">LOT</p>
                    <p className="font-mono text-xs">{selectedSupply?.batch_number || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase text-muted-foreground">{t('expiry_date')}</p>
                    <p className="text-xs">{selectedSupply ? format(new Date(selectedSupply.expiry_date), 'yyyy-MM-dd') : '-'}</p>
                  </div>
                </div>

                <div className="border-t pt-2 my-1 border-dashed" />

                {/* 5: Product Selection */}
                <div className="space-y-1">
                  <p className="text-[10px] uppercase text-muted-foreground">{t('product')}</p>
                  <Select
                    value={item.inventory_item_id || undefined}
                    onValueChange={(value) => handleItemChange(item.id, 'inventory_item_id', value)}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder={t('select_supply')} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSupplies.filter(s => s.id && s.id.trim() !== '').map(supply => {
                        const def = productDefs.find(p => p.id === supply.product_definition_id);
                        return (
                          <SelectItem key={supply.id} value={supply.id}>
                            {def?.name || '...'} - {supply.variant} (LOT: {supply.batch_number})
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* 6 & 7: Available & Quantity */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase text-muted-foreground">{t('available_quantity')}</p>
                    <p><Badge variant="secondary" className="text-xs">{selectedSupply?.quantity || 0}</Badge></p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase text-muted-foreground">{t('quantity')}</p>
                    <Input
                      type="number"
                      min="1"
                      max={selectedSupply?.quantity || undefined}
                      value={item.quantity || ''}
                      onChange={(e) => handleItemChange(item.id, 'quantity', parseInt(e.target.value) || 1)}
                      className={cn("h-9 text-xs font-bold", isExceeded && "border-destructive")}
                      placeholder={t('quantity')}
                    />
                  </div>
                </div>
              </div>
            </MobileSupplyItemCard>
          );
        })}
      </div>
    </div>
  );
};

export default ConsumptionItemsTable;
