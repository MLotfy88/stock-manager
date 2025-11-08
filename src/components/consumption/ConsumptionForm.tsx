import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Plus, ScanBarcode, Camera, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ConsumptionRecord, ConsumptionItem, InventoryItem, ProductDefinition, Store } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { BarcodeScannerViewfinder } from '@/components/ui/BarcodeScannerViewfinder';
import { MobileSupplyItemCard } from '@/components/supplies/MobileSupplyItemCard';
import { addConsumptionRecord } from '@/data/operations/consumptionOperations';
import { getInventoryItems } from '@/data/operations/suppliesOperations';
import { getProductDefinitions } from '@/data/operations/productDefinitionOperations';
import { getStores } from '@/data/operations/storesOperations';
import FormHeader from './FormHeader';
import DateSelector from './DateSelector';
import NotesInput from './NotesInput';
import ConsumptionItemsTable from './ConsumptionItemsTable';
import FormActions from './FormActions';
import { useAuth } from '@/contexts/AuthContext';
import { trackEvent } from '@/lib/tracking';

interface ConsumptionFormProps {
  onSuccess?: () => void;
}

const ConsumptionForm: React.FC<ConsumptionFormProps> = ({ onSuccess }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [productDefs, setProductDefs] = useState<ProductDefinition[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<(Partial<ConsumptionItem> & { id: string; availableQuantity?: number })[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [manualBarcode, setManualBarcode] = useState('');
  const [isContinuousScanning, setIsContinuousScanning] = useState(false);
  const [activeScannerId, setActiveScannerId] = useState<string | null>(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        const [defsData, storesData] = await Promise.all([
          getProductDefinitions(),
          getStores(),
        ]);
        setProductDefs(defsData);
        setStores(storesData);
      } catch (error) {
        console.error("Failed to fetch initial form data", error);
          toast({ title: t('error'), description: t('error_fetching_data'), variant: 'destructive' });
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, [toast, t]);

  useEffect(() => {
    if (selectedStoreId) {
      const fetchInventoryForStore = async () => {
        try {
          const inventoryData = await getInventoryItems(selectedStoreId);
          setInventory(inventoryData);
          console.log(`Inventory for store ${selectedStoreId}:`, inventoryData); // DEBUG LOG
        } catch (error) {
          console.error(`Failed to fetch inventory for store ${selectedStoreId}`, error);
          toast({ title: t('error'), description: t('error_fetching_inventory'), variant: 'destructive' });
        }
      };
      fetchInventoryForStore();
    } else {
      setInventory([]); // Clear inventory if no store is selected
    }
  }, [selectedStoreId, toast, t]);

  const findAndAddItemByBarcode = useCallback((barcode: string) => {
    const trimmedBarcode = barcode.trim();
    if (!trimmedBarcode) return;

    const foundItem = inventory.find(item => item.barcode && item.barcode.trim() === trimmedBarcode);

    if (foundItem) {
      if (navigator.vibrate) navigator.vibrate(100);
      const newItemId = `item_${Date.now()}`;
      setItems(prev => [...prev, { id: newItemId, inventory_item_id: foundItem.id, quantity: 1, availableQuantity: foundItem.quantity }]);
      toast({ title: t('item_added'), description: `${productDefs.find(p => p.id === foundItem.product_definition_id)?.name} - ${foundItem.variant}` });
      setManualBarcode(''); // Clear input after successful add
    } else {
      toast({ title: t('not_found'), description: `${t('item_with_barcode')} ${trimmedBarcode} ${t('not_found_in_store')}.`, variant: 'destructive' });
    }
  }, [inventory, productDefs, t, toast]);

  const handleManualBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    findAndAddItemByBarcode(manualBarcode);
  };

  const availableSupplies = inventory; // Already filtered by store

  const handleItemChange = useCallback((itemId: string, field: keyof ConsumptionItem, value: any) => {
    setItems(prevItems => prevItems.map(item => {
      if (item.id === itemId) {
        const updatedItem = { ...item, [field]: value };
        if (field === 'inventory_item_id') {
          const selectedSupply = inventory.find(s => s.id === value);
          updatedItem.availableQuantity = selectedSupply?.quantity || 0;
        }
        return updatedItem;
      }
      return item;
    }));
  }, [inventory]);

  const {
    videoRef,
    isScannerActive,
    error: scannerError,
    startScanner: startScannerHook,
    stopScanner,
    captureAndDecode,
  } = useBarcodeScanner({
    onScanSuccess: (scannedBarcode: string) => {
      // Enhanced Debugging
      const trimmedBarcode = scannedBarcode.trim();
      console.log(`--- Barcode Scan Event ---`);
      console.log(`Original Scanned: "${scannedBarcode}" | Trimmed: "${trimmedBarcode}"`);
      console.log(`Store ID: ${selectedStoreId}`);
      console.log(`Available Supplies Count: ${availableSupplies.length}`);
      
      // Log all available barcodes for easy comparison
      const availableBarcodes = availableSupplies.map(item => item.barcode);
      console.log('Available Barcodes:', availableBarcodes);

      const foundItem = availableSupplies.find(item => item.barcode && item.barcode.trim() === trimmedBarcode);
      
      console.log('Found Item:', foundItem);
      console.log(`--------------------------`);

      if (foundItem) {
        if (navigator.vibrate) navigator.vibrate(100);

        if (isContinuousScanning) {
          findAndAddItemByBarcode(scannedBarcode);
        } else if (activeScannerId) {
          handleItemChange(activeScannerId, 'inventory_item_id', foundItem.id);
          toast({ title: t('item_found'), description: `${t('item_with_barcode')} ${scannedBarcode} ${t('selected')}.` });
          stopScanner();
        }
      } else {
        toast({ title: t('not_found'), description: `${t('item_with_barcode')} ${trimmedBarcode} ${t('not_found_in_store')}.`, variant: 'destructive' });
      }
    },
    onScanFailure: (error: Error) => {
      toast({ title: t('scan_error'), description: error.message, variant: 'destructive' });
    },
  });

  useEffect(() => {
    if (scannerError) {
      toast({ title: t('scanner_error'), description: scannerError, variant: 'destructive' });
    }
  }, [scannerError, toast, t]);

  const startScan = useCallback((itemId: string, continuous = false) => {
    if (!selectedStoreId) {
      toast({ title: t('error'), description: t('please_select_store_first'), variant: 'destructive' });
      return;
    }
    setIsContinuousScanning(continuous);
    setActiveScannerId(itemId);
    startScannerHook();
  }, [selectedStoreId, toast, t, startScannerHook]);

  const addNewItem = () => {
    setItems(prevItems => [...prevItems, { id: `item_${Date.now()}`, quantity: 1, inventory_item_id: '' }]);
  };

  const removeItem = (itemId: string) => {
    setItems(prevItems => prevItems.filter(item => item.id !== itemId));
  };

  const isFormValid = () => {
    if (!date || !selectedStoreId || items.length === 0) return false;
    for (const item of items) {
      if (!item.inventory_item_id || !item.quantity || item.quantity <= 0 || item.quantity > item.availableQuantity!) {
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid()) {
      toast({ title: t('error'), description: t('please_complete_all_fields_correctly'), variant: 'destructive' });
      return;
    }
    
    const recordPayload: Omit<ConsumptionRecord, 'id' | 'created_at' | 'items' | 'status'> = {
      date: date!.toISOString().split('T')[0],
      department: stores.find(s => s.id === selectedStoreId)?.name || 'N/A',
      requested_by: 'System', // This should be replaced with actual user later
      notes,
      purpose: 'use',
    };

    const itemsPayload = items.map(item => ({
      inventory_item_id: item.inventory_item_id!,
      quantity: Number(item.quantity),
    }));

    try {
      await addConsumptionRecord(recordPayload, itemsPayload);
      toast({ title: t('success'), description: t('consumption_record_created') });

      // Track the event
      const consumedItemsDetails = items.map(item => {
        const inventoryItem = inventory.find(i => i.id === item.inventory_item_id);
        const product = productDefs.find(p => p.id === inventoryItem?.product_definition_id);
        return {
          product: product?.name || 'Unknown',
          variant: inventoryItem?.variant || 'N/A',
          quantity: item.quantity,
        };
      });

      trackEvent('Consumption Recorded', user, {
        department: recordPayload.department,
        notes: recordPayload.notes,
        items: consumedItemsDetails,
      });

      if (onSuccess) onSuccess();
    } catch (error: any) {
      const msg = error.message === 'insufficient_quantity' ? t('insufficient_quantity') : t('error_processing_consumption');
      toast({ title: t('error'), description: msg, variant: 'destructive' });
    }
  };

  return (
    <Card className="mb-8">
      <FormHeader title="new_consumption" description="consumption_form_description" />
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DateSelector date={date} setDate={setDate} />
            <div className="space-y-2">
              <Label htmlFor="store">{t('store')}</Label>
              <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
                <SelectTrigger><SelectValue placeholder={t('select_store')} /></SelectTrigger>
                <SelectContent>{stores.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <NotesInput notes={notes} setNotes={setNotes} useTextarea={true} />
          
          <div className="space-y-4">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <h3 className="text-lg font-medium">{t('items')}</h3>
              <div className="flex gap-2 flex-wrap">
                 <form onSubmit={handleManualBarcodeSubmit} className="flex gap-2">
                  <Input
                    type="text"
                    placeholder={t('enter_barcode_manually')}
                    value={manualBarcode}
                    onChange={(e) => setManualBarcode(e.target.value)}
                    disabled={!selectedStoreId}
                  />
                  <Button type="submit" variant="secondary" size="sm" disabled={!selectedStoreId || !manualBarcode}>
                    <Search className="h-4 w-4 mr-1" />{t('find_item')}
                  </Button>
                </form>
                <Button type="button" variant="outline" size="sm" onClick={() => startScan('continuous', true)} disabled={!selectedStoreId}>
                  <Camera className="h-4 w-4 mr-1" />{t('scan_continuously')}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={addNewItem} disabled={!selectedStoreId}>
                  <Plus className="h-4 w-4 mr-1" />{t('add_item')}
                </Button>
              </div>
            </div>
            {isScannerActive && (
              <div className="fixed inset-0 bg-black z-50">
                <video ref={videoRef} className="w-full h-full object-cover" playsInline autoPlay />
                <BarcodeScannerViewfinder onCapture={captureAndDecode} />
                <div className="absolute top-4 right-4 z-[51]">
                  <Button variant="destructive" onClick={stopScanner}>{t('stop_scanning')}</Button>
                </div>
              </div>
            )}
            
            <ConsumptionItemsTable
              items={items}
              handleItemChange={handleItemChange}
              removeItem={removeItem}
              startScan={startScan}
              availableSupplies={availableSupplies}
              productDefs={productDefs}
            />
          </div>
          
          <FormActions onReset={() => setItems([])} isValid={isFormValid()} />
        </form>
      </CardContent>
    </Card>
  );
};

export default ConsumptionForm;
