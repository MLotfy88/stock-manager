import React, { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { useMediaQuery } from '@/hooks/use-mobile';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getSuppliers } from '@/data/operations/supplierOperations';
import { Supplier, Manufacturer, Store } from '@/types';
import { Save, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { getManufacturers } from '@/data/operations/manufacturerOperations';
import { getStores } from '@/data/operations/storesOperations';
import { addInventoryItems } from '@/data/operations/suppliesOperations';
import InventoryItemForm, { PurchaseOrderItem } from '@/components/supplies/InventoryItemForm';

const AddInventoryPage = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { t, direction } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const closeSidebar = () => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  };

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [manufacturersList, setManufacturersList] = useState<Manufacturer[]>([]);
  const [stores, setStores] = useState<Store[]>([]);

  // Form State
  const [supplierId, setSupplierId] = useState('');
  const [manufacturerId, setManufacturerId] = useState('');
  const [storeId, setStoreId] = useState('');
  const [items, setItems] = useState<PurchaseOrderItem[]>([
    { id: `item_${Date.now()}`, barcode: '', productDefinitionId: '', variant: '', batchNumber: '', expiryDate: undefined, quantity: '1', purchasePrice: '0' }
  ]);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [suppliersData, manufacturersData, storesData] = await Promise.all([
          getSuppliers(),
          getManufacturers(),
          getStores(),
        ]);
        setSuppliers(suppliersData);
        setManufacturersList(manufacturersData);
        setStores(storesData);
      } catch (error) {
        toast({ title: t('error'), description: t('error_fetching_data'), variant: 'destructive' });
      }
    };
    loadInitialData();
  }, [toast, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId || !manufacturerId || !storeId) {
      toast({ title: t('error'), description: t('please_fill_header_fields'), variant: 'destructive' });
      return;
    }

    for (const item of items) {
      if (!item.productDefinitionId || !item.variant || !item.batchNumber || !item.expiryDate || !item.quantity || !item.purchasePrice) {
        toast({ title: t('error'), description: `${t('please_complete_all_fields_for_item')} #${item.id.slice(-4)}`, variant: 'destructive' });
        return;
      }
    }

    const newInventoryItems = items.map(item => ({
      product_definition_id: item.productDefinitionId,
      variant: item.variant,
      barcode: item.barcode,
      quantity: parseInt(item.quantity),
      store_id: storeId,
      manufacturer_id: manufacturerId,
      supplier_id: supplierId,
      batch_number: item.batchNumber,
      expiry_date: item.expiryDate ? format(item.expiryDate, 'yyyy-MM-dd') : '',
      purchase_price: parseFloat(item.purchasePrice),
    }));

    try {
      await addInventoryItems(newInventoryItems as any);
      toast({ title: t('success'), description: t('invoice_processed_successfully') });
      navigate('/supplies');
    } catch (error) {
      toast({ title: t('error'), description: t('error_saving_invoice'), variant: 'destructive' });
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
      
      <main className={`${isMobile ? 'px-4' : direction === 'rtl' ? 'pr-72 pl-8' : 'pl-72 pr-8'} transition-all`}>
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">{t('add_new_inventory_invoice')}</h1>
          
          <form onSubmit={handleSubmit}>
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>{t('invoice_details')}</CardTitle>
                <CardDescription>{t('invoice_details_description')}</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6">
                <div className="space-y-2">
                  <Label htmlFor="manufacturer">{t('manufacturer')}</Label>
                  <Select value={manufacturerId} onValueChange={setManufacturerId}>
                    <SelectTrigger><SelectValue placeholder={`${t('select')} ${t('manufacturer')}`} /></SelectTrigger>
                    <SelectContent>{manufacturersList.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplier">{t('supplier')}</Label>
                  <Select value={supplierId} onValueChange={setSupplierId}>
                    <SelectTrigger><SelectValue placeholder={`${t('select')} ${t('supplier')}`} /></SelectTrigger>
                    <SelectContent>{suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="store">{t('store')}</Label>
                  <Select value={storeId} onValueChange={setStoreId}>
                    <SelectTrigger><SelectValue placeholder={t('select_store')}/></SelectTrigger>
                    <SelectContent>{stores.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <InventoryItemForm items={items} onItemsChange={setItems} />

            <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4 mt-8">
              <Button type="button" variant="outline" onClick={() => navigate('/supplies')} className="gap-2"><RotateCcw className="h-4 w-4" />{t('cancel')}</Button>
              <Button type="submit" className="gap-2"><Save className="h-4 w-4" />{t('save_invoice')}</Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default AddInventoryPage;
