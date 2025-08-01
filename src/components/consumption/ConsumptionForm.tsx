import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Plus, Package2, ScanBarcode } from 'lucide-react';
import { ConsumptionRecord, ConsumptionItem, InventoryItem, ProductDefinition } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';

// استيراد وظائف العمليات
import { addConsumptionRecord } from '@/data/operations/consumptionOperations';
import { getInventoryItems } from '@/data/operations/suppliesOperations';
import { getProductDefinitions } from '@/data/operations/productDefinitionOperations';

// استيراد المكونات المعاد هيكلتها
import FormHeader from './FormHeader';
import DateSelector from './DateSelector';
import DepartmentSelector from './DepartmentSelector';
import RequestedByInput from './RequestedByInput';
import NotesInput from './NotesInput';
import ConsumptionItemsTable from './ConsumptionItemsTable';
import FormActions from './FormActions';

interface ConsumptionFormProps {
  onSuccess?: () => void;
  initialData?: Partial<ConsumptionRecord>;
  isEdit?: boolean;
}

const ConsumptionForm: React.FC<ConsumptionFormProps> = ({ 
  onSuccess, 
  initialData, 
  isEdit = false 
}) => {
  const { t, direction } = useLanguage();
  const { toast } = useToast();

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [productDefs, setProductDefs] = useState<ProductDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [inventoryData, defsData] = await Promise.all([
          getInventoryItems(),
          getProductDefinitions(),
        ]);
        setInventory(inventoryData);
        setProductDefs(defsData);
      } catch (error) {
        console.error("Failed to fetch form data", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);
  
  const [date, setDate] = useState<Date | undefined>(initialData?.date ? new Date(initialData.date) : new Date());
  const [department, setDepartment] = useState(initialData?.department || '');
  const [requestedBy, setRequestedBy] = useState(initialData?.requested_by || '');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [items, setItems] = useState<ConsumptionItem[]>(initialData?.items || []);
  const [purpose, setPurpose] = useState<'use' | 'expired' | 'damaged'>(initialData?.purpose || 'use');
  const [isScanning, setIsScanning] = useState(false);
  const codeReader = new BrowserMultiFormatReader();
  
  // الأغراض
  const purposes = [
    { id: 'use', name: t('medical_use') },
    { id: 'expired', name: t('expired_items') },
    { id: 'damaged', name: t('damaged_items') },
  ];
  
  // إضافة عنصر جديد
  const addItem = (foundItem: InventoryItem | null = null) => {
    const def = foundItem ? productDefs.find(p => p.id === foundItem.product_definition_id) : null;
    const newItem: ConsumptionItem = {
      id: `item_${Date.now()}`,
      inventory_item_id: foundItem?.id || '',
      item_name: foundItem && def ? `${def.name} - ${foundItem.variant}` : '',
      quantity: 1,
      notes: ''
    };
    setItems([...items, newItem]);
  };
  
  // إزالة عنصر
  const removeItem = (itemId: string) => {
    setItems(items.filter(item => item.id !== itemId));
  };
  
  // تحديث عنصر
  const updateItem = (itemId: string, field: keyof ConsumptionItem, value: any) => {
    setItems(items.map(item => {
      if (item.id === itemId) {
        if (field === 'inventory_item_id' && value) {
          const selectedItem = inventory.find(s => s.id === value);
          const definition = productDefs.find(p => p.id === selectedItem?.product_definition_id);
          return {
            ...item,
            [field]: value,
            item_name: selectedItem && definition ? `${definition.name} - ${selectedItem.variant}` : ''
          };
        }
        return { ...item, [field]: value };
      }
      return item;
    }));
  };
  
  // الحصول على المستلزمات المتاحة بناءً على الغرض
  const availableSupplies = inventory.filter(s => {
    if (purpose === 'expired') {
      return s.status === 'expired' && s.quantity > 0;
    } else if (purpose === 'damaged') {
      return s.quantity > 0;
    } else {
      return s.status !== 'expired' && s.quantity > 0;
    }
  });
  
  // إعادة تعيين النموذج
  const resetForm = () => {
    setDate(new Date());
    setDepartment('');
    setRequestedBy('');
    setNotes('');
    setPurpose('use');
    setItems([]);
  };
  
  // التحقق من صحة النموذج
  const isFormValid = () => {
    if (!date || !department || !requestedBy || items.length === 0) {
      return false;
    }
    
    // التحقق من العناصر
    for (const item of items) {
      if (!item.inventory_item_id || item.quantity <= 0) {
        return false;
      }
      
      // التحقق من توفر الكمية
      const supply = inventory.find(s => s.id === item.inventory_item_id);
      if (!supply || supply.quantity < item.quantity) {
        return false;
      }
    }
    
    return true;
  };
  
  // إرسال النموذج
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFormValid()) {
      toast({
        title: t('error'),
        description: t('please_complete_all_fields'),
        variant: "destructive"
      });
      return;
    }
    
    const newRecord = {
      date: date?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
      department,
      requested_by: requestedBy,
      notes,
      purpose: purpose,
      items: items.map(({ id, item_name, ...rest }) => ({ ...rest, quantity: Number(rest.quantity) }))
    };
    
    try {
      await addConsumptionRecord(newRecord as any);
      toast({
        title: t('success'),
        description: t('consumption_record_created'),
      });
      resetForm();
      if (onSuccess) onSuccess();
    } catch (error: any) {
      const errorMessage = error.message === 'insufficient_quantity' 
        ? t('insufficient_quantity') 
        : t('error');
      toast({
        title: t('error'),
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const startScan = () => {
    setIsScanning(true);
    codeReader.decodeFromVideoDevice(undefined, 'video-scanner-consumption', (result, err) => {
      if (result) {
        const scannedBarcode = result.getText();
        stopScan();
        const foundItem = inventory.find(item => item.barcode === scannedBarcode);
        if (foundItem) {
          addItem(foundItem);
          toast({ title: "Item Found", description: `Added item with barcode: ${scannedBarcode}` });
        } else {
          toast({ title: "Not Found", description: `No item found with barcode: ${scannedBarcode}`, variant: 'destructive' });
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
  
  return (
    <Card className="mb-8">
      <FormHeader 
        title={isEdit ? "edit_consumption" : "new_consumption_record"} 
        description="consumption_form_description" 
      />
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <DateSelector date={date} setDate={setDate} />
            <DepartmentSelector department={department} setDepartment={setDepartment} />
            <RequestedByInput requestedBy={requestedBy} setRequestedBy={setRequestedBy} />
          </div>
          
          {/* Purpose selector */}
          <div className="space-y-2">
            <Label htmlFor="purpose">{t('purpose')}</Label>
            <Select value={purpose} onValueChange={(value) => setPurpose(value as any)}>
              <SelectTrigger>
                <SelectValue placeholder={t('select_purpose')} />
              </SelectTrigger>
              <SelectContent>
                {purposes.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <NotesInput notes={notes} setNotes={setNotes} useTextarea={true} />
          
          {/* Items section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">{t('items')}</h3>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={startScan}>
                  <ScanBarcode className="h-4 w-4 mr-1" />
                  {t('scan_barcode')}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => addItem()}>
                  <Plus className="h-4 w-4 mr-1" />
                  {t('add_item')}
                </Button>
              </div>
            </div>

            {isScanning && (
              <div className="p-4 border rounded-lg bg-black">
                <video id="video-scanner-consumption" className="w-full h-auto rounded-md"></video>
                <Button variant="destructive" className="w-full mt-2" onClick={stopScan}>Stop Scanning</Button>
              </div>
            )}
            
            <ConsumptionItemsTable
              items={items}
              addItem={addItem}
              removeItem={removeItem}
              updateItem={updateItem}
              availableSupplies={availableSupplies}
            />
          </div>
          
          <FormActions onReset={resetForm} isValid={isFormValid()} />
        </form>
      </CardContent>
    </Card>
  );
};

export default ConsumptionForm;
