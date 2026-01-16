import React, { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { useMediaQuery } from '@/hooks/use-mobile';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getSuppliers } from '@/data/operations/supplierOperations';
import { Supplier, Manufacturer, Store, StockType, ProductDefinition } from '@/types';
import { Save, RotateCcw, Trash2, Plus, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { getManufacturers } from '@/data/operations/manufacturerOperations';
import { getStores } from '@/data/operations/storesOperations';
import { createSupplyVoucherWithItems } from '@/data/operations/voucherOperations';
import { batchSaveGTINMappings, getGTINMapping } from '@/data/operations/gtinMappingOperations';
import { ParsedGS1Data } from '@/hooks/useBarcodeScanner';
import QuickActionScanner from '@/components/supplies/QuickActionScanner';
import ItemConfirmationDialog, { ConfirmedItemData } from '@/components/supplies/ItemConfirmationDialog';
import { NewItemWizard } from '@/components/supplies/NewItemWizard';
import { getProductDefinitions } from '@/data/operations/productDefinitionOperations';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// Extended type for local cart items
interface CartItem {
  id: string;
  productDefinitionId: string;
  productName: string;
  variant: string;
  barcode: string;
  gtin?: string; // Captured from GS1
  batchNumber: string;
  expiryDate?: Date;
  quantity: number;
  purchasePrice: number;
}

const AddInventoryPage = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 1024px)');
  const { t, direction } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => isMobile && setIsSidebarOpen(false);

  // --- Data Loading ---
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [manufacturersList, setManufacturersList] = useState<Manufacturer[]>([]);
  const [stores, setStores] = useState<Store[]>([]);

  // Cache product definitions for quick lookup
  const [productDefsCache, setProductDefsCache] = useState<ProductDefinition[]>([]);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [suppliersData, manufacturersData, storesData, defsData] = await Promise.all([
          getSuppliers(),
          getManufacturers(),
          getStores(),
          getProductDefinitions(),
        ]);
        setSuppliers(suppliersData);
        setManufacturersList(manufacturersData);
        setStores(storesData);
        setProductDefsCache(defsData);
      } catch (error) {
        toast({ title: t('error'), description: t('error_fetching_data'), variant: 'destructive' });
      }
    };
    loadInitialData();
  }, [toast, t]);

  // --- Form State (Session Setup) ---
  const [supplierId, setSupplierId] = useState('');
  const [manufacturerId, setManufacturerId] = useState('');
  const [storeId, setStoreId] = useState('');
  const [stockType, setStockType] = useState<StockType>('purchased');
  const [voucherNumber, setVoucherNumber] = useState('');

  // --- Cart State ---
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // --- Scanning & Dialog State ---
  const [isScannerLoading, setIsScannerLoading] = useState(false);
  const [currentScannedData, setCurrentScannedData] = useState<ParsedGS1Data | null>(null);

  // Dialogs
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmDialogProduct, setConfirmDialogProduct] = useState<{ name: string, variant: string }>({ name: '', variant: '' });

  const [isWizardOpen, setIsWizardOpen] = useState(false);

  // --- Handlers ---

  const handleScan = async (data: ParsedGS1Data) => {
    setIsScannerLoading(true);
    setCurrentScannedData(data);

    try {
      // 1. Check if we have a product_id directly from the scanner (via GTIN mapping)
      let matchedDefId = data.product_id;
      let matchedVariant = data.variant_name;

      // 2. If not, try to find by barcode (if it's a simple barcode that matches a known item)
      // Note: In a real app we might query an API 'findByBarcode', but here we rely on the hook's mapping 
      // OR we can check our local cache/db if we had barcode index. 
      // For now, we trust the hook's GTIN mapping. 
      // If the hook didn't find it, we treat it as unknown.

      if (matchedDefId && matchedVariant) {
        // Found! Open Confirmation Dialog
        const def = productDefsCache.find(d => d.id === matchedDefId);
        setConfirmDialogProduct({
          name: def?.name || "Unknown Product",
          variant: matchedVariant
        });
        setIsConfirmOpen(true);
      } else {
        // Not found! Open New Item Wizard
        setIsWizardOpen(true);
      }

    } catch (e) {
      console.error(e);
      toast({ title: t('error'), description: "Error processing scan", variant: "destructive" });
    } finally {
      setIsScannerLoading(false);
    }
  };

  const handleConfirmItem = (data: ConfirmedItemData) => {
    if (!currentScannedData || !currentScannedData.product_id) return;

    const def = productDefsCache.find(d => d.id === currentScannedData.product_id);

    const newItem: CartItem = {
      id: `item_${Date.now()}`,
      productDefinitionId: currentScannedData.product_id,
      productName: def?.name || "Unknown",
      variant: currentScannedData.variant_name || "Standard",
      barcode: currentScannedData.rawValue,
      gtin: currentScannedData.gtin,
      batchNumber: data.batchNumber,
      expiryDate: data.expiryDate,
      quantity: data.quantity,
      purchasePrice: data.purchasePrice
    };

    setCartItems(prev => [...prev, newItem]);
    toast({ title: "Item Added", description: `${newItem.productName} (x${newItem.quantity})` });
  };

  const handleWizardComplete = (def: ProductDefinition, variant: string, data: ConfirmedItemData) => {
    // 1. Add to cart
    const newItem: CartItem = {
      id: `item_${Date.now()}`,
      productDefinitionId: def.id,
      productName: def.name,
      variant: variant,
      barcode: currentScannedData?.rawValue || "",
      gtin: currentScannedData?.gtin, // If scanner picked up a GTIN but it wasn't mapped yet
      batchNumber: data.batchNumber,
      expiryDate: data.expiryDate,
      quantity: data.quantity,
      purchasePrice: data.purchasePrice
    };

    setCartItems(prev => [...prev, newItem]);

    // 2. Update cache if it's a new definition (though wizard selects *existing* def mostly)
    // If wizard created a NEW def (not implemented in this wizard version, it selects existing), we'd need to re-fetch.
    // Since wizard selects existing, we are good.

    toast({ title: "New Item Configured", description: `${def.name} - ${variant}` });
  };

  const removeItem = (index: number) => {
    setCartItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!supplierId || !storeId || !stockType) {
      toast({ title: t('error'), description: t('please_fill_header_fields'), variant: 'destructive' });
      return;
    }

    if (cartItems.length === 0) {
      toast({ title: t('error'), description: "Cart is empty", variant: 'destructive' });
      return;
    }

    const voucherData = {
      supplier_id: supplierId,
      date: format(new Date(), 'yyyy-MM-dd'),
      stock_type: stockType,
      voucher_number: voucherNumber,
    };

    const newInventoryItems = cartItems.map(item => ({
      product_definition_id: item.productDefinitionId,
      variant: item.variant,
      barcode: item.barcode || null,
      quantity: item.quantity,
      initial_quantity: item.quantity,
      store_id: storeId,
      manufacturer_id: manufacturerId || null, // Optional in DB but good to have
      supplier_id: supplierId,
      batch_number: item.batchNumber,
      expiry_date: item.expiryDate ? format(item.expiryDate, 'yyyy-MM-dd') : undefined,
      purchase_price: item.purchasePrice,
    }));

    try {
      await createSupplyVoucherWithItems(voucherData, newInventoryItems as any);

      // Save GTIN mappings for items that have GTINs
      const gtinMappings = cartItems
        .filter(item => item.gtin && item.productDefinitionId && item.variant)
        .map(item => ({
          gtin: item.gtin!,
          product_definition_id: item.productDefinitionId,
          variant_name: item.variant,
          last_supplier_id: supplierId,
          average_price: item.purchasePrice || undefined,
        }));

      if (gtinMappings.length > 0) {
        await batchSaveGTINMappings(gtinMappings);
      }

      toast({ title: t('success'), description: t('invoice_processed_successfully') });
      navigate('/supplies');
    } catch (error) {
      console.error(error);
      toast({ title: t('error'), description: t('error_saving_invoice'), variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background dark:from-slate-900 dark:to-slate-950 pb-20" dir={direction}>
      <Header toggleSidebar={toggleSidebar} />
      <Sidebar
        isSidebarOpen={isSidebarOpen}
        toggleSidebar={toggleSidebar}
        closeSidebar={closeSidebar}
      />

      <main className={`pt-20 ${isMobile ? 'px-4' : direction === 'rtl' ? 'pr-72 pl-8' : 'pl-72 pr-8'} transition-all`}>
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">{t('add_new_inventory_invoice')}</h1>
          </div>

          <form onSubmit={handleSaveInvoice}>
            {/* Session Setup */}
            <Card className="mb-6 border-l-4 border-l-primary shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Edit className="h-4 w-4 text-muted-foreground" />
                  {t('invoice_details')}
                </CardTitle>
                <CardDescription>Configure session defaults for this invoice.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="stockType" className="text-xs text-muted-foreground">{t('stock_type')}</Label>
                  <Select value={stockType} onValueChange={(value) => setStockType(value as StockType)}>
                    <SelectTrigger className="h-9"><SelectValue placeholder={t('select_stock_type')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="purchased">{t('purchased')}</SelectItem>
                      <SelectItem value="on_shelf">{t('on_shelf')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="voucherNumber" className="text-xs text-muted-foreground">{t('voucher_number')}</Label>
                  <Input id="voucherNumber" value={voucherNumber} onChange={(e) => setVoucherNumber(e.target.value)} className="h-9" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="manufacturer" className="text-xs text-muted-foreground">{t('manufacturer')}</Label>
                  <Select value={manufacturerId} onValueChange={setManufacturerId}>
                    <SelectTrigger className="h-9"><SelectValue placeholder={`${t('select')} ${t('manufacturer')}`} /></SelectTrigger>
                    <SelectContent>{manufacturersList.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="supplier" className="text-xs text-muted-foreground">{t('supplier')}</Label>
                  <Select value={supplierId} onValueChange={setSupplierId}>
                    <SelectTrigger className="h-9"><SelectValue placeholder={`${t('select')} ${t('supplier')}`} /></SelectTrigger>
                    <SelectContent>{suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="store" className="text-xs text-muted-foreground">{t('store')}</Label>
                  <Select value={storeId} onValueChange={setStoreId}>
                    <SelectTrigger className="h-9"><SelectValue placeholder={t('select_store')} /></SelectTrigger>
                    <SelectContent>{stores.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Scanner Section */}
            <div className="mb-8">
              <Label className="block mb-2 text-lg font-semibold">{t('scan_item') || 'مسح صنف'}</Label>
              <QuickActionScanner onScan={handleScan} isLoading={isScannerLoading} />
            </div>

            {/* Cart List */}
            {cartItems.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex justify-between">
                    <span>{t('scanned_items') || 'الأصناف الممسوحة'} ({cartItems.length})</span>
                    <Badge variant="secondary">{cartItems.reduce((acc, item) => acc + item.quantity, 0)} {t('total_quantity') || 'إجمالي الكمية'}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[40%] text-right">{t('product')}</TableHead>
                          <TableHead className="text-right">{t('batch_expiry') || 'الباتش / الصلاحية'}</TableHead>
                          <TableHead className="text-center">{t('quantity')}</TableHead>
                          <TableHead className="text-right">{t('price')}</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cartItems.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <div className="font-medium">{item.productName}</div>
                              <div className="text-xs text-muted-foreground">{item.variant}</div>
                              <div className="text-[10px] font-mono text-muted-foreground mt-0.5">{item.barcode}</div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">{item.batchNumber}</div>
                              <div className="text-xs text-muted-foreground">
                                {item.expiryDate ? format(item.expiryDate, 'MM/yyyy') : '-'}
                              </div>
                            </TableCell>
                            <TableCell className="text-center font-bold text-lg">
                              {item.quantity}
                            </TableCell>
                            <TableCell className="text-right">
                              {item.purchasePrice > 0 ? item.purchasePrice.toFixed(2) : '-'}
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                onClick={() => removeItem(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Footer Actions */}
            <div className="flex flex-col sm:flex-row justify-end gap-3 mt-8 pb-10">
              <Button type="button" variant="outline" onClick={() => navigate('/supplies')} className="gap-2 h-12">
                <RotateCcw className="h-4 w-4" />
                {t('cancel')}
              </Button>
              <Button type="submit" className="gap-2 h-12 text-lg px-8 shadow-lg shadow-primary/20" disabled={cartItems.length === 0}>
                <Save className="h-5 w-5" />
                {t('save_invoice')}
              </Button>
            </div>
          </form>
        </div>
      </main>

      {/* Dialogs */}
      <ItemConfirmationDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmItem}
        scannedData={currentScannedData}
        productName={confirmDialogProduct.name}
        variantName={confirmDialogProduct.variant}
      />

      <NewItemWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onComplete={handleWizardComplete}
        scannedData={currentScannedData}
        defaultBarcode={currentScannedData?.rawValue}
      />
    </div>
  );
};

export default AddInventoryPage;
