import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { useMediaQuery } from '@/hooks/use-mobile';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Store, ProductDefinition, InventoryItem, Manufacturer, SupplyTypeItem } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileDown, FileSpreadsheet, Package, DollarSign, Warehouse, Building2, Tag } from 'lucide-react';
import { getStores } from '@/data/operations/storesOperations';
import { getProductDefinitions } from '@/data/operations/productDefinitionOperations';
import { getInventoryItems } from '@/data/operations/suppliesOperations';
import { getManufacturers } from '@/data/operations/manufacturerOperations';
import { getSupplyTypes } from '@/data/operations/supplyTypeOperations';
import { Skeleton } from '@/components/ui/skeleton';

const InventoryReportPage = () => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { t, direction } = useLanguage();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [stores, setStores] = useState<Store[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [supplyTypes, setSupplyTypes] = useState<SupplyTypeItem[]>([]);
  const [productDefs, setProductDefs] = useState<ProductDefinition[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [selectedManufacturer, setSelectedManufacturer] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [storesData, manufacturersData, typesData, defsData, inventoryData] = await Promise.all([
          getStores(),
          getManufacturers(),
          getSupplyTypes(),
          getProductDefinitions(),
          getInventoryItems(),
        ]);
        setStores(storesData);
        setManufacturers(manufacturersData);
        setSupplyTypes(typesData);
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

  const enrichedInventory = useMemo(() => {
    return inventory.map(item => {
      const def = productDefs.find(d => d.id === item.product_definition_id);
      return { ...item, type_id: def?.type_id };
    });
  }, [inventory, productDefs]);

  const filteredInventory = useMemo(() => {
    return enrichedInventory.filter(item => 
      (selectedStore === 'all' || item.store_id === selectedStore) &&
      (selectedManufacturer === 'all' || item.manufacturer_id === selectedManufacturer) &&
      (selectedType === 'all' || item.type_id === selectedType)
    );
  }, [enrichedInventory, selectedStore, selectedManufacturer, selectedType]);

  const reportStats = useMemo(() => {
    const totalItems = new Set(filteredInventory.map(i => i.product_definition_id + i.variant)).size;
    const totalQuantity = filteredInventory.reduce((sum, item) => sum + item.quantity, 0);
    const totalValue = filteredInventory.reduce((sum, item) => sum + (item.quantity * (item.purchase_price || 0)), 0);
    return { totalItems, totalQuantity, totalValue };
  }, [filteredInventory]);

  const groupedByProduct = useMemo(() => {
    const grouped: { [key: string]: { name: string; variant: string; quantity: number; value: number } } = {};
    filteredInventory.forEach(item => {
      const def = productDefs.find(d => d.id === item.product_definition_id);
      const key = item.product_definition_id + item.variant;
      if (!grouped[key]) {
        grouped[key] = { name: def?.name || 'N/A', variant: item.variant, quantity: 0, value: 0 };
      }
      grouped[key].quantity += item.quantity;
      grouped[key].value += item.quantity * (item.purchase_price || 0);
    });
    return Object.values(grouped).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredInventory, productDefs]);

  return (
    <div className="min-h-screen bg-gray-50" dir={direction}>
      <Header toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
      <Sidebar isSidebarOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} closeSidebar={() => setIsSidebarOpen(false)} />
      
      <main className={`pt-20 pb-10 transition-all duration-300 ${isMobile ? 'px-4' : direction === 'rtl' ? 'pr-72 pl-8' : 'pl-72 pr-8'}`}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Button asChild variant="outline" size="icon" className="h-9 w-9">
              <Link to="/reports"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">{t('inventory_report')}</h1>
              <p className="text-muted-foreground">{t('inventory_report_page_desc')}</p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">{t('total_unique_items')}</CardTitle><Package className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{isLoading ? <Skeleton className="h-8 w-20" /> : reportStats.totalItems}</div></CardContent></Card>
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">{t('total_quantity')}</CardTitle><Warehouse className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{isLoading ? <Skeleton className="h-8 w-24" /> : reportStats.totalQuantity}</div></CardContent></Card>
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">{t('total_inventory_value')}</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{isLoading ? <Skeleton className="h-8 w-32" /> : reportStats.totalValue.toFixed(2)}</div></CardContent></Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-grow">
                  <Select value={selectedStore} onValueChange={setSelectedStore}><SelectTrigger><div className="flex items-center gap-2"><Warehouse className="h-4 w-4" /><SelectValue placeholder={t('filter_by_store')} /></div></SelectTrigger><SelectContent><SelectItem value="all">{t('all_stores')}</SelectItem>{stores.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select>
                  <Select value={selectedManufacturer} onValueChange={setSelectedManufacturer}><SelectTrigger><div className="flex items-center gap-2"><Building2 className="h-4 w-4" /><SelectValue placeholder={t('filter_by_manufacturer')} /></div></SelectTrigger><SelectContent><SelectItem value="all">{t('all_manufacturers')}</SelectItem>{manufacturers.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent></Select>
                  <Select value={selectedType} onValueChange={setSelectedType}><SelectTrigger><div className="flex items-center gap-2"><Tag className="h-4 w-4" /><SelectValue placeholder={t('filter_by_type')} /></div></SelectTrigger><SelectContent><SelectItem value="all">{t('all_types')}</SelectItem>{supplyTypes.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-2"><FileDown className="h-4 w-4" />{t('export_pdf')}</Button>
                  <Button variant="outline" size="sm" className="gap-2"><FileSpreadsheet className="h-4 w-4" />{t('export_csv')}</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('product')}</TableHead>
                      <TableHead>{t('variant')}</TableHead>
                      <TableHead className="text-right">{t('quantity')}</TableHead>
                      <TableHead className="text-right">{t('total_value')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      [...Array(5)].map((_, i) => <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-5 w-full" /></TableCell></TableRow>)
                    ) : groupedByProduct.length > 0 ? (
                      groupedByProduct.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>{item.variant}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">{item.value.toFixed(2)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow><TableCell colSpan={4} className="text-center h-24">{t('no_data_for_filters')}</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default InventoryReportPage;
