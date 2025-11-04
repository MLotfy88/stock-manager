import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { CalendarIcon, PlusCircle, Trash2, ScanLine } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/components/ui/use-toast';
import { getProductDefinitions } from '@/data/operations/productDefinitionOperations';
import { getManufacturers } from '@/data/operations/manufacturerOperations';
import { getSuppliers } from '@/data/operations/supplierOperations';
import { getStores } from '@/data/operations/storesOperations';
import { getInventoryItemByBarcode, addInventoryItems } from '@/data/operations/suppliesOperations';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { ProductDefinition } from '@/types'; // Corrected import

// Zod Schema
const itemSchema = z.object({
  barcode: z.string().min(1, "Barcode is required"),
  productDefinitionId: z.string().min(1, "Product is required"),
  variant: z.string().min(1, "Variant is required"),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  expiryDate: z.date({ required_error: "Expiry date is required" }),
  batchNumber: z.string().optional(),
  purchasePrice: z.coerce.number().optional(),
  isNew: z.boolean().default(false),
});

const formSchema = z.object({
  manufacturerId: z.string().min(1, "Manufacturer is required"),
  supplierId: z.string().min(1, "Supplier is required"),
  storeId: z.string().min(1, "Store is required"),
  items: z.array(itemSchema).min(1, "At least one item is required"),
});

const BulkAddInventoryPage: React.FC = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [scanningIndex, setScanningIndex] = useState<number | null>(null);

  const { videoRef, isScannerActive, startScanner, stopScanner, captureAndDecode } = useBarcodeScanner({
    onScanSuccess: (barcode) => {
      if (scanningIndex !== null) {
        form.setValue(`items.${scanningIndex}.barcode`, barcode, { shouldValidate: true });
        handleBarcodeSearch(barcode, scanningIndex);
        stopScannerAndDialog();
      }
    },
    onScanFailure: (error) => {
      toast({ title: "Scan Failed", description: error.message, variant: "destructive" });
    }
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { items: [] },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });

  useEffect(() => {
    if (fields.length === 0) {
      append({ barcode: '', productDefinitionId: '', variant: '', quantity: 1, expiryDate: new Date(), isNew: true });
    }
  }, [fields, append]);

  // Data fetching
  const { data: products, isLoading: productsLoading } = useQuery<ProductDefinition[]>({ queryKey: ['productDefinitions'], queryFn: getProductDefinitions });
  const { data: manufacturers, isLoading: manufacturersLoading } = useQuery({ queryKey: ['manufacturers'], queryFn: getManufacturers });
  const { data: suppliers, isLoading: suppliersLoading } = useQuery({ queryKey: ['suppliers'], queryFn: getSuppliers });
  const { data: stores, isLoading: storesLoading } = useQuery({ queryKey: ['stores'], queryFn: getStores });

  const handleBarcodeSearch = async (barcode: string, index: number) => {
    if (!barcode) return;
    const existingItem = await getInventoryItemByBarcode(barcode);
    if (existingItem) {
      form.setValue(`items.${index}.productDefinitionId`, existingItem.product_definition_id);
      form.setValue(`items.${index}.variant`, existingItem.variant);
      form.setValue(`items.${index}.isNew`, false);
      toast({ title: t('product_found'), description: t('item_predefined_enter_quantity') });
    } else {
      form.setValue(`items.${index}.isNew`, true);
      toast({ title: t('new_item'), description: t('barcode_not_found_define_item') });
    }
  };

  const addItemsMutation = useMutation({
    mutationFn: addInventoryItems,
    onSuccess: () => {
      toast({ title: t('success'), description: t('invoice_processed_successfully') });
      queryClient.invalidateQueries({ queryKey: ['inventory_items_with_status'] });
      form.reset({
        manufacturerId: '', supplierId: '', storeId: '',
        items: [{ barcode: '', productDefinitionId: '', variant: '', quantity: 1, expiryDate: new Date(), isNew: true }],
      });
    },
    onError: (error) => toast({ title: t('error'), description: `${t('error_saving_invoice')}: ${error.message}`, variant: 'destructive' })
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    const itemsToInsert = values.items.map(item => ({
      product_definition_id: item.productDefinitionId,
      variant: item.variant,
      barcode: item.barcode,
      quantity: item.quantity,
      store_id: values.storeId,
      manufacturer_id: values.manufacturerId,
      supplier_id: values.supplierId,
      batch_number: item.batchNumber,
      expiry_date: format(item.expiryDate, 'yyyy-MM-dd'),
      purchase_price: item.purchasePrice,
    }));
    addItemsMutation.mutate(itemsToInsert as any);
  };

  const startScannerForIndex = (index: number) => {
    setScanningIndex(index);
    startScanner();
  };

  const stopScannerAndDialog = () => {
    stopScanner();
    setScanningIndex(null);
  };

  return (
    <div className="p-4 md:p-6">
      <Dialog open={isScannerActive} onOpenChange={stopScannerAndDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Scan Barcode</DialogTitle></DialogHeader>
          <video ref={videoRef} className="w-full rounded-md" />
          <DialogFooter>
            <Button onClick={captureAndDecode}>Capture</Button>
            <Button variant="secondary" onClick={stopScannerAndDialog}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('invoice_details')}</CardTitle>
              <CardDescription>{t('invoice_details_description')}</CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-3 gap-4">
              <FormField control={form.control} name="manufacturerId" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('manufacturer')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={manufacturersLoading}>
                    <FormControl><SelectTrigger><SelectValue placeholder={t('select')} /></SelectTrigger></FormControl>
                    <SelectContent>{manufacturers?.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="supplierId" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('supplier')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={suppliersLoading}>
                    <FormControl><SelectTrigger><SelectValue placeholder={t('select')} /></SelectTrigger></FormControl>
                    <SelectContent>{suppliers?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="storeId" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('store')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={storesLoading}>
                    <FormControl><SelectTrigger><SelectValue placeholder={t('select')} /></SelectTrigger></FormControl>
                    <SelectContent>{stores?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>{t('invoice_items')}</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-6">
                {fields.map((field, index) => {
                  const isNewItem = form.watch(`items.${index}.isNew`);
                  const selectedProductId = form.watch(`items.${index}.productDefinitionId`);
                  const variants = products?.find(p => p.id === selectedProductId)?.variants || [];

                  return (
                    <div key={field.id} className="p-4 border rounded-lg space-y-4">
                      {/* Barcode and remove button */}
                      <div className="flex items-end space-x-2">
                        <FormField control={form.control} name={`items.${index}.barcode`} render={({ field }) => (
                          <FormItem className="flex-grow"><FormLabel>{t('scan_or_enter_barcode')}</FormLabel><FormControl><Input {...field} onBlur={(e) => handleBarcodeSearch(e.target.value, index)} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <Button type="button" variant="outline" onClick={() => startScannerForIndex(index)}><ScanLine className="h-5 w-5" /></Button>
                        {fields.length > 1 && <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-red-500" /></Button>}
                      </div>
                      {/* Item details grid */}
                      <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <FormField control={form.control} name={`items.${index}.productDefinitionId`} render={({ field }) => (
                          <FormItem><FormLabel>{t('product')}</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={!isNewItem || productsLoading}>
                              <FormControl><SelectTrigger><SelectValue placeholder={t('select_product')} /></SelectTrigger></FormControl>
                              <SelectContent>{products?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                            </Select><FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name={`items.${index}.variant`} render={({ field }) => (
                          <FormItem><FormLabel>{t('variant')}</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={!isNewItem || variants.length === 0}>
                              <FormControl><SelectTrigger><SelectValue placeholder={t('select_variant')} /></SelectTrigger></FormControl>
                              <SelectContent>{variants.map(v => <SelectItem key={v.name} value={v.name}>{v.name}</SelectItem>)}</SelectContent>
                            </Select><FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name={`items.${index}.quantity`} render={({ field }) => (<FormItem><FormLabel>{t('quantity')}</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name={`items.${index}.expiryDate`} render={({ field }) => (
                          <FormItem className="flex flex-col"><FormLabel>{t('expiry_date')}</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild><FormControl><Button variant="outline" className="font-normal"><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, "PPP") : <span>{t('pick_a_date')}</span>}</Button></FormControl></PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                            </Popover><FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name={`items.${index}.batchNumber`} render={({ field }) => (<FormItem><FormLabel>{t('batch_number')}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <Button type="button" variant="outline" className="mt-6" onClick={() => append({ barcode: '', productDefinitionId: '', variant: '', quantity: 1, expiryDate: new Date(), isNew: true })}>
                <PlusCircle className="mr-2 h-4 w-4" />{t('add_another_item')}
              </Button>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={addItemsMutation.isPending}>{t('save_invoice')}</Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default BulkAddInventoryPage;
