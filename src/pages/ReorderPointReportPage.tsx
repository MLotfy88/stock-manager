import React, { useState, useMemo, useEffect } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { useMediaQuery } from '@/hooks/use-mobile';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProductDefinition, InventoryItem } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getProductDefinitions } from '@/data/operations/productDefinitionOperations';
import { getInventoryItems } from '@/data/operations/suppliesOperations';
import { Badge } from '@/components/ui/badge';

interface ReorderItem {
    productName: string;
    variantName: string;
    currentStock: number;
    reorderPoint: number;
}

const ReorderPointReportPage = () => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { t, direction } = useLanguage();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [productDefs, setProductDefs] = useState<ProductDefinition[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [defsData, inventoryData] = await Promise.all([
          getProductDefinitions(),
          getInventoryItems(),
        ]);
        setProductDefs(defsData);
        setInventory(inventoryData);
      } catch (error) {
        console.error("Failed to fetch report data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const reorderItems = useMemo(() => {
    if (isLoading) return [];

    const stockMap: { [key: string]: number } = {};
    inventory.forEach(item => {
        const key = `${item.product_definition_id}-${item.variant}`;
        stockMap[key] = (stockMap[key] || 0) + item.quantity;
    });

    const itemsToReorder: ReorderItem[] = [];
    productDefs.forEach(def => {
        if (def.variants && Array.isArray(def.variants)) {
            def.variants.forEach(variant => {
                const key = `${def.id}-${variant.name}`;
                const currentStock = stockMap[key] || 0;
                if (currentStock <= variant.reorder_point) {
                    itemsToReorder.push({
                        productName: def.name,
                        variantName: variant.name,
                        currentStock,
                        reorderPoint: variant.reorder_point,
                    });
                }
            });
        }
    });

    return itemsToReorder.sort((a, b) => a.productName.localeCompare(b.productName));
  }, [inventory, productDefs, isLoading]);

  return (
    <div className="page-container bg-background" dir={direction}>
      <Header toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
      <Sidebar 
        isSidebarOpen={isSidebarOpen}
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        closeSidebar={() => setIsSidebarOpen(false)}
      />
      <main className={`${isMobile ? 'px-4' : direction === 'rtl' ? 'pr-72 pl-8' : 'pl-72 pr-8'} transition-all`}>
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">{t('reorder_point_report_nav')}</h1>
          <Card>
            <CardHeader>
              <CardTitle>{t('items_below_reorder_point')}</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p>Loading...</p>
              ) : (
                <div className="overflow-x-auto">
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
                        <TableRow key={index} className={item.currentStock === 0 ? 'bg-red-50' : ''}>
                          <TableCell>{item.productName}</TableCell>
                          <TableCell>{item.variantName}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant={item.currentStock <= item.reorderPoint ? 'destructive' : 'outline'}>
                              {item.currentStock}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">{item.reorderPoint}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default ReorderPointReportPage;
