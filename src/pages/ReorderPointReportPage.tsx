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
import { getStores } from '@/data/operations/storesOperations';
import { getSuppliers } from '@/data/operations/supplierOperations';
import { Store, Supplier } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ReorderItem {
  productName: string;
  variantName: string;
  currentStock: number;
  reorderPoint: number;
}

const ReorderPointReportPage = () => {
  const isMobile = useMediaQuery('(max-width: 1024px)');
  const { t, direction } = useLanguage();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [productDefs, setProductDefs] = useState<ProductDefinition[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [filters, setFilters] = useState({
    store: 'all',
    supplier: 'all',
    stock_type: 'all',
  });

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [defsData, inventoryData, storesData, suppliersData] = await Promise.all([
          getProductDefinitions(),
          getInventoryItems(undefined, true), // Fetch all items, including those with 0 quantity
          getStores(),
          getSuppliers(),
        ]);
        setProductDefs(defsData);
        setInventory(inventoryData);
        setStores(storesData);
        setSuppliers(suppliersData);
      } catch (error) {
        console.error("Failed to fetch report data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleFilterChange = (filterName: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const reorderItems = useMemo(() => {
    if (isLoading) return [];

    const filteredInventory = inventory.filter(item =>
      (filters.store === 'all' || item.store_id === filters.store) &&
      (filters.supplier === 'all' || item.supplier_id === filters.supplier) &&
      (filters.stock_type === 'all' || item.stock_type === filters.stock_type)
    );

    const stockMap: { [key: string]: number } = {};
    filteredInventory.forEach(item => {
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
  }, [inventory, productDefs, isLoading, filters]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background dark:from-slate-900 dark:to-slate-950 pb-20" dir={direction}>
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
              <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <CardTitle>{t('items_below_reorder_point')}</CardTitle>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full md:w-auto">
                  <Select value={filters.store} onValueChange={(v) => handleFilterChange('store', v)}>
                    <SelectTrigger><SelectValue placeholder={t('filter_by_store')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('all_stores')}</SelectItem>
                      {stores.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={filters.supplier} onValueChange={(v) => handleFilterChange('supplier', v)}>
                    <SelectTrigger><SelectValue placeholder={t('filter_by_supplier')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('all_suppliers')}</SelectItem>
                      {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={filters.stock_type} onValueChange={(v) => handleFilterChange('stock_type', v)}>
                    <SelectTrigger><SelectValue placeholder={t('filter_by_stock_type')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('all_stock_types')}</SelectItem>
                      <SelectItem value="purchased">{t('purchased')}</SelectItem>
                      <SelectItem value="on_shelf">{t('on_shelf')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                </div>
              ) : isMobile ? (
                <div className="space-y-4">
                  {reorderItems.length > 0 ? (
                    reorderItems.map((item, index) => (
                      <Card key={index} className={`p-4 border shadow-sm ${item.currentStock === 0 ? 'bg-red-50/50 border-red-200 dark:bg-red-900/20 dark:border-red-800' : ''}`}>
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <h3 className="font-bold text-lg leading-tight">{item.productName}</h3>
                            <p className="text-sm text-muted-foreground">{item.variantName}</p>
                          </div>
                          {item.currentStock === 0 && (
                            <Badge variant="destructive" className="animate-pulse">
                              {t('out_of_stock')}
                            </Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="bg-gray-50 p-3 rounded-lg border dark:bg-muted/50 dark:border-border">
                            <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">{t('current_stock')}</p>
                            <p className={`text-xl font-black ${item.currentStock <= item.reorderPoint ? 'text-destructive' : 'text-primary'}`}>
                              {item.currentStock}
                            </p>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-lg border dark:bg-muted/50 dark:border-border">
                            <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">{t('reorder_point')}</p>
                            <p className="text-xl font-black text-gray-700 dark:text-gray-300">
                              {item.reorderPoint}
                            </p>
                          </div>
                        </div>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-10 text-muted-foreground border rounded-lg bg-gray-50">
                      {t('no_items_below_reorder_point')}
                    </div>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="min-w-[800px]">
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
