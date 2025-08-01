import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Plus, ScanBarcode } from 'lucide-react';
import { ConsumptionRecord, ConsumptionItem, InventoryItem, ProductDefinition, Store } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import { addConsumptionRecord } from '@/data/operations/consumptionOperations';
import { getInventoryItems } from '@/data/operations/suppliesOperations';
import { getProductDefinitions } from '@/data/operations/productDefinitionOperations';
import { getStores } from '@/data/operations/storesOperations';
import FormHeader from './FormHeader';
import DateSelector from './DateSelector';
import NotesInput from './NotesInput';
import ConsumptionItemsTable from './ConsumptionItemsTable';
import FormActions from './FormActions';

interface ConsumptionFormProps {
  onSuccess?: () => void;
}

const ConsumptionForm: React.FC<ConsumptionFormProps> = ({ onSuccess }) => {
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
  
  const [isScanning, setIsScanning] = useState(false);
  const [activeScannerId, setActiveScannerId] = useState<string | null>(null);
  const codeReader = new BrowserMultiFormatReader();

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [inventoryData, defsData, storesData] = await Promise.all([
          getInventoryItems(),
          getProductDefinitions(),
          getStores(),
        ]);
        setInventory(inventoryData);
        setProductDefs(defsData);
        setStores(storesData);
      } catch (error) {
        console.error("Failed to fetch form data", error);
        toast({ title: t('error'), description: t('error_fetching_data'), variant: 'destructive' });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [toast, t]);

  const availableSupplies = inventory.filter(s => s.store_id === selectedStoreId && s.quantity > 0);

  const handleItemChange = (itemId: string, field: keyof ConsumptionItem, value: any) => {
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
  };

  const startScan = (itemId: string) => {
    if (!selectedStoreId) {
      toast({ title: t('error'), description: t('please_select_store_first'), variant: 'destructive' });
      return;
    }
    setActiveScannerId(itemId);
    setIsScanning(true);
    codeReader.decodeFromVideoDevice(undefined, `video-scanner-${itemId}`, (result, err) => {
      if (result) {
        const scannedBarcode = result.getText();
        stopScan();
        const foundItem = availableSupplies.find(item => item.barcode === scannedBarcode);
        if (foundItem) {
          handleItemChange(itemId, 'inventory_item_id', foundItem.id);
          toast({ title: "Item Found", description: `Item with barcode ${scannedBarcode} selected.` });
        } else {
          toast({ title: "Not Found", description: `Item with barcode ${scannedBarcode} not found in this store.`, variant: 'destructive' });
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
    setActiveScannerId(null);
  };

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
    
    const newRecord = {
      date: date!.toISOString().split('T')[0],
      department: stores.find(s => s.id === selectedStoreId)?.name || 'N/A',
      requested_by: 'System',
      notes,
      purpose: 'use',
      items: items.map(({ id, availableQuantity, ...rest }) => ({ ...rest, quantity: Number(rest.quantity) }))
    };

    try {
      await addConsumptionRecord(newRecord as any);
      toast({ title: t('success'), description: t('consumption_record_created') });
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
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">{t('items')}</h3>
              <Button type="button" variant="outline" size="sm" onClick={addNewItem} disabled={!selectedStoreId}>
                <Plus className="h-4 w-4 mr-1" />{t('add_item')}
              </Button>
            </div>
            
            {isScanning && activeScannerId && (
              <div className="p-4 border rounded-lg bg-black">
                <video id={`video-scanner-${activeScannerId}`} className="w-full h-auto rounded-md"></video>
                <Button variant="destructive" className="w-full mt-2" onClick={stopScan}>Stop Scanning</Button>
              </div>
            )}
            
            <ConsumptionItemsTable
              items={items}
              handleItemChange={handleItemChange}
              removeItem={removeItem}
              startScan={startScan}
              availableSupplies={availableSupplies}
              productDefs={productDefs}
              isScanning={isScanning}
              activeScannerId={activeScannerId}
              stopScan={stopScan}
            />
          </div>
          
          <FormActions onReset={() => setItems([])} isValid={isFormValid()} />
        </form>
      </CardContent>
    </Card>
  );
};

export default ConsumptionForm;
