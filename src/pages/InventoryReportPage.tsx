import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { useMediaQuery } from '@/hooks/use-mobile';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Store, ProductDefinition, InventoryItem, Manufacturer, SupplyTypeItem, Supplier } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ArrowLeft, FileSpreadsheet, Package, DollarSign, Warehouse, Building2, Tag, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getStores } from '@/data/operations/storesOperations';
import { getProductDefinitions } from '@/data/operations/productDefinitionOperations';
import { getInventoryItems } from '@/data/operations/suppliesOperations';
import { getManufacturers } from '@/data/operations/manufacturerOperations';
import { getSupplyTypes } from '@/data/operations/supplyTypeOperations';
import { getSuppliers } from '@/data/operations/supplierOperations';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

const ALL_COLUMNS = {
  store_name: { key: 'store_name', label: 'store' },
  product_name: { key: 'product_name', label: 'product' },
  supply_type_name: { key: 'supply_type_name', label: 'supply_type' },
  variant: { key: 'variant', label: 'variant' },
  manufacturer_name: { key: 'manufacturer_name', label: 'manufacturer' },
  supplier_name: { key: 'supplier_name', label: 'supplier' },
  barcode: { key: 'barcode', label: 'barcode' },
  batch_number: { key: 'batch_number', label: 'batch_number' },
  expiry_date: { key: 'expiry_date', label: 'expiry_date' },
  quantity: { key: 'quantity', label: 'quantity' },
  purchase_price: { key: 'purchase_price', label: 'cost' },
  reorder_point: { key: 'reorder_point', label: 'reorder_point' },
  stock_type: { key: 'stock_type', label: 'stock_type' },
};

const InventoryReportPage = () => {
  const isMobile = useMediaQuery('(max-width: 1024px)');
  const { t, direction } = useLanguage();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Data states
  const [stores, setStores] = useState<Store[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplyTypes, setSupplyTypes] = useState<SupplyTypeItem[]>([]);
  const [productDefs, setProductDefs] = useState<ProductDefinition[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter states
  const [filters, setFilters] = useState({
    store: 'all',
    supplier: 'all',
    product: 'all', // Now ID based
    type: 'all',
    variant: 'all', // Now Name based, but from dropdown
    stock_type: 'all',
  });

  // Grouping state
  const [groupBy, setGroupBy] = useState<'none' | 'product' | 'variant' | 'store' | 'supplier'>('none');

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    store_name: true,
    product_name: true,
    supply_type_name: true,
    variant: true,
    manufacturer_name: false,
    supplier_name: true,
    barcode: false,
    batch_number: true,
    expiry_date: true,
    quantity: true,
    purchase_price: true,
    reorder_point: false,
    stock_type: true,
  });

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [storesData, suppliersData, typesData, defsData, inventoryData] = await Promise.all([
          getStores(),
          getSuppliers(),
          getSupplyTypes(),
          getProductDefinitions(),
          getInventoryItems(),
        ]);
        setStores(storesData);
        setSuppliers(suppliersData);
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

  const handleFilterChange = (filterName: keyof typeof filters, value: string) => {
    setFilters(prev => {
      const newFilters = { ...prev, [filterName]: value };
      // Reset combination filter if product changes
      if (filterName === 'product') {
        newFilters.variant = 'all';
      }
      return newFilters;
    });
  };

  // 1. Filter Data
  const filteredInventory = useMemo(() => {
    return inventory.filter(item =>
      (filters.store === 'all' || item.store_id === filters.store) &&
      (filters.supplier === 'all' || item.supplier_id === filters.supplier) &&
      (filters.type === 'all' || item.supply_type_name === supplyTypes.find(st => st.id === filters.type)?.name) &&
      (filters.product === 'all' || item.product_definition_id === filters.product) &&
      (filters.variant === 'all' || item.variant === filters.variant) &&
      (filters.stock_type === 'all' || item.stock_type === filters.stock_type)
    );
  }, [inventory, filters, supplyTypes]);

  // 2. Group Data (if enabled)
  const groupedInventory = useMemo(() => {
    if (groupBy === 'none') return filteredInventory;

    const groups: Record<string, any> = {};

    filteredInventory.forEach(item => {
      let key = '';
      let groupName = '';

      switch (groupBy) {
        case 'product':
          key = item.product_definition_id || 'unknown';
          groupName = item.product_name;
          break;
        case 'variant':
          key = `${item.product_definition_id}-${item.variant}`;
          groupName = `${item.product_name} - ${item.variant}`;
          break;
        case 'store':
          key = item.store_id;
          groupName = item.store_name;
          break;
        case 'supplier':
          key = item.supplier_id || 'unknown';
          groupName = item.supplier_name || t('unknown');
          break;
      }

      if (!groups[key]) {
        groups[key] = {
          id: key,
          name: groupName,
          quantity: 0,
          value: 0,
          count: 0,
          items: [] // Keep explicit items if needed for drill-down later
        };
      }
      groups[key].quantity += item.quantity;
      groups[key].value += (item.quantity * (item.purchase_price || 0));
      groups[key].count += 1;
      groups[key].items.push(item);
    });

    return Object.values(groups);
  }, [filteredInventory, groupBy, t]);

  // 3. Stats Calculation
  const reportStats = useMemo(() => {
    const totalItems = new Set(filteredInventory.map(i => i.product_definition_id + i.variant)).size;
    const totalQuantity = filteredInventory.reduce((sum, item) => sum + item.quantity, 0);
    const totalValue = filteredInventory.reduce((sum, item) => sum + (item.quantity * (item.purchase_price || 0)), 0);
    return { totalItems, totalQuantity, totalValue };
  }, [filteredInventory]);

  // Helper to get variants for selected product
  const availableVariants = useMemo(() => {
    if (filters.product === 'all') return [];
    const def = productDefs.find(d => d.id === filters.product);
    return def?.variants.map(v => v.name) || [];
  }, [productDefs, filters.product]);

  const handleExportCSV = () => {
    const headers = Object.values(ALL_COLUMNS).map(col => t(col.label));
    const rows = filteredInventory.map(item =>
      Object.values(ALL_COLUMNS).map(col => {
        let value = item[col.key as keyof InventoryItem] ?? '';
        if (col.key === 'stock_type') value = t(value as string);
        if (typeof value === 'string') return `"${value.replace(/"/g, '""')}"`;
        return value;
      }).join(',')
    );

    const csvContent = "data:text/csv;charset=utf-8," + headers.join(',') + "\n" + rows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `inventory_report_${new Date().toISOString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background dark:from-slate-900 dark:to-slate-950 pb-20" dir={direction}>
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
              <div className="space-y-4">
                {/* Filters Row 1: Common Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <Select value={filters.store} onValueChange={(v) => handleFilterChange('store', v)}>
                    <SelectTrigger><SelectValue placeholder={t('filter_by_store')} /></SelectTrigger>
                    <SelectContent><SelectItem value="all">{t('all_stores')}</SelectItem>{stores.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={filters.supplier} onValueChange={(v) => handleFilterChange('supplier', v)}>
                    <SelectTrigger><SelectValue placeholder={t('filter_by_supplier')} /></SelectTrigger>
                    <SelectContent><SelectItem value="all">{t('all_suppliers')}</SelectItem>{suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={filters.stock_type} onValueChange={(v) => handleFilterChange('stock_type', v)}>
                    <SelectTrigger><SelectValue placeholder={t('filter_by_stock_type')} /></SelectTrigger>
                    <SelectContent><SelectItem value="all">{t('all_stock_types')}</SelectItem><SelectItem value="purchased">{t('purchased')}</SelectItem><SelectItem value="on_shelf">{t('on_shelf')}</SelectItem></SelectContent>
                  </Select>
                  {/* Group By Control */}
                  <Select value={groupBy} onValueChange={(v: any) => setGroupBy(v)}>
                    <SelectTrigger className="border-primary/50 bg-primary/5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{t('group_by') || 'تجميع حسب'}:</span>
                        <SelectValue />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t('none_detailed') || 'بدون (تفصيلي)'}</SelectItem>
                      <SelectItem value="product">{t('product') || 'المنتج'}</SelectItem>
                      <SelectItem value="variant">{t('variant') || 'المتغير'}</SelectItem>
                      <SelectItem value="store">{t('store') || 'المخزن'}</SelectItem>
                      <SelectItem value="supplier">{t('supplier') || 'المورد'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Filters Row 2: Smart Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-muted/30 p-4 rounded-lg border border-dashed">
                  {/* Product Smart Filter */}
                  <div className="md:col-span-2">
                    <Label className="text-xs mb-1 block text-muted-foreground">{t('filter_by_product')}</Label>
                    <Select value={filters.product} onValueChange={(v) => handleFilterChange('product', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('select_product')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('all_products')}</SelectItem>
                        {productDefs.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Variant Smart Filter (Dependent) */}
                  <div className="md:col-span-2">
                    <Label className="text-xs mb-1 block text-muted-foreground">{filters.product === 'all' ? t('select_product_first') : t('filter_by_variant')}</Label>
                    <Select
                      value={filters.variant}
                      onValueChange={(v) => handleFilterChange('variant', v)}
                      disabled={filters.product === 'all'}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('select_variant')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('all_variants')}</SelectItem>
                        {availableVariants.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-between items-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="ml-auto gap-2">
                        {t('columns')} <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {Object.values(ALL_COLUMNS).map(col => (
                        <DropdownMenuCheckboxItem
                          key={col.key}
                          className="capitalize"
                          checked={visibleColumns[col.key]}
                          onCheckedChange={(value) => setVisibleColumns(prev => ({ ...prev, [col.key]: !!value }))}
                        >
                          {t(col.label)}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button variant="outline" size="sm" className="gap-2" onClick={handleExportCSV} disabled={isLoading || filteredInventory.length === 0}>
                    <FileSpreadsheet className="h-4 w-4" />
                    {t('export_csv')}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Conditional Rendering: Grouped vs Detailed */}
              {groupBy !== 'none' ? (
                // GROUPED VIEW
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>{t('group_name') || 'الاسم'}</TableHead>
                        <TableHead className="text-center">{t('count') || 'العدد'}</TableHead>
                        <TableHead className="text-center">{t('total_quantity') || 'إجمالي الكمية'}</TableHead>
                        <TableHead className="text-right">{t('total_value') || 'إجمالي القيمة'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groupedInventory.length > 0 ? (
                        (groupedInventory as any[]).map((group) => (
                          <TableRow key={group.id}>
                            <TableCell className="font-medium">{group.name}</TableCell>
                            <TableCell className="text-center">{group.count}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary">{group.quantity}</Badge>
                            </TableCell>
                            <TableCell className="text-right font-bold">{group.value.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">EGP</span></TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow><TableCell colSpan={4} className="text-center py-8">{t('no_data')}</TableCell></TableRow>
                      )}
                    </TableBody>
                    <tfoot className="bg-primary/5 font-bold">
                      <TableRow>
                        <TableCell>{t('total')}</TableCell>
                        <TableCell className="text-center">{groupedInventory.length}</TableCell>
                        <TableCell className="text-center">{reportStats.totalQuantity}</TableCell>
                        <TableCell className="text-right">{reportStats.totalValue.toLocaleString()}</TableCell>
                      </TableRow>
                    </tfoot>
                  </Table>
                </div>
              ) : (
                // DETAILED VIEW (Standard Table)
                <div className="rounded-md border overflow-x-auto">
                  <Table className="min-w-[1200px]">
                    <TableHeader>
                      <TableRow>
                        {Object.values(ALL_COLUMNS).map(col => visibleColumns[col.key] && <TableHead key={col.key}>{t(col.label)}</TableHead>)}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        [...Array(10)].map((_, i) => (
                          <TableRow key={i}>
                            {Object.keys(visibleColumns).filter(k => visibleColumns[k]).map(key => <TableCell key={key}><Skeleton className="h-5 w-full" /></TableCell>)}
                          </TableRow>
                        ))
                      ) : filteredInventory.length > 0 ? (
                        filteredInventory.map((item) => (
                          <TableRow key={item.id}>
                            {visibleColumns.store_name && <TableCell>{item.store_name}</TableCell>}
                            {visibleColumns.product_name && <TableCell>{item.product_name}</TableCell>}
                            {visibleColumns.supply_type_name && <TableCell>{item.supply_type_name}</TableCell>}
                            {visibleColumns.variant && <TableCell>{item.variant}</TableCell>}
                            {visibleColumns.manufacturer_name && <TableCell>{item.manufacturer_name}</TableCell>}
                            {visibleColumns.supplier_name && <TableCell>{item.supplier_name}</TableCell>}
                            {visibleColumns.barcode && <TableCell className="font-mono text-xs">{item.barcode}</TableCell>}
                            {visibleColumns.batch_number && <TableCell>{item.batch_number}</TableCell>}
                            {visibleColumns.expiry_date && <TableCell>{format(new Date(item.expiry_date), 'P')}</TableCell>}
                            {visibleColumns.quantity && <TableCell className="font-bold">{item.quantity}</TableCell>}
                            {visibleColumns.purchase_price && <TableCell>{item.purchase_price?.toFixed(2)}</TableCell>}
                            {visibleColumns.reorder_point && <TableCell>{item.reorder_point}</TableCell>}
                            {visibleColumns.stock_type && <TableCell><span className={`px-2 py-1 rounded-full text-xs font-medium ${item.stock_type === 'on_shelf' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>{t(item.stock_type)}</span></TableCell>}
                          </TableRow>
                        ))
                      ) : (
                        <TableRow><TableCell colSpan={Object.values(visibleColumns).filter(v => v).length} className="text-center h-24">{t('no_data_for_filters')}</TableCell></TableRow>
                      )}
                    </TableBody>
                    <tfoot className="bg-primary/5 font-bold border-t-2 border-primary/20">
                      <TableRow>
                        <TableCell colSpan={Object.values(ALL_COLUMNS).findIndex(c => c.key === 'quantity') - (Object.values(ALL_COLUMNS).filter(c => !visibleColumns[c.key]).length > 5 ? 2 : 0)} className="text-right">{t('total')}</TableCell>
                        {/* Approximate placement of totals based on visibility is hard, simplified for now to just show totals if columns visible */}
                        {visibleColumns.quantity && <TableCell className="font-black text-lg">{reportStats.totalQuantity}</TableCell>}
                        {visibleColumns.purchase_price && <TableCell className="font-black text-lg">{reportStats.totalValue.toLocaleString()}</TableCell>}
                        <TableCell colSpan={5}></TableCell>
                      </TableRow>
                    </tfoot>
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

export default InventoryReportPage;
