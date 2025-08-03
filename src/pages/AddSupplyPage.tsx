import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { useMediaQuery } from '@/hooks/use-mobile';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getSuppliers } from '@/data/operations/supplierOperations';
import { Supplier, Manufacturer, ProductDefinition, InventoryItem, Store } from '@/types';
import { CalendarIcon, Save, RotateCcw, ScanBarcode, PlusCircle, Trash2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { getManufacturers } from '@/data/operations/manufacturerOperations';
import { getProductDefinitions } from '@/data/operations/productDefinitionOperations';
import { getStores } from '@/data/operations/storesOperations';
import { addInventoryItems } from '@/data/operations/suppliesOperations';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { BarcodeScannerViewfinder } from '@/components/ui/BarcodeScannerViewfinder';
import { MobileSupplyItemCard } from '@/components/supplies/MobileSupplyItemCard';


type PurchaseOrderItem = {
  id: string;
  barcode: string;
  productDefinitionId: string;
  variant: string;
  batchNumber: string;
  expiryDate?: Date;
  quantity: string;
  purchasePrice: string;
};

const AddInventoryPage = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { t, direction } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const closeSidebar = () => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  };

  const [productDefinitions, setProductDefinitions] = useState<ProductDefinition[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [manufacturersList, setManufacturersList] = useState<Manufacturer[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [activeScannerId, setActiveScannerId] = useState<string | null>(null);

  // Form State
  const [supplierId, setSupplierId] = useState('');
  const [manufacturerId, setManufacturerId] = useState('');
  const [storeId, setStoreId] = useState('');
  const [items, setItems] = useState<PurchaseOrderItem[]>([
    { id: `item_${Date.now()}`, barcode: '', productDefinitionId: '', variant: '', batchNumber: '', expiryDate: undefined, quantity: '1', purchasePrice: '0' }
  ]);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [suppliersData, manufacturersData, productsData, storesData] = await Promise.all([
          getSuppliers(),
          getManufacturers(),
          getProductDefinitions(),
          getStores(),
        ]);
        setSuppliers(suppliersData);
        setManufacturersList(manufacturersData);
        setProductDefinitions(productsData);
        setStores(storesData);
      } catch (error) {
        toast({ title: t('error'), description: t('error_fetching_data'), variant: 'destructive' });
      }
    };
    loadInitialData();
  }, [toast, t]);

  const handleItemChange = useCallback((itemId: string, field: keyof PurchaseOrderItem, value: any) => {
    setItems(prevItems => prevItems.map(item => item.id === itemId ? { ...item, [field]: value } : item));
  }, []);

  const {
    videoRef,
    isScannerActive,
    error: scannerError,
    startScanner,
    stopScanner,
    scanCycle,
  } = useBarcodeScanner({
    onScanSuccess: (scannedBarcode: string) => {
      if (activeScannerId) {
        handleItemChange(activeScannerId, 'barcode', scannedBarcode);
        toast({ title: t('barcode_scanned'), description: `${t('barcode')}: ${scannedBarcode}` });
        if (navigator.vibrate) navigator.vibrate(150);
        stopScanner(); // Now it's defined
        setActiveScannerId(null);
      }
    },
    onScanFailure: (error: Error) => {
      console.error("Scan Error:", error);
      toast({ title: t('scan_error'), description: error.message, variant: 'destructive' });
    },
  });

  // Display scanner error in a toast
  useEffect(() => {
    if (scannerError) {
      toast({ title: t('scanner_error'), description: scannerError, variant: 'destructive' });
    }
  }, [scannerError, toast, t]);

  const handleStartScan = (itemId: string) => {
    setActiveScannerId(itemId);
    startScanner();
  };

  const handleStopScan = () => {
    stopScanner();
    setActiveScannerId(null);
  };

  const addNewItem = () => {
    setItems(prevItems => [
      ...prevItems,
      { id: `item_${Date.now()}`, barcode: '', productDefinitionId: '', variant: '', batchNumber: '', expiryDate: undefined, quantity: '1', purchasePrice: '0' }
    ]);
  };

  const removeItem = (itemId: string) => {
    setItems(prevItems => prevItems.filter(item => item.id !== itemId));
  };

  const duplicateItem = (itemId: string) => {
    const itemToDuplicate = items.find(item => item.id === itemId);
    if (itemToDuplicate) {
      const newItem = {
        ...itemToDuplicate,
        id: `item_${Date.now()}`,
        barcode: '', // Barcode should be unique per item
      };
      setItems(prevItems => [...prevItems, newItem]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId || !manufacturerId || !storeId) {
      toast({ title: t('error'), description: t('please_fill_header_fields'), variant: 'destructive' });
      return;
    }

    for (const item of items) {
      if (!item.productDefinitionId || !item.variant || !item.batchNumber || !item.expiryDate || !item.quantity || !item.purchasePrice) {
        toast({ title: t('error'), description: `${t('please_complete_all_fields_for_item')} #${item.id.slice(-4)}`, variant: 'destructive' });
        return;
      }
    }

    const newInventoryItems = items.map(item => ({
      product_definition_id: item.productDefinitionId,
      variant: item.variant,
      barcode: item.barcode,
      quantity: parseInt(item.quantity),
      store_id: storeId,
      manufacturer_id: manufacturerId,
      supplier_id: supplierId,
      batch_number: item.batchNumber,
      expiry_date: item.expiryDate ? format(item.expiryDate, 'yyyy-MM-dd') : '',
      purchase_price: parseFloat(item.purchasePrice),
    }));

    try {
      await addInventoryItems(newInventoryItems as any);
      toast({ title: t('success'), description: t('invoice_processed_successfully') });
      navigate('/supplies');
    } catch (error) {
      toast({ title: t('error'), description: t('error_saving_invoice'), variant: 'destructive' });
    }
  };

  return (
    <div className="page-container bg-background" dir={direction}>
      <Header toggleSidebar={toggleSidebar} />
      <Sidebar 
        isSidebarOpen={isSidebarOpen} 
        toggleSidebar={toggleSidebar}
        closeSidebar={closeSidebar}
      />
      
      <main className={`${isMobile ? 'px-4' : direction === 'rtl' ? 'pr-72 pl-8' : 'pl-72 pr-8'} transition-all`}>
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">{t('add_new_inventory_invoice')}</h1>
          
          <form onSubmit={handleSubmit}>
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>{t('invoice_details')}</CardTitle>
                <CardDescription>{t('invoice_details_description')}</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6">
                <div className="space-y-2">
                  <Label htmlFor="manufacturer">{t('manufacturer')}</Label>
                  <Select value={manufacturerId} onValueChange={setManufacturerId}>
                    <SelectTrigger><SelectValue placeholder={`${t('select')} ${t('manufacturer')}`} /></SelectTrigger>
                    <SelectContent>{manufacturersList.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplier">{t('supplier')}</Label>
                  <Select value={supplierId} onValueChange={setSupplierId}>
                    <SelectTrigger><SelectValue placeholder={`${t('select')} ${t('supplier')}`} /></SelectTrigger>
                    <SelectContent>{suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="store">{t('store')}</Label>
                  <Select value={storeId} onValueChange={setStoreId}>
                    <SelectTrigger><SelectValue placeholder={t('select_store')}/></SelectTrigger>
                    <SelectContent>{stores.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('invoice_items')}</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Desktop Table */}
                <div className="overflow-x-auto hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[150px]">{t('barcode')}</TableHead>
                        <TableHead>{t('product')}</TableHead>
                        <TableHead>{t('variant')}</TableHead>
                        <TableHead>{t('batch_number')}</TableHead>
                        <TableHead>{t('expiry_date')}</TableHead>
                        <TableHead className="w-[100px]">{t('quantity')}</TableHead>
                        <TableHead className="w-[120px]">{t('purchase_price')}</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => {
                        const selectedDefinition = productDefinitions.find(def => def.id === item.productDefinitionId);
                        return (
                          <React.Fragment key={item.id}>
                            <TableRow>
                              <TableCell className="min-w-[200px] p-2 md:p-4" data-label={t('barcode')}>
                                <div className="flex items-center gap-2">
                                  <Input
                                    value={item.barcode}
                                    onChange={(e) => handleItemChange(item.id, 'barcode', e.target.value)}
                                    placeholder={t('scan_or_enter_barcode')}
                                  />
                                  <Button type="button" size="icon" variant="ghost" onClick={() => handleStartScan(item.id)}><ScanBarcode className="h-5 w-5" /></Button>
                                </div>
                              </TableCell>
                              <TableCell className="min-w-[250px] p-2 md:p-4" data-label={t('product')}>
                                <Select value={item.productDefinitionId} onValueChange={(val) => handleItemChange(item.id, 'productDefinitionId', val)}>
                                  <SelectTrigger><SelectValue placeholder={t('select_product')} /></SelectTrigger>
                                  <SelectContent>{productDefinitions.map((def) => <SelectItem key={def.id} value={def.id}>{def.name}</SelectItem>)}</SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell className="min-w-[150px] p-2 md:p-4" data-label={t('variant')}>
                                <Select value={item.variant} onValueChange={(val) => handleItemChange(item.id, 'variant', val)} disabled={!selectedDefinition}>
                                  <SelectTrigger><SelectValue placeholder={t('select_variant')} /></SelectTrigger>
                                  <SelectContent>{selectedDefinition?.variants.map((variant: any) => <SelectItem key={variant.name} value={variant.name}>{variant.name}</SelectItem>)}</SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell className="min-w-[150px] p-2 md:p-4" data-label={t('batch_number')}>
                                <Input value={item.batchNumber} onChange={(e) => handleItemChange(item.id, 'batchNumber', e.target.value)} />
                              </TableCell>
                              <TableCell className="min-w-[200px] p-2 md:p-4" data-label={t('expiry_date')}>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !item.expiryDate && "text-muted-foreground")}>
                                      <CalendarIcon className="mr-2 h-4 w-4" />
                                      {item.expiryDate ? format(item.expiryDate, "PPP") : <span>{t('pick_date')}</span>}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={item.expiryDate} onSelect={(date) => handleItemChange(item.id, 'expiryDate', date)} initialFocus /></PopoverContent>
                                </Popover>
                              </TableCell>
                              <TableCell className="min-w-[100px] p-2 md:p-4" data-label={t('quantity')}>
                                <Input type="number" min="1" value={item.quantity} onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)} />
                              </TableCell>
                              <TableCell className="min-w-[120px] p-2 md:p-4" data-label={t('purchase_price')}>
                                <Input type="number" min="0" step="0.01" value={item.purchasePrice} onChange={(e) => handleItemChange(item.id, 'purchasePrice', e.target.value)} />
                              </TableCell>
                              <TableCell className="p-2 md:p-4 text-right">
                                <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(item.id)} disabled={items.length <= 1}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          </React.Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-4">
                  {items.map((item) => {
                    const selectedDefinition = productDefinitions.find(def => def.id === item.productDefinitionId);
                    return (
                      <MobileSupplyItemCard
                        key={item.id}
                        itemId={item.id}
                        onScan={() => handleStartScan(item.id)}
                        onRemove={() => removeItem(item.id)}
                        onDuplicate={() => duplicateItem(item.id)}
                        canRemove={items.length > 1}
                      >
                        <div className="space-y-4">
                          {/* Barcode */}
                          <div className="flex items-center gap-2">
                            <Input value={item.barcode} onChange={(e) => handleItemChange(item.id, 'barcode', e.target.value)} placeholder={t('scan_or_enter_barcode')} />
                          </div>
                          {/* Product */}
                          <Select value={item.productDefinitionId} onValueChange={(val) => handleItemChange(item.id, 'productDefinitionId', val)}>
                            <SelectTrigger><SelectValue placeholder={t('select_product')} /></SelectTrigger>
                            <SelectContent>{productDefinitions.map((def) => <SelectItem key={def.id} value={def.id}>{def.name}</SelectItem>)}</SelectContent>
                          </Select>
                          {/* Variant */}
                          <Select value={item.variant} onValueChange={(val) => handleItemChange(item.id, 'variant', val)} disabled={!selectedDefinition}>
                            <SelectTrigger><SelectValue placeholder={t('select_variant')} /></SelectTrigger>
                            <SelectContent>{selectedDefinition?.variants.map((variant: any) => <SelectItem key={variant.name} value={variant.name}>{variant.name}</SelectItem>)}</SelectContent>
                          </Select>
                          {/* Batch & Expiry */}
                          <div className="grid grid-cols-2 gap-4">
                            <Input value={item.batchNumber} onChange={(e) => handleItemChange(item.id, 'batchNumber', e.target.value)} placeholder={t('batch_number')} />
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !item.expiryDate && "text-muted-foreground")}>
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {item.expiryDate ? format(item.expiryDate, "P") : <span>{t('pick_date')}</span>}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={item.expiryDate} onSelect={(date) => handleItemChange(item.id, 'expiryDate', date)} initialFocus /></PopoverContent>
                            </Popover>
                          </div>
                          {/* Quantity & Price */}
                          <div className="grid grid-cols-2 gap-4">
                            <Input type="number" min="1" value={item.quantity} onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)} placeholder={t('quantity')} />
                            <Input type="number" min="0" step="0.01" value={item.purchasePrice} onChange={(e) => handleItemChange(item.id, 'purchasePrice', e.target.value)} placeholder={t('purchase_price')} />
                          </div>
                        </div>
                      </MobileSupplyItemCard>
                    );
                  })}
                </div>

                <Button type="button" variant="outline" onClick={addNewItem} className="mt-4 gap-2 hidden md:inline-flex">
                  <PlusCircle className="h-4 w-4" />
                  {t('add_another_item')}
                </Button>
              </CardContent>
            </Card>

            {/* Floating Action Button for Mobile */}
            <div className="md:hidden fixed bottom-20 right-4 z-50">
              <Button type="button" size="icon" className="h-14 w-14 rounded-full shadow-lg" onClick={addNewItem}>
                <PlusCircle className="h-7 w-7" />
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4 mt-8">
              <Button type="button" variant="outline" onClick={() => navigate('/supplies')} className="gap-2"><RotateCcw className="h-4 w-4" />{t('cancel')}</Button>
              <Button type="submit" className="gap-2"><Save className="h-4 w-4" />{t('save_invoice')}</Button>
            </div>
          </form>

          {/* Fullscreen scanner, rendered at the top level */}
          {isScannerActive && (
            <div className="fixed inset-0 bg-black z-50">
              <video ref={videoRef} className="w-full h-full object-cover" playsInline autoPlay />
              <BarcodeScannerViewfinder scanCycle={scanCycle} />
              <div className="absolute top-4 right-4 z-[51]">
                <Button variant="destructive" onClick={handleStopScan}>{t('stop_scanning')}</Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AddInventoryPage;
