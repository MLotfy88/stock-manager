import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ProductDefinition } from '@/types';
import { CalendarIcon, ScanBarcode, PlusCircle, Trash2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { getProductDefinitions } from '@/data/operations/productDefinitionOperations';
import { useBarcodeScanner, extractGS1DataForSupply } from '@/hooks/useBarcodeScanner';
import { BarcodeScannerViewfinder } from '@/components/ui/BarcodeScannerViewfinder';
import { MobileSupplyItemCard } from '@/components/supplies/MobileSupplyItemCard';

export type PurchaseOrderItem = {
  id: string;
  barcode: string;
  productDefinitionId: string;
  variant: string;
  batchNumber: string;
  expiryDate?: Date;
  quantity: string;
  purchasePrice: string;
};

interface InventoryItemFormProps {
  items: PurchaseOrderItem[];
  onItemsChange: (items: PurchaseOrderItem[]) => void;
}

const InventoryItemForm: React.FC<InventoryItemFormProps> = ({ items, onItemsChange }) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [productDefinitions, setProductDefinitions] = useState<ProductDefinition[]>([]);
  const [activeScannerId, setActiveScannerId] = useState<string | null>(null);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const productsData = await getProductDefinitions();
        setProductDefinitions(productsData);
      } catch (error) {
        toast({ title: t('error'), description: t('error_fetching_products'), variant: 'destructive' });
      }
    };
    loadProducts();
  }, [toast, t]);

  const handleItemChange = useCallback((itemId: string, field: keyof PurchaseOrderItem, value: any) => {
    onItemsChange(items.map(item => item.id === itemId ? { ...item, [field]: value } : item));
  }, [items, onItemsChange]);

  const {
    videoRef,
    isScannerActive,
    error: scannerError,
    startScanner,
    stopScanner,
    captureAndDecode,
  } = useBarcodeScanner({
    onScanSuccess: (scannedBarcode: string) => {
      if (activeScannerId) {
        // محاولة استخراج بيانات GS1-128
        const gs1Data = extractGS1DataForSupply(scannedBarcode);

        if (gs1Data) {
          // باركود GS1-128 - ملء البيانات تلقائياً
          const updates: Partial<PurchaseOrderItem> = {
            barcode: gs1Data.formattedValue, // حفظ الباركود المنسق
          };

          // ملء تاريخ الصلاحية إذا كان موجوداً
          if (gs1Data.expiryDate) {
            updates.expiryDate = new Date(gs1Data.expiryDate);
          }

          // ملء رقم الباتش إذا كان موجوداً
          if (gs1Data.lotNumber) {
            updates.batchNumber = gs1Data.lotNumber;
          }

          // تحديث جميع الحقول دفعة واحدة
          onItemsChange(items.map(item =>
            item.id === activeScannerId ? { ...item, ...updates } : item
          ));

          toast({
            title: t('barcode_scanned'),
            description: `GTIN: ${gs1Data.gtin || 'N/A'}\n${t('expiry_date')}: ${gs1Data.expiryDate || 'N/A'}\nLOT: ${gs1Data.lotNumber || 'N/A'}`,
            duration: 5000
          });
        } else {
          // باركود عادي - فقط ملء حقل الباركود
          handleItemChange(activeScannerId, 'barcode', scannedBarcode);
          toast({ title: t('barcode_scanned'), description: `${t('barcode')}: ${scannedBarcode}` });
        }

        if (navigator.vibrate) navigator.vibrate(150);
        stopScanner();
        setActiveScannerId(null);
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

  const handleStartScan = (itemId: string) => {
    setActiveScannerId(itemId);
    startScanner();
  };

  const handleStopScan = () => {
    stopScanner();
    setActiveScannerId(null);
  };

  const addNewItem = () => {
    onItemsChange([
      ...items,
      { id: `item_${Date.now()}`, barcode: '', productDefinitionId: '', variant: '', batchNumber: '', expiryDate: undefined, quantity: '1', purchasePrice: '0' }
    ]);
  };

  const removeItem = (itemId: string) => {
    onItemsChange(items.filter(item => item.id !== itemId));
  };

  const duplicateItem = (itemId: string) => {
    const itemToDuplicate = items.find(item => item.id === itemId);
    if (itemToDuplicate) {
      const newItem = {
        ...itemToDuplicate,
        id: `item_${Date.now()}`,
        barcode: '', // Barcode should be unique per item
      };
      onItemsChange([...items, newItem]);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t('invoice_items')}</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Desktop Table */}
          <div className="overflow-x-auto hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px]">{t('barcode')}</TableHead>
                  <TableHead>{t('product')}</TableHead>
                  <TableHead>{t('variant')}</TableHead>
                  <TableHead>{t('batch_number')}</TableHead>
                  <TableHead>{t('expiry_date')}</TableHead>
                  <TableHead className="w-[100px]">{t('quantity')}</TableHead>
                  <TableHead className="w-[120px]">{t('purchase_price')}</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const selectedDefinition = productDefinitions.find(def => def.id === item.productDefinitionId);
                  return (
                    <React.Fragment key={item.id}>
                      <TableRow>
                        <TableCell className="min-w-[200px] p-2 md:p-4" data-label={t('barcode')}>
                          <div className="flex items-center gap-2">
                            <Input
                              value={item.barcode}
                              onChange={(e) => handleItemChange(item.id, 'barcode', e.target.value)}
                              placeholder={t('scan_or_enter_barcode')}
                            />
                            <Button type="button" size="icon" variant="ghost" onClick={() => handleStartScan(item.id)}><ScanBarcode className="h-5 w-5" /></Button>
                          </div>
                        </TableCell>
                        <TableCell className="min-w-[250px] p-2 md:p-4" data-label={t('product')}>
                          <Select value={item.productDefinitionId} onValueChange={(val) => handleItemChange(item.id, 'productDefinitionId', val)}>
                            <SelectTrigger><SelectValue placeholder={t('select_product')} /></SelectTrigger>
                            <SelectContent>{productDefinitions.map((def) => <SelectItem key={def.id} value={def.id}>{def.name}</SelectItem>)}</SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="min-w-[150px] p-2 md:p-4" data-label={t('variant')}>
                          <Select value={item.variant} onValueChange={(val) => handleItemChange(item.id, 'variant', val)} disabled={!selectedDefinition}>
                            <SelectTrigger><SelectValue placeholder={t('select_variant')} /></SelectTrigger>
                            <SelectContent>{selectedDefinition?.variants.map((variant: any) => <SelectItem key={variant.name} value={variant.name}>{variant.name}</SelectItem>)}</SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="min-w-[150px] p-2 md:p-4" data-label={t('batch_number')}>
                          <Input value={item.batchNumber} onChange={(e) => handleItemChange(item.id, 'batchNumber', e.target.value)} />
                        </TableCell>
                        <TableCell className="min-w-[200px] p-2 md:p-4" data-label={t('expiry_date')}>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !item.expiryDate && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {item.expiryDate ? format(item.expiryDate, "PPP") : <span>{t('pick_date')}</span>}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={item.expiryDate} onSelect={(date) => handleItemChange(item.id, 'expiryDate', date)} initialFocus /></PopoverContent>
                          </Popover>
                        </TableCell>
                        <TableCell className="min-w-[100px] p-2 md:p-4" data-label={t('quantity')}>
                          <Input type="number" min="1" value={item.quantity} onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)} />
                        </TableCell>
                        <TableCell className="min-w-[120px] p-2 md:p-4" data-label={t('purchase_price')}>
                          <Input type="number" min="0" step="0.01" value={item.purchasePrice} onChange={(e) => handleItemChange(item.id, 'purchasePrice', e.target.value)} />
                        </TableCell>
                        <TableCell className="p-2 md:p-4 text-right">
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(item.id)} disabled={items.length <= 1}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {items.map((item) => {
              const selectedDefinition = productDefinitions.find(def => def.id === item.productDefinitionId);
              return (
                <MobileSupplyItemCard
                  key={item.id}
                  itemId={item.id}
                  onScan={() => handleStartScan(item.id)}
                  onRemove={() => removeItem(item.id)}
                  onDuplicate={() => duplicateItem(item.id)}
                  canRemove={items.length > 1}
                >
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Input value={item.barcode} onChange={(e) => handleItemChange(item.id, 'barcode', e.target.value)} placeholder={t('scan_or_enter_barcode')} />
                    </div>
                    <Select value={item.productDefinitionId} onValueChange={(val) => handleItemChange(item.id, 'productDefinitionId', val)}>
                      <SelectTrigger><SelectValue placeholder={t('select_product')} /></SelectTrigger>
                      <SelectContent>{productDefinitions.map((def) => <SelectItem key={def.id} value={def.id}>{def.name}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={item.variant} onValueChange={(val) => handleItemChange(item.id, 'variant', val)} disabled={!selectedDefinition}>
                      <SelectTrigger><SelectValue placeholder={t('select_variant')} /></SelectTrigger>
                      <SelectContent>{selectedDefinition?.variants.map((variant: any) => <SelectItem key={variant.name} value={variant.name}>{variant.name}</SelectItem>)}</SelectContent>
                    </Select>
                    <div className="grid grid-cols-2 gap-4">
                      <Input value={item.batchNumber} onChange={(e) => handleItemChange(item.id, 'batchNumber', e.target.value)} placeholder={t('batch_number')} />
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !item.expiryDate && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {item.expiryDate ? format(item.expiryDate, "P") : <span>{t('pick_date')}</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={item.expiryDate} onSelect={(date) => handleItemChange(item.id, 'expiryDate', date)} initialFocus /></PopoverContent>
                      </Popover>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Input type="number" min="1" value={item.quantity} onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)} placeholder={t('quantity')} />
                      <Input type="number" min="0" step="0.01" value={item.purchasePrice} onChange={(e) => handleItemChange(item.id, 'purchasePrice', e.target.value)} placeholder={t('purchase_price')} />
                    </div>
                  </div>
                </MobileSupplyItemCard>
              );
            })}
          </div>

        </CardContent>
        <CardFooter className="justify-start border-t pt-6">
          <Button type="button" variant="outline" onClick={addNewItem} className="gap-2">
            <PlusCircle className="h-4 w-4" />
            {t('add_another_item')}
          </Button>
        </CardFooter>
      </Card>

      {/* Floating Action Button for Mobile */}
      <div className="md:hidden fixed bottom-20 right-4 z-50">
        <Button type="button" size="icon" className="h-14 w-14 rounded-full shadow-lg" onClick={addNewItem}>
          <PlusCircle className="h-7 w-7" />
        </Button>
      </div>

      {/* Fullscreen scanner */}
      {isScannerActive && (
        <div className="fixed inset-0 bg-black z-50">
          <video ref={videoRef} className="w-full h-full object-cover" playsInline autoPlay />
          <BarcodeScannerViewfinder onCapture={captureAndDecode} />
          <div className="absolute top-4 right-4 z-[51]">
            <Button variant="destructive" onClick={handleStopScan}>{t('stop_scanning')}</Button>
          </div>
        </div>
      )}
    </>
  );
};

export default InventoryItemForm;
