
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
import { ArrowRightLeft, ScanBarcode, Trash2, Camera, AlertTriangle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useBarcodeScanner, ParsedGS1Data } from '@/hooks/useBarcodeScanner';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { BarcodeScannerViewfinder } from '@/components/ui/BarcodeScannerViewfinder';
import { getStores } from '@/data/operations/storesOperations';
import { getProductDefinitions } from '@/data/operations/productDefinitionOperations';
import { getInventoryItems, transferInventoryItems } from '@/data/operations/suppliesOperations';
import { useAuth } from '@/contexts/AuthContext';
import { trackEvent } from '@/lib/tracking';
import { SwipeableList, SwipeableItem } from '@/components/layout/SwipeableList';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { scanSuccessFeedback, scanErrorFeedback, playTick } from '@/utils/audioFeedback';

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
  const closeSidebar = () => setIsSidebarOpen(false);

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
      if (existingItem.transferQuantity + quantity > item.quantity) {
        toast({ title: t('error'), description: t('insufficient_quantity'), variant: 'destructive' });
        return;
      }
      setTransferList(transferList.map(i => i.id === item.id ? { ...i, transferQuantity: i.transferQuantity + quantity } : i));
    } else {
      setTransferList([...transferList, { ...item, transferQuantity: quantity }]);
    }
    playTick();
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

      // 1. Try Exact Match (GTIN + Lot + Expiry)
      let matchedItem = inventory.find(i =>
        i.store_id === fromStoreId &&
        (i.gtin === data.gtin || i.barcode === data.rawValue) &&
        (!data.lotNumber || i.batch_number === data.lotNumber)
        // Note: Expiry match can be tricky due to date formats, relying on Lot mostly
      );

      // 2. Fallback: Relaxed Match (GTIN Only)
      if (!matchedItem && data.gtin) {
        matchedItem = inventory.find(i =>
          i.store_id === fromStoreId &&
          i.gtin === data.gtin
        );
      }

      // 3. Fallback: Barcode Only
      if (!matchedItem) {
        matchedItem = inventory.find(i =>
          i.store_id === fromStoreId &&
          i.barcode === searchValue
        );
      }

      if (matchedItem) {
        scanSuccessFeedback(true);
        if (isContinuousScanning) {
          addItemToTransferList(matchedItem, 1);
          const productName = productDefinitions.find(p => p.id === matchedItem?.product_definition_id)?.name;
          toast({
            title: "✅ " + t('item_added'),
            description: `${productName} \nLOT: ${matchedItem.batch_number}`,
            className: "bg-green-50 border-green-200"
          });
        } else {
          setScannedItem(matchedItem);
          stopScanner();
        }
      } else {
        scanErrorFeedback();
        toast({
          title: "❌ " + t('not_found'),
          description: t('item_not_in_source_store'),
          variant: 'destructive'
        });
      }
    },
    onScanFailure: (error) => {
      // scanErrorFeedback(); // Optional: don't beep on every frame fail
      // toast({ title: t('scan_error'), description: error.message, variant: 'destructive' });
    },
  });

  const handleStartScan = (continuous: boolean) => {
    if (!fromStoreId || !toStoreId) {
      toast({ title: t('error'), description: "⚠️ " + t('select_stores_first'), variant: 'destructive' });
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

      // Track event
      const fromStoreName = stores.find(s => s.id === fromStoreId)?.name || 'Unknown';
      const toStoreName = stores.find(s => s.id === toStoreId)?.name || 'Unknown';
      trackEvent('Inventory Transferred', user, { from: fromStoreName, to: toStoreName, itemCount: transferList.length });

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
      <Sidebar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} closeSidebar={closeSidebar} />

      <main className={`transition-all duration-300 ${isMobile ? 'px-4' : direction === 'rtl' ? 'pr-72 pl-8' : 'pl-72 pr-8'} pt-6`}>
        <div className="max-w-4xl mx-auto space-y-6">

          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <ArrowRightLeft className="h-8 w-8 text-primary" />
                {t('transfer_inventory')}
              </h1>
              <p className="text-muted-foreground mt-1">{t('transfer_details')}</p>
            </div>
          </div>

          <Card className="glass-card shadow-lg border-t-4 border-t-primary">
            <CardContent className="pt-6 space-y-6">

              {/* Store Selection */}
              <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-center bg-muted/30 p-4 rounded-xl">
                <div className="md:col-span-3 space-y-2">
                  <Label>{t('from_store')}</Label>
                  <Select value={fromStoreId} onValueChange={setFromStoreId}>
                    <SelectTrigger className="h-11 bg-background"><SelectValue placeholder={t('select_store')} /></SelectTrigger>
                    <SelectContent>{stores.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>

                <div className="flex justify-center md:col-span-1">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <ArrowRightLeft className={`h-5 w-5 text-primary ${direction === 'rtl' ? 'rotate-180' : ''}`} />
                  </div>
                </div>

                <div className="md:col-span-3 space-y-2">
                  <Label>{t('to_store')}</Label>
                  <Select value={toStoreId} onValueChange={setToStoreId}>
                    <SelectTrigger className="h-11 bg-background"><SelectValue placeholder={t('select_store')} /></SelectTrigger>
                    <SelectContent>{stores.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap justify-center gap-4">
                <Button
                  onClick={() => handleStartScan(false)}
                  disabled={isScannerActive || !fromStoreId || !toStoreId}
                  size="lg"
                  className="shadow-md"
                >
                  <ScanBarcode className="mr-2 h-5 w-5" />
                  {t('scan_single_item')}
                </Button>
                <Button
                  onClick={() => handleStartScan(true)}
                  disabled={isScannerActive || !fromStoreId || !toStoreId}
                  variant="secondary"
                  size="lg"
                  className="shadow-sm"
                >
                  <Camera className="mr-2 h-5 w-5" />
                  {t('scan_continuously')}
                </Button>
              </div>

              {/* Transfer List */}
              <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Badge variant="outline" className="h-6 w-6 rounded-full flex items-center justify-center p-0">
                      {transferList.length}
                    </Badge>
                    {t('items_to_transfer')}
                  </h3>
                  {transferList.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={() => setTransferList([])} className="text-destructive text-xs h-8">
                      {t('clear_all')}
                    </Button>
                  )}
                </div>

                {/* Desktop View */}
                <div className="hidden md:block border rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full">
                    <thead className="bg-muted/50 text-xs uppercase text-muted-foreground font-semibold">
                      <tr>
                        <th className="p-4 text-start">{t('product')}</th>
                        <th className="p-4 text-start">GTIN / LOT</th>
                        <th className="p-4 text-center">{t('expiry_date')}</th>
                        <th className="p-4 text-center">{t('quantity')}</th>
                        <th className="p-4"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {transferList.length === 0 ? (
                        <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">{t('no_items_added')}</td></tr>
                      ) : (
                        transferList.map(item => (
                          <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                            <td className="p-4">
                              <div className="font-medium text-sm">{productDefinitions.find(p => p.id === item.product_definition_id)?.name}</div>
                              <div className="text-xs text-muted-foreground">{item.variant}</div>
                            </td>
                            <td className="p-4">
                              <div className="font-mono text-xs">{item.gtin || item.barcode || '-'}</div>
                              <div className="font-mono text-xs text-muted-foreground">L: {item.batch_number}</div>
                            </td>
                            <td className="p-4 text-center text-xs">
                              {format(new Date(item.expiry_date), 'yyyy-MM-dd')}
                            </td>
                            <td className="p-4 text-center font-bold">
                              {item.transferQuantity}
                            </td>
                            <td className="p-4 text-end">
                              <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)} className="text-destructive hover:bg-destructive/10">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View with SwipeableList */}
                <div className="md:hidden">
                  {transferList.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground/50 border-2 border-dashed rounded-xl">
                      {t('no_items_added')}
                    </div>
                  ) : (
                    <SwipeableList>
                      {transferList.map(item => (
                        <SwipeableItem
                          key={item.id}
                          onDelete={() => handleRemoveItem(item.id)}
                          actions={
                            <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)} className="h-full w-12 rounded-none text-destructive">
                              <Trash2 className="h-5 w-5" />
                            </Button>
                          }
                        >
                          <div className="bg-card p-3 rounded-lg border shadow-sm flex justify-between items-center w-full">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">{productDefinitions.find(p => p.id === item.product_definition_id)?.name}</div>
                              <div className="flex gap-2 text-xs text-muted-foreground mt-0.5">
                                <Badge variant="secondary" className="text-[10px] px-1 h-5">{item.variant}</Badge>
                                <span className="font-mono">LOT: {item.batch_number}</span>
                              </div>
                            </div>
                            <div className="flex flex-col items-end pl-2 border-l ml-2">
                              <span className="text-xs text-muted-foreground">{t('qty')}</span>
                              <span className="font-bold text-lg text-primary">{item.transferQuantity}</span>
                            </div>
                          </div>
                        </SwipeableItem>
                      ))}
                    </SwipeableList>
                  )}
                </div>

              </div>

              <Button
                onClick={handleConfirmTransfer}
                disabled={transferList.length === 0}
                className="w-full h-12 text-lg shadow-lg mt-4"
              >
                {t('confirm_transfer')}
              </Button>

            </CardContent>
          </Card>
        </div>
      </main>

      {/* Scanner Overlay */}
      {isScannerActive && (
        <div className="fixed inset-0 bg-black z-50 animate-in fade-in duration-300">
          <video ref={videoRef} className="w-full h-full object-cover opacity-80" playsInline autoPlay />
          <BarcodeScannerViewfinder onCapture={captureAndDecode} />
          <div className="absolute top-8 right-4">
            <Button variant="destructive" size="sm" onClick={stopScanner} className="rounded-full px-6 shadow-xl">
              {t('stop_scanning')}
            </Button>
          </div>
          <div className="absolute bottom-20 left-0 right-0 p-4 text-center">
            <div className="inline-block bg-black/60 backdrop-blur-md text-white px-4 py-2 rounded-full text-sm">
              {isContinuousScanning ? t('continuous_scan_mode') : t('single_scan_mode')}
            </div>
          </div>
        </div>
      )}

      {/* Quantity Dialog */}
      <Dialog open={!!scannedItem} onOpenChange={() => setScannedItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('confirm_item_quantity')}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="bg-muted/30 p-4 rounded-lg space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('product')}:</span>
                <span className="font-medium text-right">{productDefinitions.find(p => p.id === scannedItem?.product_definition_id)?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('variant')}:</span>
                <span className="font-medium">{scannedItem?.variant}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('batch_number')}:</span>
                <span className="font-mono">{scannedItem?.batch_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('available_quantity')}:</span>
                <span className="font-bold text-green-600">{scannedItem?.quantity}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="transfer-quantity" className="text-lg">{t('quantity_to_transfer')}</Label>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => setScannedQuantity(Math.max(1, parseInt(scannedQuantity) - 1).toString())}>-</Button>
                <Input
                  id="transfer-quantity"
                  type="number"
                  min="1"
                  max={scannedItem?.quantity}
                  value={scannedQuantity}
                  onChange={e => setScannedQuantity(e.target.value)}
                  className="text-center text-xl h-12 font-bold"
                />
                <Button variant="outline" size="icon" onClick={() => setScannedQuantity(Math.min(scannedItem?.quantity || 999, parseInt(scannedQuantity) + 1).toString())}>+</Button>
              </div>
            </div>
            {parseInt(scannedQuantity) > (scannedItem?.quantity || 0) && (
              <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-2 rounded">
                <AlertTriangle className="h-4 w-4" />
                {t('insufficient_quantity')}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScannedItem(null)}>{t('cancel')}</Button>
            <Button onClick={handleConfirmScan}>{t('add_to_list')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default TransferInventoryPage;
