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
import { manufacturers, getSuppliers } from '@/data/mockData';
import { Supplier, Manufacturer, ProductDefinition, InventoryItem, Store } from '@/types';
import { CalendarIcon, Save, RotateCcw, ScanBarcode } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// MOCK DATA - REMOVE WHEN SUPABASE IS INTEGRATED
const MOCK_PRODUCT_DEFINITIONS: ProductDefinition[] = [
  { id: '1', name: 'Diagnostic Catheter', typeId: 'catheter', barcode: '111', variantLabel: 'Curve', variants: [{name: 'L3.5', reorderPoint: 5}, {name: 'L4', reorderPoint: 5}], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '2', name: 'Balloons', typeId: 'consumable', barcode: '222', variantLabel: 'Size', variants: [{name: '2.5x10', reorderPoint: 10}, {name: '3.0x15', reorderPoint: 8}], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];
const MOCK_STORES: Store[] = [
    { id: '1', name: 'Main Store' },
    { id: '2', name: 'Cath Lab 1' },
];
// END MOCK DATA

const AddInventoryPage = () => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { t, direction } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [productDefinitions, setProductDefinitions] = useState<ProductDefinition[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [manufacturersList, setManufacturersList] = useState<Manufacturer[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  
  // Form State
  const [selectedDefinitionId, setSelectedDefinitionId] = useState('');
  const [selectedVariant, setSelectedVariant] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [purchasePrice, setPurchasePrice] = useState('0');
  const [manufacturerId, setManufacturerId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [storeId, setStoreId] = useState('');
  const [expiryDate, setExpiryDate] = useState<Date | undefined>(new Date(new Date().setFullYear(new Date().getFullYear() + 1)));

  // Scanner State
  const [isScanning, setIsScanning] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<ProductDefinition | null>(null);
  const [scannedQuantity, setScannedQuantity] = useState('1');
  const codeReader = new BrowserMultiFormatReader();

  const selectedDefinition = productDefinitions.find(def => def.id === selectedDefinitionId);

  useEffect(() => {
    setProductDefinitions(MOCK_PRODUCT_DEFINITIONS);
    setSuppliers(getSuppliers());
    setManufacturersList(manufacturers);
    setStores(MOCK_STORES);
  }, []);
  
  const resetForm = () => {
    setSelectedDefinitionId('');
    setSelectedVariant('');
    setBatchNumber('');
    setQuantity('1');
    setPurchasePrice('0');
    setManufacturerId('');
    setSupplierId('');
    setStoreId('');
    setExpiryDate(new Date(new Date().setFullYear(new Date().getFullYear() + 1)));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDefinitionId || !selectedVariant || !batchNumber.trim() || !expiryDate || !manufacturerId || !storeId) {
      toast({ title: t('error'), description: t('please_complete_all_fields'), variant: "destructive" });
      return;
    }
    
    const newInventoryItem: Partial<InventoryItem> = {
      id: `inv_${Date.now()}`,
      productDefinitionId: selectedDefinitionId,
      variant: selectedVariant,
      quantity: parseInt(quantity) || 0,
      storeId: storeId,
      purchasePrice: parseFloat(purchasePrice) || 0,
      manufacturerId: manufacturerId,
      supplierId: supplierId,
      batchNumber: batchNumber,
      expiryDate: expiryDate.toISOString(),
      status: 'valid',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    console.log("New Inventory Item:", newInventoryItem);
    toast({ title: t('success'), description: t('item_added') });
    resetForm();
    navigate('/supplies');
  };

  const startScan = () => {
    setIsScanning(true);
    codeReader.decodeFromVideoDevice(undefined, 'video-scanner', (result, err) => {
      if (result) {
        const scannedBarcode = result.getText();
        stopScan();
        const foundProduct = productDefinitions.find(p => p.barcode === scannedBarcode);
        if (foundProduct) {
          setScannedProduct(foundProduct);
          setSelectedDefinitionId(foundProduct.id);
        } else {
          toast({ title: "Not Found", description: `No product definition with barcode: ${scannedBarcode}`, variant: 'destructive' });
        }
      }
      if (err && !(err instanceof NotFoundException)) {
        console.error(err);
        stopScan();
      }
    });
  };

  const stopScan = () => {
    codeReader.reset();
    setIsScanning(false);
  };

  const handleScannedProductConfirm = () => {
    if (!scannedProduct) return;
    setQuantity(scannedQuantity);
    setScannedProduct(null);
    setScannedQuantity('1');
  };
  
  return (
    <div className="page-container bg-background" dir={direction}>
      <Header />
      <Sidebar />
      
      <main className={`${isMobile ? 'px-4' : direction === 'rtl' ? 'pr-72 pl-8' : 'pl-72 pr-8'} transition-all`}>
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">{t('add_inventory_item')}</h1>
          
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>{t('add_new_inventory')}</CardTitle>
              <CardDescription>{t('inventory_form_description')}</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex justify-end mb-4">
                <Button type="button" variant="outline" onClick={startScan}>
                  <ScanBarcode className="mr-2 h-5 w-5" />
                  {t('scan_barcode_to_find')}
                </Button>
              </div>
              {isScanning && (
                <div className="mb-4 p-4 border rounded-lg bg-black">
                  <video id="video-scanner" className="w-full h-auto rounded-md"></video>
                  <Button variant="destructive" className="w-full mt-2" onClick={stopScan}>Stop Scanning</Button>
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="product-definition">{t('product')}</Label>
                    <Select value={selectedDefinitionId} onValueChange={setSelectedDefinitionId}>
                      <SelectTrigger><SelectValue placeholder={t('select_product')} /></SelectTrigger>
                      <SelectContent>{productDefinitions.map((def) => <SelectItem key={def.id} value={def.id}>{def.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="variant">{selectedDefinition?.variantLabel || t('variant')}</Label>
                    <Select value={selectedVariant} onValueChange={setSelectedVariant} disabled={!selectedDefinition}>
                      <SelectTrigger><SelectValue placeholder={t('select_variant')} /></SelectTrigger>
                      <SelectContent>{selectedDefinition?.variants.map((variant) => <SelectItem key={variant.name} value={variant.name}>{variant.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="store">{t('store')}</Label>
                    <Select value={storeId} onValueChange={setStoreId}>
                      <SelectTrigger><SelectValue placeholder={t('select_store')} /></SelectTrigger>
                      <SelectContent>{stores.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
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
                    <Label htmlFor="batch">{t('batch_number')}</Label>
                    <Input id="batch" value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quantity">{t('quantity')}</Label>
                    <Input id="quantity" type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price">{t('purchase_price')}</Label>
                    <Input id="price" type="number" min="0" step="0.01" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expiry">{t('expiry_date')}</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !expiryDate && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {expiryDate ? format(expiryDate, "PPP") : <span>{t('pick_date')}</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={expiryDate} onSelect={setExpiryDate} initialFocus /></PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div className="flex justify-end space-x-4 pt-6 border-t">
                  <Button type="button" variant="outline" onClick={resetForm} className="gap-2"><RotateCcw className="h-4 w-4" />{t('reset')}</Button>
                  <Button type="submit" className="gap-2"><Save className="h-4 w-4" />{t('save')}</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>

      <Dialog open={!!scannedProduct} onOpenChange={() => setScannedProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('product_found')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p><strong>{t('product')}:</strong> {scannedProduct?.name}</p>
            <div className="space-y-2">
              <Label htmlFor="scanned-quantity">{t('enter_quantity')}</Label>
              <Input id="scanned-quantity" type="number" min="1" value={scannedQuantity} onChange={(e) => setScannedQuantity(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleScannedProductConfirm}>{t('confirm')}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AddInventoryPage;
