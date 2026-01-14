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
import { useBarcodeScanner, extractGS1DataForSupply, ParsedGS1Data } from '@/hooks/useBarcodeScanner';
import { getProcedureTypes, getProcedureTemplatesByType, ProcedureType, ProcedureTemplateWithItems } from '@/data/operations/procedureTemplatesOperations';
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

// Type definition for consumption items in the form
type ConsumptionItemInput = Partial<ConsumptionItem> & {
  id: string;
  availableQuantity?: number;
};

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
  const [items, setItems] = useState<ConsumptionItemInput[]>([]);
  const [procedureTypes, setProcedureTypes] = useState<ProcedureType[]>([]);
  const [selectedProcedureType, setSelectedProcedureType] = useState<string>('');
  const [procedureTemplates, setProcedureTemplates] = useState<ProcedureTemplateWithItems[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [manualBarcode, setManualBarcode] = useState('');
  const [isContinuousScanning, setIsContinuousScanning] = useState(false);
  const [activeScannerId, setActiveScannerId] = useState<string | null>(null);
  const [scanHistory, setScanHistory] = useState<string[][]>([]); // To support Undo

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        const [defsData, storesData, procedureTypesData] = await Promise.all([
          getProductDefinitions(),
          getStores(),
          getProcedureTypes(),
        ]);
        setProductDefs(defsData);
        setStores(storesData);
        setProcedureTypes(procedureTypesData);
      } catch (error) {
        console.error("Failed to fetch initial form data", error);
        toast({ title: t('error'), description: t('error_fetching_data'), variant: 'destructive' });
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, [toast, t]);

  const handleProcedureTypeChange = async (typeId: string) => {
    setSelectedProcedureType(typeId);
    setSelectedTemplate('');
    if (typeId) {
      try {
        const templates = await getProcedureTemplatesByType(typeId);
        setProcedureTemplates(templates);
      } catch (error) {
        console.error('Error loading templates:', error);
        toast({ title: t('error'), description: t('error_loading_templates'), variant: 'destructive' });
      }
    } else {
      setProcedureTemplates([]);
    }
  };

  const handleTemplateSelect = async (templateId: string) => {
    setSelectedTemplate(templateId);
    if (!templateId) return;

    const template = procedureTemplates.find(t => t.id === templateId);
    if (!template) return;

    // Add template items to the list
    const newItems: ConsumptionItemInput[] = template.items.map(item => ({
      id: `template_item_${Date.now()}_${Math.random()}`, // Unique client-side ID
      inventory_item_id: '', // Will be selected by user or scanned
      product_definition_id: item.product_definition_id,
      variant: item.variant,
      quantity: item.default_quantity,
      lot_number: '',
      expiry_date: null,
      availableQuantity: 0, // Will be updated when inventory_item_id is set
    }));

    setItems(prev => [...prev, ...newItems]);
    toast({ title: t('success'), description: `${t('added')} ${template.items.length} ${t('items_from_template')}` });
  };

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

  const saveHistory = useCallback(() => {
    setScanHistory(prev => [...prev.slice(-19), items.map(item => JSON.stringify(item))]);
  }, [items]);

  const handleUndo = useCallback(() => {
    if (scanHistory.length === 0) return;
    const previousState = scanHistory[scanHistory.length - 1];
    setItems(previousState.map(s => JSON.parse(s)));
    setScanHistory(prev => prev.slice(0, -1));
    toast({ title: t('undo'), description: t('last_action_undone') });
  }, [scanHistory, t, toast]);

  const findAndAddItemByBarcode = useCallback((barcode: string, autoDetectedData?: ParsedGS1Data) => {
    const trimmedBarcode = barcode.trim();
    if (!trimmedBarcode) return;

    // محاولة استخراج بيانات GS1 أولاً
    const gs1Data = autoDetectedData || extractGS1DataForSupply(trimmedBarcode);
    const searchValue = gs1Data?.gtin || trimmedBarcode;

    // البحث بـ GTIN أو الباركود الكامل أو عبر الـ product_id المكتشف تلقائياً
    const foundItem = inventory.find(item =>
      (autoDetectedData?.product_id && item.product_definition_id === autoDetectedData.product_id && (autoDetectedData.variant_name ? item.variant === autoDetectedData.variant_name : true)) ||
      (item.gtin && item.gtin.trim() === searchValue) ||
      (item.barcode && item.barcode.trim() === searchValue)
    );

    if (foundItem) {
      if (navigator.vibrate) navigator.vibrate(100);

      saveHistory();

      // Smart Grouping: Check if item already exists
      const existingItemIndex = items.findIndex(item => item.inventory_item_id === foundItem.id);

      if (existingItemIndex !== -1) {
        // Increment quantity
        setItems(prev => {
          const newItems = [...prev];
          const currentQty = newItems[existingItemIndex].quantity || 0;
          if (currentQty < foundItem.quantity) {
            newItems[existingItemIndex].quantity = currentQty + 1;
            toast({ title: t('quantity_updated'), description: `${productDefs.find(p => p.id === foundItem.product_definition_id)?.name}: ${currentQty + 1}` });
          } else {
            toast({ title: t('insufficient_quantity'), variant: 'destructive' });
          }
          return newItems;
        });
      } else {
        // Add new row
        const newItemId = `item_${Date.now()}`;
        setItems(prev => [...prev, { id: newItemId, inventory_item_id: foundItem.id, quantity: 1, availableQuantity: foundItem.quantity }]);

        const productName = productDefs.find(p => p.id === foundItem.product_definition_id)?.name;
        const description = gs1Data
          ? `${productName} - ${foundItem.variant}\nLOT: ${foundItem.batch_number}\nExp: ${foundItem.expiry_date}`
          : `${productName} - ${foundItem.variant}`;

        toast({ title: t('item_added'), description, duration: 5000 });
      }
      setManualBarcode(''); // Clear input after successful add
    } else {
      toast({ title: t('not_found'), description: `${t('item_with_barcode')} ${searchValue} ${t('not_found_in_store')}.`, variant: 'destructive' });
    }
  }, [inventory, productDefs, t, toast, items, saveHistory]);

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
    onScanSuccess: (data: ParsedGS1Data) => {
      const trimmedBarcode = data.rawValue.trim();
      console.log(`--- Barcode Scan Event ---`);
      console.log(`Original Scanned: "${data.rawValue}" | Trimmed: "${trimmedBarcode}"`);

      // البحث بـ GTIN أو الباركود الكامل أو عبر البيانات المكتشفة تلقائياً
      const searchValue = data.gtin || trimmedBarcode;
      const foundItem = availableSupplies.find(item =>
        (data.product_id && item.product_definition_id === data.product_id && (data.variant_name ? item.variant === data.variant_name : true)) ||
        (item.gtin && item.gtin.trim() === searchValue) ||
        (item.barcode && item.barcode.trim() === searchValue)
      );

      console.log('Found Item:', foundItem);
      console.log(`--------------------------`);

      if (foundItem) {
        if (navigator.vibrate) navigator.vibrate(100);

        if (isContinuousScanning) {
          findAndAddItemByBarcode(data.rawValue, data);
        } else if (activeScannerId) {
          saveHistory();
          handleItemChange(activeScannerId, 'inventory_item_id', foundItem.id);
          const itemInfo = data.gtin
            ? `GTIN: ${data.gtin}\nLOT: ${foundItem.batch_number}\nExp: ${foundItem.expiry_date}`
            : `${t('barcode')}: ${data.rawValue}`;
          toast({ title: t('item_found'), description: itemInfo, duration: 5000 });
          stopScanner();
        }
      } else {
        toast({ title: t('not_found'), description: `${t('item_with_barcode')} ${searchValue} ${t('not_found_in_store')}.`, variant: 'destructive' });
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

      {/* Procedure Template Selector */}
      {selectedStoreId && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="procedure-type">نوع الإجراء (اختياري)</Label>
                <Select value={selectedProcedureType} onValueChange={handleProcedureTypeChange}>
                  <SelectTrigger id="procedure-type">
                    <SelectValue placeholder="اختر نوع الإجراء" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">-- بدون قالب --</SelectItem>
                    {procedureTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedProcedureType && (
                <div>
                  <Label htmlFor="template">القالب</Label>
                  <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                    <SelectTrigger id="template">
                      <SelectValue placeholder="اختر قالب" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">-- اختر قالب --</SelectItem>
                      {procedureTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name} ({template.items.length} صنف)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
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
                {scanHistory.length > 0 && (
                  <Button type="button" variant="ghost" size="sm" onClick={handleUndo} className="text-orange-600 hover:text-orange-700 hover:bg-orange-50">
                    {t('undo')}
                  </Button>
                )}
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
