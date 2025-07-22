import React, { useState, useMemo } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { useMediaQuery } from '@/hooks/use-mobile';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProductDefinition, InventoryItem } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// MOCK DATA
const MOCK_PRODUCT_DEFINITIONS: ProductDefinition[] = [
  { id: '1', name: 'Diagnostic Catheter', typeId: 'catheter', barcode: '111', variantLabel: 'Curve', variants: [{name: 'L3.5', reorderPoint: 5}, {name: 'L4', reorderPoint: 5}], createdAt: '', updatedAt: '' },
  { id: '2', name: 'Balloons', typeId: 'consumable', barcode: '222', variantLabel: 'Size', variants: [{name: '2.5x10', reorderPoint: 10}, {name: '3.0x15', reorderPoint: 8}], createdAt: '', updatedAt: '' },
];
const MOCK_INVENTORY: InventoryItem[] = [
    { id: 'inv1', productDefinitionId: '1', variant: 'L3.5', quantity: 4, storeId: '1', manufacturerId: '1', batchNumber: 'B1', expiryDate: '2025-12-31', status: 'valid', createdAt: '', updatedAt: '' },
    { id: 'inv2', productDefinitionId: '2', variant: '2.5x10', quantity: 12, storeId: '1', manufacturerId: '2', batchNumber: 'B2', expiryDate: '2026-01-31', status: 'valid', createdAt: '', updatedAt: '' },
    { id: 'inv3', productDefinitionId: '1', variant: 'L4', quantity: 8, storeId: '2', manufacturerId: '1', batchNumber: 'B3', expiryDate: '2025-11-30', status: 'valid', createdAt: '', updatedAt: '' },
    { id: 'inv4', productDefinitionId: '2', variant: '3.0x15', quantity: 3, storeId: '1', manufacturerId: '2', batchNumber: 'B4', expiryDate: '2026-02-28', status: 'valid', createdAt: '', updatedAt: '' },
];
// END MOCK DATA

interface ReorderItem {
    productName: string;
    variantName: string;
    currentStock: number;
    reorderPoint: number;
}

const ReorderPointReportPage = () => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { t, direction } = useLanguage();

  const reorderItems = useMemo(() => {
    const stockMap: { [key: string]: number } = {};
    MOCK_INVENTORY.forEach(item => {
        const key = `${item.productDefinitionId}-${item.variant}`;
        stockMap[key] = (stockMap[key] || 0) + item.quantity;
    });

    const itemsToReorder: ReorderItem[] = [];
    MOCK_PRODUCT_DEFINITIONS.forEach(def => {
        def.variants.forEach(variant => {
            const key = `${def.id}-${variant.name}`;
            const currentStock = stockMap[key] || 0;
            if (currentStock <= variant.reorderPoint) {
                itemsToReorder.push({
                    productName: def.name,
                    variantName: variant.name,
                    currentStock,
                    reorderPoint: variant.reorderPoint,
                });
            }
        });
    });

    return itemsToReorder;
  }, []);

  return (
    <div className="page-container bg-background" dir={direction}>
      <Header />
      <Sidebar />
      <main className={`${isMobile ? 'px-4' : direction === 'rtl' ? 'pr-72 pl-8' : 'pl-72 pr-8'} transition-all`}>
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">{t('reorder_point_report')}</h1>
          <Card>
            <CardHeader>
              <CardTitle>{t('items_below_reorder_point')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('product')}</TableHead>
                    <TableHead>{t('variant')}</TableHead>
                    <TableHead className="text-center">{t('current_stock')}</TableHead>
                    <TableHead className="text-center">{t('reorder_point')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reorderItems.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.productName}</TableCell>
                      <TableCell>{item.variantName}</TableCell>
                      <TableCell className="text-center">{item.currentStock}</TableCell>
                      <TableCell className="text-center">{item.reorderPoint}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default ReorderPointReportPage;
