import React, { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { useMediaQuery } from '@/hooks/use-mobile';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Store, ProductDefinition, InventoryItem } from '@/types';
import { ArrowRightLeft, ScanBarcode, Trash2, Camera } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { BrowserBarcodeReader, NotFoundException, DecodeHintType, BarcodeFormat } from '@zxing/library';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BarcodeScannerViewfinder } from '@/components/ui/BarcodeScannerViewfinder';
import { MobileSupplyItemCard } from '@/components/supplies/MobileSupplyItemCard';
import { getStores } from '@/data/operations/storesOperations';
import { getProductDefinitions } from '@/data/operations/productDefinitionOperations';
import { getInventoryItems, transferInventoryItems } from '@/data/operations/suppliesOperations';

interface TransferItem extends InventoryItem {
    transferQuantity: number;
}

const TransferInventoryPage = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { t, direction } = useLanguage();
  const { toast } = useToast();

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const closeSidebar = () => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  };

  const [stores, setStores] = useState<Store[]>([]);
  const [productDefinitions, setProductDefinitions] = useState<ProductDefinition[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [fromStoreId, setFromStoreId] = useState<string>('');
  const [toStoreId, setToStoreId] = useState<string>('');
  const [transferList, setTransferList] = useState<TransferItem[]>([]);
  
  const [isScanning, setIsScanning] = useState(false);
  const [isContinuousScanning, setIsContinuousScanning] = useState(false);
  const [scannedItem, setScannedItem] = useState<InventoryItem | null>(null);
  const [scannedQuantity, setScannedQuantity] = useState('1');

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
  const codeReader = new BrowserBarcodeReader();
  // --- End Optimization ---

  useEffect(() => {
    const loadData = async () => {
      try {
        const [storesData, productsData, inventoryData] = await Promise.all([
          getStores(),
          getProductDefinitions(),
          getInventoryItems()
        ]);
        setStores(storesData);
        setProductDefinitions(productsData);
        setInventory(inventoryData);
      } catch (error) {
        toast({ title: t('error'), description: t('error_fetching_data'), variant: 'destructive' });
      }
    };
    loadData();
  }, [toast, t]);

  const handleScan = () => {
    if (!fromStoreId || !toStoreId) {
      toast({ title: t('error'), description: t('select_stores_first'), variant: 'destructive' });
      return;
    }
    if (fromStoreId === toStoreId) {
      toast({ title: t('error'), description: t('stores_must_be_different'), variant: 'destructive' });
      return;
    }
    setIsScanning(true);
    
    const constraints: MediaStreamConstraints = {
      video: {
        facingMode: 'environment',
        height: { ideal: 1080 },
        advanced: [{ focusMode: 'continuous' } as any]
      }
    };

    codeReader.decodeFromConstraints(constraints, 'video-scanner-transfer', (result, err) => {
      if (result) {
        const scannedBarcode = result.getText();
        if (isContinuousScanning) {
          handleBarcodeScanned(scannedBarcode, true);
        } else {
          stopScan();
          handleBarcodeScanned(scannedBarcode, false);
        }
      }
      if (err && !(err instanceof NotFoundException)) {
        // Ignore not found errors
      }
    });
  };

  const handleBarcodeScanned = (barcode: string, isContinuous: boolean) => {
    const itemInStore = inventory.find(i => i.barcode === barcode && i.store_id === fromStoreId);
    if (itemInStore) {
      if (isContinuous) {
        addItemToTransferList(itemInStore, 1);
        toast({ title: t('item_added'), description: `${productDefinitions.find(p => p.id === itemInStore.product_definition_id)?.name} - ${itemInStore.variant}` });
      } else {
        setScannedItem(itemInStore);
      }
    } else {
      toast({ title: t('not_found'), description: t('item_not_in_source_store'), variant: 'destructive' });
    }
  };

  const addItemToTransferList = (item: InventoryItem, quantity: number) => {
    const existingItem = transferList.find(i => i.id === item.id);
    if (existingItem) {
      setTransferList(transferList.map(i => i.id === item.id ? { ...i, transferQuantity: i.transferQuantity + quantity } : i));
    } else {
      setTransferList([...transferList, { ...item, transferQuantity: quantity }]);
    }
  };

  const stopScan = () => {
    codeReader.reset();
    setIsScanning(false);
    setIsContinuousScanning(false);
  };

  const handleConfirmScan = () => {
    if (!scannedItem) return;
    const quantity = parseInt(scannedQuantity);
    if (isNaN(quantity) || quantity <= 0 || quantity > scannedItem.quantity) {
        toast({ title: t('error'), description: t('invalid_or_insufficient_quantity'), variant: 'destructive' });
        return;
    }
    
    addItemToTransferList(scannedItem, quantity);
    setScannedItem(null);
    setScannedQuantity('1');
  };

  const handleRemoveItem = (itemId: string) => {
    setTransferList(transferList.filter(item => item.id !== itemId));
  };

  const handleConfirmTransfer = async () => {
    if (transferList.length === 0) return;
    try {
      const itemsToTransfer = transferList.map(item => ({
        itemId: item.id,
        quantity: item.transferQuantity,
        fromStoreId: fromStoreId,
        toStoreId: toStoreId,
      }));
      
      await transferInventoryItems(itemsToTransfer);

      toast({ title: t('success'), description: t('transfer_successful') });
      
      // Refresh data
      const updatedInventory = await getInventoryItems();
      setInventory(updatedInventory);

      setTransferList([]);
      setFromStoreId('');
      setToStoreId('');
    } catch (error) {
      toast({ title: t('error'), description: t('transfer_failed'), variant: 'destructive' });
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
      <main className={`${isMobile ? 'px-4' : direction === 'rtl' ? 'pr-72 pl-8' : 'pl-72 pr-8'} transition-all pt-20`}>
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">{t('transfer_inventory')}</h1>
          <Card>
            <CardHeader>
              <CardTitle>{t('transfer_details')}</CardTitle>
              <CardDescription>{t('select_source_destination')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <Select value={fromStoreId} onValueChange={setFromStoreId}>
                  <SelectTrigger><SelectValue placeholder={t('from_store')} /></SelectTrigger>
                  <SelectContent>{stores.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
                <div className="flex justify-center">
                  <ArrowRightLeft className="h-6 w-6 text-muted-foreground" />
                </div>
                <Select value={toStoreId} onValueChange={setToStoreId}>
                  <SelectTrigger><SelectValue placeholder={t('to_store')} /></SelectTrigger>
                  <SelectContent>{stores.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex justify-center gap-4">
                <Button onClick={handleScan} disabled={isScanning || !fromStoreId || !toStoreId}>
                  <ScanBarcode className="mr-2 h-5 w-5" />
                  {t('scan_single_item')}
                </Button>
                <Button onClick={() => { setIsContinuousScanning(true); handleScan(); }} disabled={isScanning || !fromStoreId || !toStoreId}>
                  <Camera className="mr-2 h-5 w-5" />
                  {t('scan_continuously')}
                </Button>
              </div>
              {isScanning && (
                <div className="fixed inset-0 bg-black z-50">
                  <video id="video-scanner-transfer" className="w-full h-full object-cover"></video>
                  <BarcodeScannerViewfinder />
                  <div className="absolute top-4 right-4">
                    <Button variant="destructive" onClick={stopScan}>{t('stop_scanning')}</Button>
                  </div>
                </div>
              )}
              <div>
                <h3 className="text-lg font-medium mb-2">{t('items_to_transfer')}</h3>
                {/* Desktop Table */}
                <div className="border rounded-md hidden md:block">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr className="border-b">
                        <th className="p-2 text-left">{t('product')}</th>
                        <th className="p-2 text-left">{t('variant')}</th>
                        <th className="p-2 text-center">{t('quantity')}</th>
                        <th className="p-2 text-right"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {transferList.length === 0 ? (
                        <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">{t('no_items_added')}</td></tr>
                      ) : (
                        transferList.map(item => (
                          <tr key={item.id} className="border-b">
                            <td className="p-2">{productDefinitions.find(p => p.id === item.product_definition_id)?.name}</td>
                            <td className="p-2">{item.variant}</td>
                            <td className="p-2 text-center">{item.transferQuantity}</td>
                            <td className="p-2 text-right">
                              <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {/* Mobile Cards */}
                <div className="md:hidden space-y-4">
                  {transferList.length === 0 ? (
                    <p className="p-4 text-center text-muted-foreground">{t('no_items_added')}</p>
                  ) : (
                    transferList.map(item => (
                      <Card key={item.id} className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold">{productDefinitions.find(p => p.id === item.product_definition_id)?.name}</p>
                            <p className="text-sm text-muted-foreground">{item.variant}</p>
                            <p className="text-sm">{t('quantity')}: {item.transferQuantity}</p>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleConfirmTransfer} disabled={transferList.length === 0}>{t('confirm_transfer')}</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Dialog open={!!scannedItem} onOpenChange={() => setScannedItem(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('confirm_item_quantity')}</DialogTitle></DialogHeader>
          <div className="py-4 space-y-4">
            <p><strong>{t('product')}:</strong> {productDefinitions.find(p => p.id === scannedItem?.product_definition_id)?.name}</p>
            <p><strong>{t('variant')}:</strong> {scannedItem?.variant}</p>
            <p><strong>{t('batch_number')}:</strong> {scannedItem?.batch_number}</p>
            <p><strong>{t('available_quantity')}:</strong> {scannedItem?.quantity}</p>
            <div className="space-y-2">
              <Label htmlFor="transfer-quantity">{t('quantity_to_transfer')}</Label>
              <Input id="transfer-quantity" type="number" min="1" max={scannedItem?.quantity} value={scannedQuantity} onChange={e => setScannedQuantity(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleConfirmScan}>{t('add_to_list')}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TransferInventoryPage;
