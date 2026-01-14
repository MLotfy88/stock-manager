
import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/components/ui/use-toast';
import { ConsumptionItem, ConsumptionRecord, InventoryItem } from '@/types';
import { addConsumptionRecord } from '@/data/operations/consumptionOperations';
import { getInventoryItems } from '@/data/operations/suppliesOperations';

export const useConsumptionForm = (onSuccess?: () => void) => {
  const { t } = useLanguage();
  const { toast } = useToast();

  const [date, setDate] = useState<Date | undefined>(new Date());
  const [department, setDepartment] = useState('');
  const [requestedBy, setRequestedBy] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<ConsumptionItem[]>([]);
  const [availableSupplies, setAvailableSupplies] = useState<InventoryItem[]>([]);
  const [loadingSupplies, setLoadingSupplies] = useState(false);

  // Fetch available supplies on mount
  useEffect(() => {
    const fetchSupplies = async () => {
      setLoadingSupplies(true);
      try {
        const data = await getInventoryItems(undefined, false); // Fetch all
        // Filter locally if needed, or rely on the query. Here we want valid items in stock.
        // But for consumption we might want to consume even expired items if purpose is 'expired'
        // For now, let's just get everything that has quantity > 0
        const inStock = data.filter(item => item.quantity > 0);
        setAvailableSupplies(inStock);
      } catch (error) {
        console.error("Error fetching supplies:", error);
        toast({
          title: t('error'),
          description: t('error_fetching_supplies'),
          variant: 'destructive'
        });
      } finally {
        setLoadingSupplies(false);
      }
    };
    fetchSupplies();
  }, [t, toast]);

  // Add a new item
  const addItem = () => {
    const newItem: ConsumptionItem = {
      id: `item_${Date.now()}`,
      inventory_item_id: '', // Correct property name
      item_name: '',
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
        if (field === 'inventory_item_id' && value) {
          const selectedSupply = availableSupplies.find(s => s.id === value);
          return {
            ...item,
            [field]: value,
            item_name: selectedSupply?.product_name || ''
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
      if (!item.inventory_item_id || item.quantity <= 0) {
        return false;
      }

      // Check if quantity is available
      const supply = availableSupplies.find(s => s.id === item.inventory_item_id);
      if (!supply || supply.quantity < item.quantity) {
        // You might want to allow this if purpose is 'expired' or 'damaged' and you are adjusting stock? 
        // But for normal consumption flow, we usually check stock.
        return false;
      }
    }

    return true;
  };

  // Submit the form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid()) {
      toast({
        title: t('error'),
        description: t('please_complete_all_fields_or_check_quantity'),
        variant: "destructive"
      });
      return;
    }

    try {
      const recordData: Omit<ConsumptionRecord, 'id' | 'created_at' | 'items' | 'status'> = {
        date: date?.toISOString() || new Date().toISOString(),
        department,
        requested_by: requestedBy, // Correct property name
        notes,
        purpose: 'use' // Default
      };

      const itemsPayload = items.map(item => ({
        inventory_item_id: item.inventory_item_id,
        quantity: Number(item.quantity)
      }));

      await addConsumptionRecord(recordData, itemsPayload);

      toast({
        title: t('success'),
        description: t('consumption_record_created'),
      });
      resetForm();
      if (onSuccess) onSuccess();

    } catch (error) {
      console.error("Submission error:", error);
      toast({
        title: t('error'),
        description: t('error_saving_consumption'),
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
    loadingSupplies,
    addItem,
    removeItem,
    updateItem,
    resetForm,
    isFormValid,
    handleSubmit
  };
};
