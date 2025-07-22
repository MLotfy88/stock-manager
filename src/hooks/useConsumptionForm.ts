
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/components/ui/use-toast';
import { ConsumptionItem, ConsumptionRecord, MedicalSupply } from '@/types';
import { supplies, addConsumptionRecord } from '@/data/mockData';

export const useConsumptionForm = (onSuccess?: () => void) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [department, setDepartment] = useState('');
  const [requestedBy, setRequestedBy] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<ConsumptionItem[]>([]);
  
  // Get available supplies
  const availableSupplies = supplies.filter(s => s.status !== 'expired' && s.quantity > 0);
  
  // Add a new item
  const addItem = () => {
    const newItem: ConsumptionItem = {
      id: `item_${Date.now()}`,
      supplyId: '',
      supplyName: '',
      quantity: 1,
      notes: ''
    };
    setItems([...items, newItem]);
  };
  
  // Remove an item
  const removeItem = (itemId: string) => {
    setItems(items.filter(item => item.id !== itemId));
  };
  
  // Update an item
  const updateItem = (itemId: string, field: keyof ConsumptionItem, value: any) => {
    setItems(items.map(item => {
      if (item.id === itemId) {
        if (field === 'supplyId' && value) {
          const selectedSupply = supplies.find(s => s.id === value);
          return {
            ...item,
            [field]: value,
            supplyName: selectedSupply?.name || ''
          };
        }
        return { ...item, [field]: value };
      }
      return item;
    }));
  };
  
  // Reset the form
  const resetForm = () => {
    setDate(new Date());
    setDepartment('');
    setRequestedBy('');
    setNotes('');
    setItems([]);
  };
  
  // Validate the form
  const isFormValid = () => {
    if (!date || !department || !requestedBy || items.length === 0) {
      return false;
    }
    
    // Check items
    for (const item of items) {
      if (!item.supplyId || item.quantity <= 0) {
        return false;
      }
      
      // Check if quantity is available
      const supply = supplies.find(s => s.id === item.supplyId);
      if (!supply || supply.quantity < item.quantity) {
        return false;
      }
    }
    
    return true;
  };
  
  // Submit the form
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
  
  return {
    date,
    setDate,
    department,
    setDepartment,
    requestedBy,
    setRequestedBy,
    notes,
    setNotes,
    items,
    availableSupplies,
    addItem,
    removeItem,
    updateItem,
    resetForm,
    isFormValid,
    handleSubmit
  };
};
