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
import { useBarcodeScanner, extractGS1DataForSupply, ParsedGS1Data } from '@/hooks/useBarcodeScanner';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BarcodeScannerViewfinder } from '@/components/ui/BarcodeScannerViewfinder';
import { MobileSupplyItemCard } from '@/components/supplies/MobileSupplyItemCard';
import { getStores } from '@/data/operations/storesOperations';
import { getProductDefinitions } from '@/data/operations/productDefinitionOperations';
import { getInventoryItems, transferInventoryItems } from '@/data/operations/suppliesOperations';
import { useAuth } from '@/contexts/AuthContext';
import { trackEvent } from '@/lib/tracking';

interface TransferItem extends InventoryItem {
  transferQuantity: number;
}

const TransferInventoryPage = () => {
  const { user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 1024px)');
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

  const [isContinuousScanning, setIsContinuousScanning] = useState(false);
  const [scannedItem, setScannedItem] = useState<InventoryItem | null>(null);
  const [scannedQuantity, setScannedQuantity] = useState('1');

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

  const addItemToTransferList = (item: InventoryItem, quantity: number) => {
    const existingItem = transferList.find(i => i.id === item.id);
    if (existingItem) {
      setTransferList(transferList.map(i => i.id === item.id ? { ...i, transferQuantity: i.transferQuantity + quantity } : i));
    } else {
      setTransferList([...transferList, { ...item, transferQuantity: quantity }]);
    }
  };

  const {
    videoRef,
    isScannerActive,
    startScanner,
    stopScanner,
    captureAndDecode,
  } = useBarcodeScanner({
    onScanSuccess: (data: ParsedGS1Data) => {
      const searchValue = data.gtin || data.rawValue;

      // البحث بـ GTIN أو الباركود الكامل في المخزن المصدر
      const itemInStore = inventory.find(i =>
        ((i.gtin && i.gtin === searchValue) || (i.barcode === searchValue)) &&
        i.store_id === fromStoreId
      );

      if (itemInStore) {
        if (isContinuousScanning) {
          addItemToTransferList(itemInStore, 1);
          const itemInfo = `${productDefinitions.find(p => p.id === itemInStore.product_definition_id)?.name} - ${itemInStore.variant}\nLOT: ${itemInStore.batch_number}`;
          toast({ title: t('item_added'), description: itemInfo, duration: 4000 });
        } else {
          setScannedItem(itemInStore);
          stopScanner();
        }
      } else {
        toast({ title: t('not_found'), description: t('item_not_in_source_store'), variant: 'destructive' });
      }
    },
    onScanFailure: (error) => toast({ title: t('scan_error'), description: error.message, variant: 'destructive' }),
  });

  const handleStartScan = (continuous: boolean) => {
    if (!fromStoreId || !toStoreId) {
      toast({ title: t('error'), description: t('select_stores_first'), variant: 'destructive' });
      return;
    }
    if (fromStoreId === toStoreId) {
      toast({ title: t('error'), description: t('stores_must_be_different'), variant: 'destructive' });
      return;
    }
    setIsContinuousScanning(continuous);
    startScanner();
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

      // Track the event
      const fromStoreName = stores.find(s => s.id === fromStoreId)?.name || 'Unknown';
      const toStoreName = stores.find(s => s.id === toStoreId)?.name || 'Unknown';
      const transferredItemsDetails = transferList.map(item => ({
        product: productDefinitions.find(p => p.id === item.product_definition_id)?.name,
        variant: item.variant,
        quantity: item.transferQuantity,
      }));

      trackEvent('Inventory Transferred', user, {
        from: fromStoreName,
        to: toStoreName,
        items: transferredItemsDetails,
      });

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
                <Button onClick={() => handleStartScan(false)} disabled={isScannerActive || !fromStoreId || !toStoreId}>
                  <ScanBarcode className="mr-2 h-5 w-5" />
                  {t('scan_single_item')}
                </Button>
                <Button onClick={() => handleStartScan(true)} disabled={isScannerActive || !fromStoreId || !toStoreId}>
                  <Camera className="mr-2 h-5 w-5" />
                  {t('scan_continuously')}
                </Button>
              </div>
              {isScannerActive && (
                <div className="fixed inset-0 bg-black z-50">
                  <video ref={videoRef} className="w-full h-full object-cover" playsInline autoPlay />
                  <BarcodeScannerViewfinder onCapture={captureAndDecode} />
                  <div className="absolute top-4 right-4">
                    <Button variant="destructive" onClick={stopScanner}>{t('stop_scanning')}</Button>
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
                        <th className="p-2 text-left text-xs">{t('barcode')} / GTIN</th>
                        <th className="p-2 text-left text-xs">LOT / {t('expiry_date')}</th>
                        <th className="p-2 text-left text-xs">{t('product')}</th>
                        <th className="p-2 text-left text-xs">{t('variant')}</th>
                        <th className="p-2 text-center text-xs">{t('quantity')}</th>
                        <th className="p-2 text-right"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {transferList.length === 0 ? (
                        <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">{t('no_items_added')}</td></tr>
                      ) : (
                        transferList.map(item => (
                          <tr key={item.id} className="border-b text-xs">
                            <td className="p-2">
                              <div className="flex flex-col">
                                <span className="font-mono">{item.barcode || '-'}</span>
                                <span className="text-[10px] text-muted-foreground font-mono">{item.gtin || '-'}</span>
                              </div>
                            </td>
                            <td className="p-2">
                              <div className="flex flex-col">
                                <span className="font-mono">{item.batch_number}</span>
                                <span className="text-[10px] text-muted-foreground">{format(new Date(item.expiry_date), 'yyyy-MM-dd')}</span>
                              </div>
                            </td>
                            <td className="p-2">{productDefinitions.find(p => p.id === item.product_definition_id)?.name}</td>
                            <td className="p-2">{item.variant}</td>
                            <td className="p-2 text-center font-bold text-sm">{item.transferQuantity}</td>
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
                          <div className="space-y-3 w-full">
                            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-muted-foreground">
                              <div>BC: {item.barcode || '-'}</div>
                              <div>GTIN: {item.gtin || '-'}</div>
                              <div>LOT: {item.batch_number}</div>
                              <div>EXP: {format(new Date(item.expiry_date), 'yyyy-MM-dd')}</div>
                            </div>
                            <div className="border-t border-dashed" />
                            <div>
                              <p className="font-bold">{productDefinitions.find(p => p.id === item.product_definition_id)?.name}</p>
                              <p className="text-sm text-muted-foreground">{item.variant}</p>
                            </div>
                            <div className="flex justify-between items-center bg-muted/30 p-2 rounded">
                              <span className="text-sm">{t('quantity')}:</span>
                              <span className="font-bold">{item.transferQuantity}</span>
                            </div>
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
