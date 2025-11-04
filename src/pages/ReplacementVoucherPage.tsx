import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { useMediaQuery } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Stepper, Step, StepLabel } from '@/components/ui/stepper';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Supplier, InventoryItem, ProductDefinition } from '@/types';
import { getSuppliers } from '@/data/operations/supplierOperations';
import { getInventoryItems, deleteInventoryItem, addInventoryItems } from '@/data/operations/suppliesOperations';
import InventoryItemForm, { PurchaseOrderItem } from '@/components/supplies/InventoryItemForm';
import { getProductDefinitions } from '@/data/operations/productDefinitionOperations';
import { format } from 'date-fns';
import { useEffect } from 'react';

const Step1Content = ({ 
  productDefs,
  suppliers, 
  selectedSupplier, 
  setSelectedSupplier,
  handleAddItem,
  returnedItems
}: {
  productDefs: ProductDefinition[],
  suppliers: Supplier[],
  selectedSupplier: string | null,
  setSelectedSupplier: (id: string) => void,
  handleAddItem: (barcode: string) => void,
  returnedItems: InventoryItem[]
}) => {
  const { t } = useLanguage();
  const [barcode, setBarcode] = useState('');

  const onAddItem = () => {
    if (barcode.trim()) {
      handleAddItem(barcode.trim());
      setBarcode('');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>{t('supplier')}</Label>
        <Select onValueChange={setSelectedSupplier} value={selectedSupplier || ''}>
          <SelectTrigger>
            <SelectValue placeholder={t('select_supplier')} />
          </SelectTrigger>
          <SelectContent>
            {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      
      <div className="flex items-end gap-2">
        <div className="flex-grow">
          <Label htmlFor="barcode">{t('scan_or_enter_barcode')}</Label>
          <Input 
            id="barcode" 
            value={barcode} 
            onChange={(e) => setBarcode(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && onAddItem()}
            disabled={!selectedSupplier}
          />
        </div>
        <Button onClick={onAddItem} disabled={!selectedSupplier}>{t('add_item')}</Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('product')}</TableHead>
              <TableHead>{t('variant')}</TableHead>
              <TableHead>{t('batch_number')}</TableHead>
              <TableHead>{t('quantity')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {returnedItems.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center">{t('no_items_added')}</TableCell></TableRow>
            ) : (
              returnedItems.map(item => {
                const def = productDefs.find(d => d.id === item.product_definition_id);
                return (
                <TableRow key={item.id}>
                  <TableCell>{def?.name || 'N/A'}</TableCell>
                  <TableCell>{item.variant}</TableCell>
                  <TableCell>{item.batch_number}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                </TableRow>
              )})
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

const Step2Content = ({ items, onItemsChange }: { items: PurchaseOrderItem[], onItemsChange: (items: PurchaseOrderItem[]) => void }) => {
  const { t } = useLanguage();
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">{t('enter_new_items')}</h2>
      <InventoryItemForm items={items} onItemsChange={onItemsChange} />
    </div>
  );
}

const Step3Content = ({ returnedItems, newItems, productDefs }: { returnedItems: InventoryItem[], newItems: PurchaseOrderItem[], productDefs: ProductDefinition[] }) => {
  const { t } = useLanguage();

  const totalReturnedValue = returnedItems.reduce((acc, item) => acc + (item.purchase_price || 0) * item.quantity, 0);
  const totalNewValue = newItems.reduce((acc, item) => acc + parseFloat(item.purchasePrice || '0') * parseFloat(item.quantity || '0'), 0);
  const difference = totalNewValue - totalReturnedValue;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">{t('returned_items')}</h3>
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('product')}</TableHead>
                <TableHead>{t('variant')}</TableHead>
                <TableHead>{t('quantity')}</TableHead>
                <TableHead className="text-right">{t('value')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {returnedItems.map(item => {
                const def = productDefs.find(d => d.id === item.product_definition_id);
                const value = (item.purchase_price || 0) * item.quantity;
                return (
                  <TableRow key={item.id}>
                    <TableCell>{def?.name || 'N/A'}</TableCell>
                    <TableCell>{item.variant}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell className="text-right">{value.toFixed(2)}</TableCell>
                  </TableRow>
                );
              })}
              <TableRow className="font-bold">
                <TableCell colSpan={3} className="text-right">{t('total_returned_value')}</TableCell>
                <TableCell className="text-right">{totalReturnedValue.toFixed(2)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Card>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">{t('new_items')}</h3>
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('product')}</TableHead>
                <TableHead>{t('variant')}</TableHead>
                <TableHead>{t('quantity')}</TableHead>
                <TableHead className="text-right">{t('value')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {newItems.map(item => {
                const def = productDefs.find(d => d.id === item.productDefinitionId);
                const value = parseFloat(item.purchasePrice || '0') * parseFloat(item.quantity || '0');
                return (
                  <TableRow key={item.id}>
                    <TableCell>{def?.name || 'N/A'}</TableCell>
                    <TableCell>{item.variant}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell className="text-right">{value.toFixed(2)}</TableCell>
                  </TableRow>
                );
              })}
              <TableRow className="font-bold">
                <TableCell colSpan={3} className="text-right">{t('total_new_value')}</TableCell>
                <TableCell className="text-right">{totalNewValue.toFixed(2)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Card>
      </div>

      <div className="pt-4">
        <Card className="bg-muted/40">
          <CardContent className="p-4">
            <div className="flex justify-between items-center text-xl font-bold">
              <span>{t('financial_difference')}</span>
              <span className={difference >= 0 ? 'text-green-600' : 'text-red-600'}>
                {difference.toFixed(2)} {t('egp')}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {difference > 0 ? t('amount_due_to_supplier') : difference < 0 ? t('amount_due_from_supplier') : t('no_financial_difference')}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};


const ReplacementVoucherPage = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { t, direction } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [productDefs, setProductDefs] = useState<ProductDefinition[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
  const [returnedItems, setReturnedItems] = useState<InventoryItem[]>([]);
  const [newItems, setNewItems] = useState<PurchaseOrderItem[]>([
    { id: `item_${Date.now()}`, barcode: '', productDefinitionId: '', variant: '', batchNumber: '', expiryDate: undefined, quantity: '1', purchasePrice: '0' }
  ]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [suppliersData, inventoryData, defsData] = await Promise.all([
          getSuppliers(),
          getInventoryItems(),
          getProductDefinitions()
        ]);
        setSuppliers(suppliersData);
        setInventory(inventoryData);
        setProductDefs(defsData);
      } catch (error) {
        console.error("Failed to fetch data", error);
      }
    };
    fetchData();
  }, []);

  const handleAddItem = (barcode: string) => {
    const item = inventory.find(i => i.barcode === barcode && i.supplier_id === selectedSupplier);
    if (item) {
      // Check if item is already added
      if (!returnedItems.find(ri => ri.id === item.id)) {
        setReturnedItems(prev => [...prev, item]);
      } else {
        // Handle already added item alert
      }
    } else {
      // Handle item not found or not from this supplier alert
    }
  };

  const steps = [
    t('select_return_items'),
    t('enter_new_items'),
    t('review_and_confirm'),
  ];

  const handleNext = () => {
    // Add validation before proceeding
    if (activeStep === 0 && returnedItems.length === 0) {
      toast({ title: t('error'), description: t('please_add_returned_items'), variant: 'destructive' });
      return;
    }
    if (activeStep === 1) {
      for (const item of newItems) {
        if (!item.productDefinitionId || !item.variant || !item.batchNumber || !item.expiryDate || !item.quantity || !item.purchasePrice) {
          toast({ title: t('error'), description: `${t('please_complete_all_fields_for_item')} #${item.id.slice(-4)}`, variant: 'destructive' });
          return;
        }
      }
    }
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleFinish = async () => {
    try {
      // 1. Delete returned items
      for (const item of returnedItems) {
        await deleteInventoryItem(item.id);
      }

      // 2. Add new items
      const itemsToAdd = newItems.map(item => ({
        product_definition_id: item.productDefinitionId,
        variant: item.variant,
        barcode: item.barcode,
        quantity: parseInt(item.quantity),
        store_id: returnedItems[0].store_id, // Assuming all items from same store
        manufacturer_id: returnedItems[0].manufacturer_id, // Assuming same manufacturer
        supplier_id: selectedSupplier!,
        batch_number: item.batchNumber,
        expiry_date: item.expiryDate ? format(item.expiryDate, 'yyyy-MM-dd') : '',
        purchase_price: parseFloat(item.purchasePrice),
      }));

      await addInventoryItems(itemsToAdd as any);

      toast({ title: t('success'), description: t('replacement_voucher_processed') });
      navigate('/supplies');

    } catch (error) {
      toast({ title: t('error'), description: t('error_processing_voucher'), variant: 'destructive' });
    }
  };

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  };

  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return <Step1Content 
          productDefs={productDefs}
          suppliers={suppliers}
          selectedSupplier={selectedSupplier}
          setSelectedSupplier={setSelectedSupplier}
          handleAddItem={handleAddItem}
          returnedItems={returnedItems}
        />;
      case 1:
        return <Step2Content items={newItems} onItemsChange={setNewItems} />;
      case 2:
        return <Step3Content returnedItems={returnedItems} newItems={newItems} productDefs={productDefs} />;
      default:
        return 'Unknown step';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-10" dir={direction}>
      <Header toggleSidebar={toggleSidebar} />
      <Sidebar 
        isSidebarOpen={isSidebarOpen} 
        toggleSidebar={toggleSidebar}
        closeSidebar={closeSidebar}
      />
      
      <main className={`pt-20 ${isMobile ? 'px-4' : direction === 'rtl' ? 'pr-72 pl-8' : 'pl-72 pr-8'}`}>
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold mb-6">{t('replacement_voucher')}</h1>
          
          <Card>
            <CardHeader>
              <Stepper activeStep={activeStep}>
                {steps.map((label) => (
                  <Step key={label}>
                    <StepLabel>{label}</StepLabel>
                  </Step>
                ))}
              </Stepper>
            </CardHeader>
            <CardContent>
              <div>
                {getStepContent(activeStep)}
                <div className="flex justify-end mt-6">
                  <Button
                    disabled={activeStep === 0}
                    onClick={handleBack}
                    className="mr-2"
                    variant="outline"
                  >
                    {t('back')}
                  </Button>
                  <Button
                    variant="default"
                    onClick={activeStep === steps.length - 1 ? handleFinish : handleNext}
                  >
                    {activeStep === steps.length - 1 ? t('finish') : t('next')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default ReplacementVoucherPage;
