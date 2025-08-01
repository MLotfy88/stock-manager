import React, { useState, useMemo, useEffect } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { useMediaQuery } from '@/hooks/use-mobile';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Store, ProductDefinition, InventoryItem, Manufacturer } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getStores } from '@/data/operations/storesOperations';
import { getProductDefinitions } from '@/data/operations/productDefinitionOperations';
import { getInventoryItems } from '@/data/operations/suppliesOperations';
import { getManufacturers } from '@/data/operations/manufacturerOperations';

type GroupBy = 'product' | 'manufacturer';

const InventoryReportPage = () => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { t, direction } = useLanguage();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [stores, setStores] = useState<Store[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [productDefs, setProductDefs] = useState<ProductDefinition[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedStoreId, setSelectedStoreId] = useState<string>('all');
  const [groupBy, setGroupBy] = useState<GroupBy>('product');

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [storesData, manufacturersData, defsData, inventoryData] = await Promise.all([
          getStores(),
          getManufacturers(),
          getProductDefinitions(),
          getInventoryItems(),
        ]);
        setStores(storesData);
        setManufacturers(manufacturersData);
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

  const filteredInventory = useMemo(() => {
    if (selectedStoreId === 'all') return inventory;
    return inventory.filter(item => item.store_id === selectedStoreId);
  }, [selectedStoreId, inventory]);

  const groupedData = useMemo(() => {
    const groups: { [key: string]: { name: string; items: { name: string; variant: string; quantity: number }[] } } = {};

    filteredInventory.forEach(item => {
      const productDef = productDefs.find(p => p.id === item.product_definition_id);
      if (!productDef) return;

      let key = '';
      let groupName = '';
      let itemName = productDef.name;

      if (groupBy === 'product') {
        key = productDef.id;
        groupName = productDef.name;
      } else if (groupBy === 'manufacturer') {
        const manufacturer = manufacturers.find(m => m.id === item.manufacturer_id);
        key = item.manufacturer_id || 'unknown';
        groupName = manufacturer?.name || 'Unknown';
      }

      if (!groups[key]) {
        groups[key] = { name: groupName, items: [] };
      }
      
      const existingItem = groups[key].items.find(i => i.variant === item.variant && i.name === itemName);
      if (existingItem) {
        existingItem.quantity += item.quantity;
      } else {
        groups[key].items.push({ name: itemName, variant: item.variant, quantity: item.quantity });
      }
    });

    return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredInventory, groupBy, productDefs, manufacturers]);

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
          <h1 className="text-2xl font-bold mb-6">{t('inventory_report_nav')}</h1>
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <CardTitle>{t('stock_balance')}</CardTitle>
                <div className="flex gap-4 w-full md:w-auto">
                  <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
                    <SelectTrigger className="w-full md:w-[180px]"><SelectValue placeholder={t('select_store')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('all_stores')}</SelectItem>
                      {stores.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={groupBy} onValueChange={(value) => setGroupBy(value as GroupBy)}>
                    <SelectTrigger className="w-full md:w-[180px]"><SelectValue placeholder={t('group_by')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="product">{t('group_by_product')}</SelectItem>
                      <SelectItem value="manufacturer">{t('group_by_manufacturer')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p>Loading...</p>
              ) : groupedData.map((group, index) => (
                <div key={index} className="mb-6 last:mb-0">
                  <h2 className="text-lg font-semibold mb-2 p-2 bg-muted/50 rounded-md">{group.name}</h2>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{groupBy === 'product' ? t('variant') : t('product')}</TableHead>
                          <TableHead className="text-right">{t('quantity')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.items.sort((a,b) => a.variant.localeCompare(b.variant)).map((item, itemIndex) => (
                          <TableRow key={itemIndex}>
                            <TableCell>{groupBy === 'product' ? item.variant : `${item.name} - ${item.variant}`}</TableCell>
                            <TableCell className="text-right">{item.quantity}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
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
