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
import { ArrowRightLeft, ScanBarcode, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// MOCK DATA
const MOCK_STORES: Store[] = [
    { id: '1', name: 'Main Store' },
    { id: '2', name: 'Cath Lab 1' },
];
const MOCK_PRODUCT_DEFINITIONS: ProductDefinition[] = [
  { id: '1', name: 'Diagnostic Catheter', typeId: 'catheter', barcode: '111', variantLabel: 'Curve', variants: ['L3.5', 'L4', 'R3.5', 'R4'], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '2', name: 'Balloons', typeId: 'consumable', barcode: '222', variantLabel: 'Size', variants: ['2.5x10', '2.5x15', '3.0x10'], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];
const MOCK_INVENTORY: InventoryItem[] = [
    { id: 'inv1', productDefinitionId: '1', variant: 'L3.5', quantity: 10, storeId: '1', manufacturerId: '1', batchNumber: 'B1', expiryDate: '2025-12-31', status: 'valid', createdAt: '', updatedAt: '' },
    { id: 'inv2', productDefinitionId: '2', variant: '2.5x10', quantity: 5, storeId: '1', manufacturerId: '2', batchNumber: 'B2', expiryDate: '2026-01-31', status: 'valid', createdAt: '', updatedAt: '' },
    { id: 'inv3', productDefinitionId: '1', variant: 'L4', quantity: 8, storeId: '2', manufacturerId: '1', batchNumber: 'B3', expiryDate: '2025-11-30', status: 'valid', createdAt: '', updatedAt: '' },
];
// END MOCK DATA

interface TransferItem extends InventoryItem {
    transferQuantity: number;
}

const TransferInventoryPage = () => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { t, direction } = useLanguage();
  const { toast } = useToast();

  const [stores, setStores] = useState<Store[]>(MOCK_STORES);
  const [fromStoreId, setFromStoreId] = useState<string>('');
  const [toStoreId, setToStoreId] = useState<string>('');
  const [transferList, setTransferList] = useState<TransferItem[]>([]);
  
  // Scanner State
  const [isScanning, setIsScanning] = useState(false);
  const [scannedItem, setScannedItem] = useState<InventoryItem | null>(null);
  const [scannedQuantity, setScannedQuantity] = useState('1');
  const codeReader = new BrowserMultiFormatReader();

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
    codeReader.decodeFromVideoDevice(undefined, 'video-scanner-transfer', (result, err) => {
      if (result) {
        const scannedBarcode = result.getText();
        stopScan();
        const productDef = MOCK_PRODUCT_DEFINITIONS.find(p => p.barcode === scannedBarcode);
        if (productDef) {
            const itemsInStore = MOCK_INVENTORY.filter(i => i.productDefinitionId === productDef.id && i.storeId === fromStoreId);
            if (itemsInStore.length > 0) {
                // For simplicity, we take the first available batch. A real scenario might let the user choose.
                setScannedItem(itemsInStore[0]);
            } else {
                toast({ title: t('not_found'), description: t('item_not_in_source_store'), variant: 'destructive' });
            }
        } else {
          toast({ title: t('not_found'), description: `No product with barcode: ${scannedBarcode}`, variant: 'destructive' });
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

  const handleConfirmScan = () => {
    if (!scannedItem) return;
    const quantity = parseInt(scannedQuantity);
    if (quantity > scannedItem.quantity) {
        toast({ title: t('error'), description: t('insufficient_quantity'), variant: 'destructive' });
        return;
    }
    
    const existingItem = transferList.find(item => item.id === scannedItem.id);
    if (existingItem) {
        // Update quantity if item is already in the list
        setTransferList(transferList.map(item => item.id === scannedItem.id ? { ...item, transferQuantity: item.transferQuantity + quantity } : item));
    } else {
        // Add new item to the list
        setTransferList([...transferList, { ...scannedItem, transferQuantity: quantity }]);
    }

    setScannedItem(null);
    setScannedQuantity('1');
  };

  const handleRemoveItem = (itemId: string) => {
    setTransferList(transferList.filter(item => item.id !== itemId));
  };

  const handleConfirmTransfer = () => {
    if (transferList.length === 0) return;
    // In a real app, this would trigger a Supabase transaction
    console.log("Transferring items:", transferList, "From:", fromStoreId, "To:", toStoreId);
    toast({ title: t('success'), description: t('transfer_successful') });
    setTransferList([]);
    setFromStoreId('');
    setToStoreId('');
  };

  return (
    <div className="page-container bg-background" dir={direction}>
      <Header />
      <Sidebar />
      <main className={`${isMobile ? 'px-4' : direction === 'rtl' ? 'pr-72 pl-8' : 'pl-72 pr-8'} transition-all`}>
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
              <div className="text-center">
                <Button onClick={handleScan} disabled={isScanning}>
                  <ScanBarcode className="mr-2 h-5 w-5" />
                  {isScanning ? t('scanning') : t('start_scanning')}
                </Button>
              </div>
              {isScanning && (
                <div className="p-4 border rounded-lg bg-black">
                  <video id="video-scanner-transfer" className="w-full h-auto rounded-md"></video>
                  <Button variant="destructive" className="w-full mt-2" onClick={stopScan}>{t('stop_scanning')}</Button>
                </div>
              )}
              <div>
                <h3 className="text-lg font-medium mb-2">{t('items_to_transfer')}</h3>
                <div className="border rounded-md">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="p-2 text-left">{t('product')}</th>
                        <th className="p-2 text-left">{t('variant')}</th>
                        <th className="p-2 text-center">{t('quantity')}</th>
                        <th className="p-2 text-right"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {transferList.map(item => (
                        <tr key={item.id} className="border-b">
                          <td className="p-2">{MOCK_PRODUCT_DEFINITIONS.find(p => p.id === item.productDefinitionId)?.name}</td>
                          <td className="p-2">{item.variant}</td>
                          <td className="p-2 text-center">{item.transferQuantity}</td>
                          <td className="p-2 text-right">
                            <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
            <p><strong>{t('product')}:</strong> {MOCK_PRODUCT_DEFINITIONS.find(p => p.id === scannedItem?.productDefinitionId)?.name}</p>
            <p><strong>{t('variant')}:</strong> {scannedItem?.variant}</p>
            <p><strong>{t('batch_number')}:</strong> {scannedItem?.batchNumber}</p>
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
