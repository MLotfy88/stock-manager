import React, { useState, useMemo } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { useMediaQuery } from '@/hooks/use-mobile';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Store, ProductDefinition, InventoryItem, Manufacturer } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// MOCK DATA
const MOCK_STORES: Store[] = [
    { id: '1', name: 'Main Store' },
    { id: '2', name: 'Cath Lab 1' },
];
const MOCK_MANUFACTURERS: Manufacturer[] = [
    { id: '1', name: 'Medtronic', alertPeriod: 30 },
    { id: '2', name: 'Boston Scientific', alertPeriod: 30 },
];
const MOCK_PRODUCT_DEFINITIONS: ProductDefinition[] = [
  { id: '1', name: 'Diagnostic Catheter', typeId: 'catheter', barcode: '111', variantLabel: 'Curve', variants: [{name: 'L3.5', reorderPoint: 5}, {name: 'L4', reorderPoint: 5}], createdAt: '', updatedAt: '' },
  { id: '2', name: 'Balloons', typeId: 'consumable', barcode: '222', variantLabel: 'Size', variants: [{name: '2.5x10', reorderPoint: 10}, {name: '3.0x15', reorderPoint: 8}], createdAt: '', updatedAt: '' },
];
const MOCK_INVENTORY: InventoryItem[] = [
    { id: 'inv1', productDefinitionId: '1', variant: 'L3.5', quantity: 10, storeId: '1', manufacturerId: '1', batchNumber: 'B1', expiryDate: '2025-12-31', status: 'valid', createdAt: '', updatedAt: '' },
    { id: 'inv2', productDefinitionId: '2', variant: '2.5x10', quantity: 5, storeId: '1', manufacturerId: '2', batchNumber: 'B2', expiryDate: '2026-01-31', status: 'valid', createdAt: '', updatedAt: '' },
    { id: 'inv3', productDefinitionId: '1', variant: 'L4', quantity: 8, storeId: '2', manufacturerId: '1', batchNumber: 'B3', expiryDate: '2025-11-30', status: 'valid', createdAt: '', updatedAt: '' },
    { id: 'inv4', productDefinitionId: '1', variant: 'L3.5', quantity: 3, storeId: '1', manufacturerId: '2', batchNumber: 'B4', expiryDate: '2026-02-28', status: 'valid', createdAt: '', updatedAt: '' },
];
// END MOCK DATA

type GroupBy = 'product' | 'manufacturer';

const InventoryReportPage = () => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { t, direction } = useLanguage();

  const [selectedStoreId, setSelectedStoreId] = useState<string>('all');
  const [groupBy, setGroupBy] = useState<GroupBy>('product');

  const filteredInventory = useMemo(() => {
    if (selectedStoreId === 'all') return MOCK_INVENTORY;
    return MOCK_INVENTORY.filter(item => item.storeId === selectedStoreId);
  }, [selectedStoreId]);

  const groupedData = useMemo(() => {
    const groups: { [key: string]: { name: string; items: { variant: string; quantity: number }[] } } = {};

    filteredInventory.forEach(item => {
      const productDef = MOCK_PRODUCT_DEFINITIONS.find(p => p.id === item.productDefinitionId);
      if (!productDef) return;

      let key = '';
      let groupName = '';

      if (groupBy === 'product') {
        key = productDef.id;
        groupName = productDef.name;
      } else if (groupBy === 'manufacturer') {
        const manufacturer = MOCK_MANUFACTURERS.find(m => m.id === item.manufacturerId);
        key = item.manufacturerId;
        groupName = manufacturer?.name || 'Unknown';
      }

      if (!groups[key]) {
        groups[key] = { name: groupName, items: [] };
      }
      
      const existingItem = groups[key].items.find(i => i.variant === item.variant);
      if (existingItem) {
        existingItem.quantity += item.quantity;
      } else {
        groups[key].items.push({ variant: item.variant, quantity: item.quantity });
      }
    });

    return Object.values(groups);
  }, [filteredInventory, groupBy]);

  return (
    <div className="page-container bg-background" dir={direction}>
      <Header />
      <Sidebar />
      <main className={`${isMobile ? 'px-4' : direction === 'rtl' ? 'pr-72 pl-8' : 'pl-72 pr-8'} transition-all`}>
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">{t('inventory_report')}</h1>
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>{t('stock_balance')}</CardTitle>
                <div className="flex gap-4">
                  <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
                    <SelectTrigger className="w-[180px]"><SelectValue placeholder={t('select_store')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('all_stores')}</SelectItem>
                      {MOCK_STORES.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={groupBy} onValueChange={(value) => setGroupBy(value as GroupBy)}>
                    <SelectTrigger className="w-[180px]"><SelectValue placeholder={t('group_by')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="product">{t('group_by_product')}</SelectItem>
                      <SelectItem value="manufacturer">{t('group_by_manufacturer')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {groupedData.map((group, index) => (
                <div key={index} className="mb-6">
                  <h2 className="text-lg font-semibold mb-2 p-2 bg-gray-100 rounded-md">{group.name}</h2>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{groupBy === 'product' ? t('variant') : t('product')}</TableHead>
                        <TableHead className="text-right">{t('quantity')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.items.map((item, itemIndex) => (
                        <TableRow key={itemIndex}>
                          <TableCell>{item.variant}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default InventoryReportPage;
