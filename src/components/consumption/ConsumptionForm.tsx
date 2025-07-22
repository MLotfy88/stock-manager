import React, { useState } from 'react';
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
// This will need to be updated to getInventoryItems and getProductDefinitions from Supabase
import { getSupplies } from '@/data/operations/suppliesOperations'; 

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
  
  const [date, setDate] = useState<Date | undefined>(initialData?.date ? new Date(initialData.date) : new Date());
  const [department, setDepartment] = useState(initialData?.department || '');
  const [requestedBy, setRequestedBy] = useState(initialData?.requestedBy || '');
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
    // MOCK: Get product definitions, replace with real data later
    const productDefinitions: ProductDefinition[] = []; 
    
    const newItem: ConsumptionItem = {
      id: `item_${Date.now()}`,
      inventoryItemId: foundItem?.id || '',
      itemName: foundItem ? `${productDefinitions.find(p => p.id === foundItem.productDefinitionId)?.name || 'Unknown'} - ${foundItem.variant}` : '',
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
    // MOCK: Get product definitions, replace with real data later
    const productDefinitions: ProductDefinition[] = []; 

    setItems(items.map(item => {
      if (item.id === itemId) {
        if (field === 'inventoryItemId' && value) {
          const selectedItem = getSupplies().find(s => s.id === value); // Replace getSupplies with getInventoryItems
          const definition = productDefinitions.find(p => p.id === selectedItem?.productDefinitionId);
          return {
            ...item,
            [field]: value,
            itemName: selectedItem ? `${definition?.name || 'Unknown'} - ${selectedItem.variant}` : ''
          };
        }
        return { ...item, [field]: value };
      }
      return item;
    }));
  };
  
  // الحصول على المستلزمات المتاحة بناءً على الغرض
  const availableSupplies = getSupplies().filter(s => {
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
      if (!item.inventoryItemId || item.quantity <= 0) {
        return false;
      }
      
      // التحقق من توفر الكمية
      const supply = getSupplies().find(s => s.id === item.inventoryItemId); // Replace with getInventoryItems
      if (!supply || supply.quantity < item.quantity) {
        return false;
      }
    }
    
    return true;
  };
  
  // إرسال النموذج
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFormValid()) {
      toast({
        title: t('error'),
        description: t('please_complete_all_fields'),
        variant: "destructive"
      });
      return;
    }
    
    const newRecord: Partial<ConsumptionRecord> = {
      date: date?.toISOString() || new Date().toISOString(),
      department,
      requestedBy,
      notes,
      status: 'completed',
      purpose: purpose,
      items: items.map(item => ({
        ...item,
        quantity: Number(item.quantity)
      }))
    };
    
    const result = addConsumptionRecord(newRecord as ConsumptionRecord);
    
    if (result) {
      toast({
        title: t('success'),
        description: t('consumption_record_created'),
      });
      resetForm();
      if (onSuccess) onSuccess();
    } else {
      toast({
        title: t('error'),
        description: t('insufficient_quantity'),
        variant: "destructive"
      });
    }
  };

  const startScan = () => {
    setIsScanning(true);
    codeReader.decodeFromVideoDevice(undefined, 'video-scanner-consumption', (result, err) => {
      if (result) {
        const scannedSerial = result.getText();
        stopScan();
        // Replace getSupplies with getInventoryItems
        const foundItem = getSupplies().find(item => (item as any).serialNumber === scannedSerial);
        if (foundItem) {
          addItem(foundItem as any);
          toast({ title: "Item Found", description: `Added item with serial: ${scannedSerial}` });
        } else {
          toast({ title: "Not Found", description: `No item found with serial: ${scannedSerial}`, variant: 'destructive' });
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
