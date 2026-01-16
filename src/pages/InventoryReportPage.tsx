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
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter states
  const [filters, setFilters] = useState({
    store: 'all',
    supplier: 'all',
    product: '',
    type: 'all',
    variant: '',
    stock_type: 'all',
  });

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
        const [storesData, suppliersData, typesData, inventoryData] = await Promise.all([
          getStores(),
          getSuppliers(),
          getSupplyTypes(),
          getInventoryItems(), // This now fetches the comprehensive view
        ]);
        setStores(storesData);
        setSuppliers(suppliersData);
        setSupplyTypes(typesData);
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
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const filteredInventory = useMemo(() => {
    return inventory.filter(item =>
      (filters.store === 'all' || item.store_id === filters.store) &&
      (filters.supplier === 'all' || item.supplier_id === filters.supplier) &&
      (filters.type === 'all' || item.supply_type_name === supplyTypes.find(st => st.id === filters.type)?.name) &&
      (item.product_name.toLowerCase().includes(filters.product.toLowerCase())) &&
      (item.variant.toLowerCase().includes(filters.variant.toLowerCase())) &&
      (filters.stock_type === 'all' || item.stock_type === filters.stock_type)
    );
  }, [inventory, filters, supplyTypes]);

  const reportStats = useMemo(() => {
    const totalItems = new Set(filteredInventory.map(i => i.product_definition_id + i.variant)).size;
    const totalQuantity = filteredInventory.reduce((sum, item) => sum + item.quantity, 0);
    const totalValue = filteredInventory.reduce((sum, item) => sum + (item.quantity * (item.purchase_price || 0)), 0);
    return { totalItems, totalQuantity, totalValue };
  }, [filteredInventory]);

  const handleExportCSV = () => {
    const headers = Object.values(ALL_COLUMNS).map(col => t(col.label));
    // Export ALL inventory data, not just filtered data
    const rows = inventory.map(item =>
      Object.values(ALL_COLUMNS).map(col => {
        let value = item[col.key as keyof InventoryItem] ?? '';
        // Handle special formatting for stock_type
        if (col.key === 'stock_type') {
          value = t(value as string);
        }
        if (typeof value === 'string') {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    );

    const csvContent = "data:text/csv;charset=utf-8,"
      + headers.join(',') + "\n"
      + rows.join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "inventory_report.csv");
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
                {/* Filters Row 1 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <Select value={filters.store} onValueChange={(v) => handleFilterChange('store', v)}><SelectTrigger><SelectValue placeholder={t('filter_by_store')} /></SelectTrigger><SelectContent><SelectItem value="all">{t('all_stores')}</SelectItem>{stores.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select>
                  <Select value={filters.supplier} onValueChange={(v) => handleFilterChange('supplier', v)}><SelectTrigger><SelectValue placeholder={t('filter_by_supplier')} /></SelectTrigger><SelectContent><SelectItem value="all">{t('all_suppliers')}</SelectItem>{suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select>
                  <Select value={filters.type} onValueChange={(v) => handleFilterChange('type', v)}><SelectTrigger><SelectValue placeholder={t('filter_by_type')} /></SelectTrigger><SelectContent><SelectItem value="all">{t('all_types')}</SelectItem>{supplyTypes.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select>
                  <Select value={filters.stock_type} onValueChange={(v) => handleFilterChange('stock_type', v)}><SelectTrigger><SelectValue placeholder={t('filter_by_stock_type')} /></SelectTrigger><SelectContent><SelectItem value="all">{t('all_stock_types')}</SelectItem><SelectItem value="purchased">{t('purchased')}</SelectItem><SelectItem value="on_shelf">{t('on_shelf')}</SelectItem></SelectContent></Select>
                </div>
                {/* Filters Row 2 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <Input placeholder={t('filter_by_product_name')} value={filters.product} onChange={(e) => handleFilterChange('product', e.target.value)} />
                  <Input placeholder={t('filter_by_variant')} value={filters.variant} onChange={(e) => handleFilterChange('variant', e.target.value)} />
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
              {isMobile ? (
                <div className="space-y-4">
                  {isLoading ? (
                    [...Array(5)].map((_, i) => (
                      <Card key={i} className="p-4 space-y-2">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-4 w-1/4" />
                      </Card>
                    ))
                  ) : filteredInventory.length > 0 ? (
                    filteredInventory.map((item) => (
                      <Card key={item.id} className="p-4 border shadow-sm">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <h3 className="font-bold text-lg leading-tight">{item.product_name}</h3>
                            <p className="text-sm text-muted-foreground">{item.variant}</p>
                          </div>
                          <Badge
                            variant="secondary"
                            className={item.stock_type === 'on_shelf' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}
                          >
                            {t(item.stock_type)}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                          <div>
                            <p className="text-muted-foreground text-xs uppercase tracking-wider mb-0.5">{t('store')}</p>
                            <p className="font-medium">{item.store_name}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs uppercase tracking-wider mb-0.5">{t('quantity')}</p>
                            <p className="font-bold text-primary">{item.quantity}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs uppercase tracking-wider mb-0.5">{t('batch_number')}</p>
                            <p className="font-medium truncate">{item.batch_number}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs uppercase tracking-wider mb-0.5">{t('expiry_date')}</p>
                            <p className="font-medium">{format(new Date(item.expiry_date), 'P')}</p>
                          </div>
                          {item.supplier_name && (
                            <div className="col-span-2">
                              <p className="text-muted-foreground text-xs uppercase tracking-wider mb-0.5">{t('supplier')}</p>
                              <p className="font-medium">{item.supplier_name}</p>
                            </div>
                          )}
                        </div>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-10 text-muted-foreground border rounded-lg bg-gray-50">
                      {t('no_data_for_filters')}
                    </div>
                  )}
                </div>
              ) : (
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
                            {visibleColumns.barcode && <TableCell>{item.barcode}</TableCell>}
                            {visibleColumns.batch_number && <TableCell>{item.batch_number}</TableCell>}
                            {visibleColumns.expiry_date && <TableCell>{format(new Date(item.expiry_date), 'P')}</TableCell>}
                            {visibleColumns.quantity && <TableCell>{item.quantity}</TableCell>}
                            {visibleColumns.purchase_price && <TableCell>{item.purchase_price?.toFixed(2)}</TableCell>}
                            {visibleColumns.reorder_point && <TableCell>{item.reorder_point}</TableCell>}
                            {visibleColumns.stock_type && <TableCell><span className={`px-2 py-1 rounded-full text-xs font-medium ${item.stock_type === 'on_shelf' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>{t(item.stock_type)}</span></TableCell>}
                          </TableRow>
                        ))
                      ) : (
                        <TableRow><TableCell colSpan={Object.values(visibleColumns).filter(v => v).length} className="text-center h-24">{t('no_data_for_filters')}</TableCell></TableRow>
                      )}
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

export default InventoryReportPage;
