import React, { useState, useEffect } from 'react';
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
import { BrowserBarcodeReader, NotFoundException, DecodeHintType, BarcodeFormat } from '@zxing/library';


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
  const [isScanning, setIsScanning] = useState(false);
  const [activeScannerId, setActiveScannerId] = useState<string | null>(null);
  
  // --- Barcode Scanner Optimization ---
  const hints = new Map();
  const formats = [
    BarcodeFormat.CODE_128, 
    BarcodeFormat.EAN_13, 
    BarcodeFormat.DATA_MATRIX,
    BarcodeFormat.CODE_39,
    BarcodeFormat.UPC_A,
  ];
  hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);
  // Use BrowserBarcodeReader for 1D codes, which is faster.
  const codeReader = new BrowserBarcodeReader();
  // --- End Optimization ---

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

  const handleItemChange = (itemId: string, field: keyof PurchaseOrderItem, value: any) => {
    setItems(prevItems => prevItems.map(item => item.id === itemId ? { ...item, [field]: value } : item));
  };

  const startScan = (itemId: string) => {
    setActiveScannerId(itemId);
    setIsScanning(true);

    const constraints: MediaStreamConstraints = {
      video: {
        facingMode: 'environment',
        height: { ideal: 1080 }, // Request higher resolution
        advanced: [{ focusMode: 'continuous' } as any]
      }
    };
    
    codeReader.decodeFromConstraints(constraints, `video-scanner-${itemId}`, (result, err) => {
      if (result) {
        const scannedBarcode = result.getText();
        stopScan();
        handleItemChange(itemId, 'barcode', scannedBarcode);
        toast({ title: "Barcode Scanned", description: `Barcode: ${scannedBarcode}` });
      }
      if (err && !(err instanceof NotFoundException)) {
        // This error happens constantly when no barcode is found, so we can ignore it.
      }
    });
  };

  const stopScan = () => {
    codeReader.reset();
    setIsScanning(false);
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
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="hidden md:table-header-group">
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
                            <TableRow className="flex flex-col md:table-row mb-4 md:mb-0 border md:border-none rounded-lg md:rounded-none">
                              <TableCell className="min-w-[200px] p-2 md:p-4" data-label={t('barcode')}>
                                <div className="flex items-center gap-2">
                                  <Input
                                    value={item.barcode}
                                    onChange={(e) => handleItemChange(item.id, 'barcode', e.target.value)}
                                    placeholder={t('scan_or_enter_barcode')}
                                  />
                                  <Button type="button" size="icon" variant="ghost" onClick={() => startScan(item.id)}><ScanBarcode className="h-5 w-5" /></Button>
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
                            {isScanning && activeScannerId === item.id && (
                              <TableRow>
                                <TableCell colSpan={8} className="p-0">
                                  <div className="p-4 border rounded-lg bg-black">
                                    <video id={`video-scanner-${item.id}`} className="w-full h-auto rounded-md"></video>
                                    <Button variant="destructive" className="w-full mt-2" onClick={stopScan}>Stop Scanning</Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <Button type="button" variant="outline" onClick={addNewItem} className="mt-4 gap-2">
                  <PlusCircle className="h-4 w-4" />
                  {t('add_another_item')}
                </Button>
              </CardContent>
            </Card>

            <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4 mt-8">
              <Button type="button" variant="outline" onClick={() => navigate('/supplies')} className="gap-2"><RotateCcw className="h-4 w-4" />{t('cancel')}</Button>
              <Button type="submit" className="gap-2"><Save className="h-4 w-4" />{t('save_invoice')}</Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default AddInventoryPage;
