import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ProductDefinition } from '@/types';
import { Label } from '@/components/ui/label';
import { getProductDefinitions } from '@/data/operations/productDefinitionOperations';
import { useBarcodeScanner, extractGS1DataForSupply, ParsedGS1Data } from '@/hooks/useBarcodeScanner';
import { BarcodeScannerViewfinder } from '@/components/ui/BarcodeScannerViewfinder';
import { MobileSupplyItemCard } from '@/components/supplies/MobileSupplyItemCard';
import { VariantQuickPicker } from './VariantQuickPicker';
import { StentMatrixPicker } from '@/components/supplies/StentMatrixPicker';
import { CatheterCurvePicker } from '@/components/supplies/CatheterCurvePicker';
import { HybridVariantPicker, PickerOption } from '@/components/supplies/HybridVariantPicker';
import { getGTINMapping } from '@/data/operations/gtinMappingOperations';
import { saveRecentVariant, getRecentVariants } from '@/utils/variantPreferences';
import { scanSuccessFeedback, scanErrorFeedback, playTick } from '@/utils/audioFeedback';
import { Badge } from '@/components/ui/badge';
import { usePermission } from '@/hooks/usePermission';
import { CalendarIcon, Copy, PlusCircle, ScanBarcode, Trash2, LayoutGrid } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export type PurchaseOrderItem = {
  id: string;
  barcode: string;
  gtin?: string; // Store GTIN separately
  productDefinitionId: string;
  variant: string;
  batchNumber: string;
  expiryDate?: Date;
  quantity: string;
  purchasePrice: string;
};

export interface InventoryItemFormProps {
  items: PurchaseOrderItem[];
  onItemsChange: (items: PurchaseOrderItem[]) => void;
}

// Define options for specific types
// Ideally this should come from a DB configuration, but for speed/MVP:
const BALLOON_DIAMETERS: PickerOption[] = [
  { value: '1.25', label: '1.25' }, { value: '1.50', label: '1.50' }, { value: '1.75', label: '1.75' },
  { value: '2.00', label: '2.00' }, { value: '2.25', label: '2.25' }, { value: '2.50', label: '2.50' },
  { value: '2.75', label: '2.75' }, { value: '3.00', label: '3.00' }, { value: '3.25', label: '3.25' },
  { value: '3.50', label: '3.50' }, { value: '4.00', label: '4.00' }, { value: '4.50', label: '4.50' },
  { value: '5.00', label: '5.00' }
];

const BALLOON_LENGTHS: PickerOption[] = [
  { value: '6', label: '6' }, { value: '8', label: '8' }, { value: '10', label: '10' },
  { value: '12', label: '12' }, { value: '15', label: '15' }, { value: '20', label: '20' },
  { value: '25', label: '25' }, { value: '30', label: '30' }
];

const GUIDING_CATHETER_CURVES: PickerOption[] = [
  { value: 'JL3.5', label: 'JL3.5' }, { value: 'JL4.0', label: 'JL4.0' }, { value: 'JL4.5', label: 'JL4.5' }, { value: 'JL5.0', label: 'JL5.0' },
  { value: 'JR3.5', label: 'JR3.5' }, { value: 'JR4.0', label: 'JR4.0' }, { value: 'JR4.5', label: 'JR4.5' },
  { value: 'AL.75', label: 'AL.75' }, { value: 'AL1.0', label: 'AL1.0' }, { value: 'AL1.5', label: 'AL1.5' }, { value: 'AL2.0', label: 'AL2.0' },
  { value: 'XB3.0', label: 'XB3.0' }, { value: 'XB3.5', label: 'XB3.5' }, { value: 'XB4.0', label: 'XB4.0' }
];

const GUIDING_CATHETER_SIZES: PickerOption[] = [
  { value: '5F', label: '5F' }, { value: '6F', label: '6F' }, { value: '7F', label: '7F' }, { value: '8F', label: '8F' }
];

const InventoryItemForm: React.FC<InventoryItemFormProps> = ({ items, onItemsChange }) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { canViewPrices } = usePermission(); // Encapsulated permission check

  const [productDefinitions, setProductDefinitions] = useState<ProductDefinition[]>([]);
  const [activeScannerId, setActiveScannerId] = useState<string | null>(null);
  const [highlightedRowId, setHighlightedRowId] = useState<string | null>(null);
  const [scanHistory, setScanHistory] = useState<string[][]>([]);

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

  const updateItem = useCallback((itemId: string, updates: Partial<PurchaseOrderItem>) => {
    onItemsChange(items.map(item => {
      if (item.id === itemId) {
        const updated = { ...item, ...updates };
        // Save recent variant when variant is selected
        if (updates.variant && updated.productDefinitionId) {
          saveRecentVariant(updated.productDefinitionId, updates.variant);
        }
        return updated;
      }
      return item;
    }));
  }, [items, onItemsChange]);

  const handleItemChange = (itemId: string, field: keyof PurchaseOrderItem, value: any) => {
    updateItem(itemId, { [field]: value });
  };

  const highlightRow = useCallback((rowId: string) => {
    setHighlightedRowId(rowId);
    setTimeout(() => setHighlightedRowId(null), 2000);
  }, []);

  const saveHistory = useCallback(() => {
    setScanHistory(prev => [...prev.slice(-19), items.map(item => JSON.stringify(item))]);
  }, [items]);

  const handleUndo = useCallback(() => {
    if (scanHistory.length === 0) return;
    const previousState = scanHistory[scanHistory.length - 1];
    onItemsChange(previousState.map(s => JSON.parse(s)));
    setScanHistory(prev => prev.slice(0, -1));
    toast({ title: t('undo'), description: t('last_action_undone') });
  }, [scanHistory, onItemsChange, t, toast]);

  const {
    videoRef,
    isScannerActive,
    error: scannerError,
    startScanner,
    stopScanner,
    captureAndDecode,
  } = useBarcodeScanner({
    onScanSuccess: async (data: ParsedGS1Data) => {
      if (activeScannerId) {
        saveHistory();
        const gs1Data = data;

        if (gs1Data && gs1Data.gtin) {
          const existingItemIndex = items.findIndex(item =>
            item.gtin === gs1Data.gtin &&
            item.batchNumber === (gs1Data.lotNumber || '') &&
            item.expiryDate?.toDateString() === (gs1Data.expiryDate ? new Date(gs1Data.expiryDate).toDateString() : undefined)
          );

          if (existingItemIndex !== -1 && items[existingItemIndex].id !== activeScannerId) {
            const existingItem = items[existingItemIndex];
            const newQuantity = parseInt(existingItem.quantity || '1') + 1;

            onItemsChange(items.map((item, idx) =>
              idx === existingItemIndex
                ? { ...item, quantity: newQuantity.toString() }
                : item
            ));

            highlightRow(existingItem.id);
            scanSuccessFeedback(false);

            toast({
              title: "➕ تم إضافة قطعة",
              description: `الكمية الإجمالية: ${newQuantity}`,
              duration: 2000,
              className: "bg-blue-50 border-blue-200"
            });

            stopScanner();
            setActiveScannerId(null);
            return;
          }

          const updates: Partial<PurchaseOrderItem> = {
            barcode: gs1Data.formattedValue,
            gtin: gs1Data.gtin,
            batchNumber: gs1Data.lotNumber || '',
          };

          if (gs1Data.expiryDate) {
            updates.expiryDate = new Date(gs1Data.expiryDate);
          }

          if (data.product_id) {
            updates.productDefinitionId = data.product_id;
            updates.variant = data.variant_name || '';
            const productName = productDefinitions.find(p => p.id === data.product_id)?.name || 'Unknown';
            toast({
              title: "✅ تم التعرف تلقائياً",
              description: `${productName} - ${data.variant_name || 'N/A'}\nLOT: ${gs1Data.lotNumber || 'N/A'}`,
              duration: 4000,
              className: "bg-green-50 border-green-200"
            });
            scanSuccessFeedback(true);
          } else {
            const mapping = await getGTINMapping(gs1Data.gtin);
            if (mapping) {
              updates.productDefinitionId = mapping.product_definition_id;
              updates.variant = mapping.variant_name;
              const productName = productDefinitions.find(p => p.id === mapping.product_definition_id)?.name || 'Unknown';
              toast({
                title: "✅ تم التعرف تلقائياً",
                description: `${productName} - ${mapping.variant_name}\nLOT: ${gs1Data.lotNumber || 'N/A'}`,
                duration: 4000,
                className: "bg-green-50 border-green-200"
              });
              scanSuccessFeedback(true);
            } else {
              toast({
                title: "⚠️ منتج جديد",
                description: `GTIN: ${gs1Data.gtin}\nاختر المنتج والمتغير من القوائم`,
                duration: 5000,
                className: "bg-amber-50 border-amber-200"
              });
              scanSuccessFeedback(true);
            }
          }

          onItemsChange(items.map(item =>
            item.id === activeScannerId ? { ...item, ...updates } : item
          ));
        } else {
          updateItem(activeScannerId, { barcode: data.rawValue });
          toast({
            title: t('barcode_scanned'),
            description: `${t('barcode')}: ${data.rawValue}`,
            duration: 2000
          });
          scanSuccessFeedback(true);
        }

        stopScanner();
        setActiveScannerId(null);
      }
    },
    onScanFailure: (error: Error) => {
      toast({ title: t('scan_error'), description: error.message, variant: 'destructive' });
      scanErrorFeedback();
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

  const addItem = () => {
    const newItem: PurchaseOrderItem = {
      id: `item_${Date.now()}`,
      barcode: '',
      productDefinitionId: '',
      variant: '',
      batchNumber: '',
      expiryDate: undefined,
      quantity: '1',
      purchasePrice: '0',
    };
    onItemsChange([...items, newItem]);
    playTick();
  };

  const removeItem = (itemId: string) => {
    if (items.length > 1) {
      onItemsChange(items.filter(item => item.id !== itemId));
      playTick();
    }
  };

  const duplicateItem = (itemId: string) => {
    const itemToDuplicate = items.find(item => item.id === itemId);
    if (itemToDuplicate) {
      const newItem = {
        ...itemToDuplicate,
        id: `item_${Date.now()}`,
        barcode: '',
        gtin: undefined,
        // Reset id to avoid duplicate keys error immediately on next render before state update?
        // Actually onItemsChange usage above sets new ID.
      };
      onItemsChange([...items, newItem]);
      playTick();
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
                  <TableHead className="w-[150px]">GTIN</TableHead>
                  <TableHead className="w-[120px]">{t('batch_number')}</TableHead>
                  <TableHead className="w-[150px]">{t('expiry_date')}</TableHead>
                  <TableHead>{t('product')}</TableHead>
                  <TableHead className="w-[200px]">{t('variant')}</TableHead>
                  <TableHead className="w-[80px]">{t('quantity')}</TableHead>
                  {canViewPrices && <TableHead className="w-[100px]">{t('purchase_price')}</TableHead>}
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const selectedDefinition = productDefinitions.find(def => def.id === item.productDefinitionId);
                  const recentVariants = selectedDefinition ? getRecentVariants(selectedDefinition.id) : [];
                  const isHighlighted = highlightedRowId === item.id;

                  return (
                    <React.Fragment key={item.id}>
                      <TableRow className={cn(
                        "transition-colors",
                        isHighlighted && "bg-blue-100 animate-pulse"
                      )}>
                        <TableCell className="p-2">
                          <div className="flex items-center gap-1">
                            <Input
                              value={item.barcode}
                              onChange={(e) => handleItemChange(item.id, 'barcode', e.target.value)}
                              placeholder={t('barcode')}
                              className="font-mono text-xs h-8"
                            />
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => handleStartScan(item.id)}
                            >
                              <ScanBarcode className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="p-2">
                          <Input
                            value={item.gtin || ''}
                            onChange={(e) => handleItemChange(item.id, 'gtin', e.target.value)}
                            placeholder="GTIN"
                            className="font-mono text-xs h-8"
                          />
                        </TableCell>
                        <TableCell className="p-2">
                          <Input
                            value={item.batchNumber}
                            onChange={(e) => handleItemChange(item.id, 'batchNumber', e.target.value)}
                            placeholder="LOT"
                            className="font-mono text-xs h-8"
                          />
                        </TableCell>
                        <TableCell className="p-2">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal text-xs h-8 px-2",
                                  !item.expiryDate && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-1 h-3 w-3" />
                                {item.expiryDate ? format(item.expiryDate, "yyyy-MM-dd") : <span>{t('pick_date')}</span>}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={item.expiryDate}
                                onSelect={(date) => handleItemChange(item.id, 'expiryDate', date)}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </TableCell>
                        <TableCell className="p-2">
                          <Select
                            value={item.productDefinitionId}
                            onValueChange={(val) => {
                              handleItemChange(item.id, 'productDefinitionId', val);
                              handleItemChange(item.id, 'variant', '');
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder={t('select_product')} />
                            </SelectTrigger>
                            <SelectContent>
                              {productDefinitions.map((def) => (
                                <SelectItem key={def.id} value={def.id}>{def.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="p-2">
                          {selectedDefinition ? (
                            (() => {
                              const typeName = selectedDefinition.supply_type?.name_en?.toLowerCase() || selectedDefinition.supply_type?.name?.toLowerCase() || '';
                              const isStent = typeName.includes('stent') || typeName.includes('دعامة');
                              const isBalloon = typeName.includes('balloon') || typeName.includes('بالون') || typeName.includes('ballon');
                              const isGuidingCatheter = (typeName.includes('catheter') && (typeName.includes('guid') || typeName.includes('mojja'))) || typeName.includes('موجهة');
                              const isDiagnosticCatheter = typeName.includes('diagnostic') || typeName.includes('تشخيص');

                              if (isStent) {
                                return (
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button variant="outline" className="w-full text-xs h-8 justify-between px-2">
                                        <span className="truncate">{item.variant || t('select_size')}</span>
                                        <Badge variant="secondary" className="ml-1 text-[10px] px-1 h-5">Matrix</Badge>
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                      <StentMatrixPicker
                                        onSelect={(variant) => {
                                          handleItemChange(item.id, 'variant', variant);
                                          // Close popover logic if needed, or user clicks away
                                        }}
                                        selectedVariant={item.variant}
                                        availableVariants={selectedDefinition.variants || []}
                                      />
                                    </PopoverContent>
                                  </Popover>
                                );
                              }

                              if (isBalloon) {
                                return (
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button variant="outline" className="w-full text-xs h-8 justify-between px-2">
                                        <span className="truncate">{item.variant || t('select_variant')}</span>
                                        <Badge variant="secondary" className="ml-1 text-[10px] px-1 h-5">Hybrid</Badge>
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                      <HybridVariantPicker
                                        primaryLabel="Diameter (mm)"
                                        primaryOptions={BALLOON_DIAMETERS}
                                        secondaryLabel="Length (mm)"
                                        secondaryOptions={BALLOON_LENGTHS}
                                        separator="x"
                                        selectedVariant={item.variant}
                                        onSelect={(variant) => handleItemChange(item.id, 'variant', variant)}
                                      />
                                    </PopoverContent>
                                  </Popover>
                                );
                              }

                              if (isGuidingCatheter) {
                                return (
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button variant="outline" className="w-full text-xs h-8 justify-between px-2">
                                        <span className="truncate">{item.variant || t('select_variant')}</span>
                                        <Badge variant="secondary" className="ml-1 text-[10px] px-1 h-5">Guide</Badge>
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                      <HybridVariantPicker
                                        primaryLabel="Curve"
                                        primaryOptions={GUIDING_CATHETER_CURVES}
                                        secondaryLabel="Size (F)"
                                        secondaryOptions={GUIDING_CATHETER_SIZES}
                                        separator=" "
                                        selectedVariant={item.variant}
                                        onSelect={(variant) => handleItemChange(item.id, 'variant', variant)}
                                      />
                                    </PopoverContent>
                                  </Popover>
                                );
                              }

                              if (isDiagnosticCatheter) {
                                return (
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button variant="outline" className="w-full text-xs h-8 justify-between px-2">
                                        <span className="truncate">{item.variant || t('select_curve')}</span>
                                        <Badge variant="secondary" className="ml-1 text-[10px] px-1 h-5">Visual</Badge>
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                      <CatheterCurvePicker
                                        onSelect={(curve) => handleItemChange(item.id, 'variant', curve)}
                                        selectedCurve={item.variant}
                                        availableVariants={selectedDefinition.variants || []}
                                      />
                                    </PopoverContent>
                                  </Popover>
                                );
                              }

                              return (
                                <VariantQuickPicker
                                  variants={selectedDefinition.variants}
                                  selectedVariant={item.variant}
                                  onSelect={(variant) => handleItemChange(item.id, 'variant', variant)}
                                  recentVariants={recentVariants}
                                />
                              );
                            })()
                          ) : (
                            <Input
                              value={item.variant}
                              onChange={(e) => handleItemChange(item.id, 'variant', e.target.value)}
                              placeholder={t('variant')}
                              className="text-xs h-8"
                            />
                          )}
                        </TableCell>
                        <TableCell className="p-2">
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                            className="text-center font-bold h-8 text-xs"
                          />
                        </TableCell>
                        {canViewPrices && (
                          <TableCell className="p-2">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.purchasePrice}
                              onChange={(e) => handleItemChange(item.id, 'purchasePrice', e.target.value)}
                              className="h-8 text-xs"
                            />
                          </TableCell>
                        )}
                        <TableCell className="p-2">
                          <div className="flex gap-1 justify-end">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => duplicateItem(item.id)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => removeItem(item.id)}
                              disabled={items.length <= 1}
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
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
              const recentVariants = selectedDefinition ? getRecentVariants(selectedDefinition.id) : [];

              return (
                <MobileSupplyItemCard
                  key={item.id}
                  itemId={item.id}
                  onScan={() => handleStartScan(item.id)}
                  onRemove={() => removeItem(item.id)}
                  onDuplicate={() => duplicateItem(item.id)}
                  canRemove={items.length > 1}
                >
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase text-muted-foreground">{t('barcode')}</Label>
                      <Input
                        value={item.barcode}
                        onChange={(e) => updateItem(item.id, { barcode: e.target.value })}
                        placeholder={t('barcode')}
                        className="font-mono h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase text-muted-foreground">GTIN</Label>
                      <Input
                        value={item.gtin || ''}
                        onChange={(e) => updateItem(item.id, { gtin: e.target.value })}
                        placeholder="GTIN"
                        className="font-mono h-9 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase text-muted-foreground">LOT</Label>
                      <Input
                        value={item.batchNumber}
                        onChange={(e) => updateItem(item.id, { batchNumber: e.target.value })}
                        placeholder="LOT"
                        className="font-mono h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase text-muted-foreground">{t('expiry_date')}</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal h-9 px-2 text-xs",
                              !item.expiryDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-3 w-3" />
                            {item.expiryDate ? format(item.expiryDate, "yyyy-MM-dd") : <span>{t('pick_date')}</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={item.expiryDate}
                            onSelect={(date) => updateItem(item.id, { expiryDate: date })}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  <div className="border-t pt-2 my-2 border-dashed" />

                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase text-muted-foreground">{t('product')}</Label>
                    <Select
                      value={item.productDefinitionId}
                      onValueChange={(val) => {
                        updateItem(item.id, { productDefinitionId: val, variant: '' });
                      }}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder={t('select_product')} />
                      </SelectTrigger>
                      <SelectContent>
                        {productDefinitions.map((def) => (
                          <SelectItem key={def.id} value={def.id}>{def.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase text-muted-foreground">{t('variant')}</Label>
                    {selectedDefinition ? (
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Input
                            value={item.variant}
                            onChange={(e) => updateItem(item.id, { variant: e.target.value })}
                            placeholder={t('variant') || "Variant"}
                            className="h-9 text-xs"
                          />
                        </div>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-9 w-9 shrink-0 bg-muted/50"
                              title={t('select_variant') || "Select Variant"}
                            >
                              <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[300px] p-2" align="end">
                            {(() => {
                              const typeName = selectedDefinition.supply_type?.name_en?.toLowerCase() || selectedDefinition.supply_type?.name?.toLowerCase() || '';
                              const isStent = typeName.includes('stent') || typeName.includes('دعامة');
                              const isBalloon = typeName.includes('balloon') || typeName.includes('بالون') || typeName.includes('ballon');
                              const isGuidingCatheter = (typeName.includes('catheter') && (typeName.includes('guid') || typeName.includes('mojja'))) || typeName.includes('موجهة');
                              const isDiagnosticCatheter = typeName.includes('diagnostic') || typeName.includes('تشخيص');

                              return (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between border-b pb-2">
                                    <h4 className="font-medium text-sm text-muted-foreground">{t('select_variant') || "Select Variant"}</h4>
                                  </div>
                                  {isStent ? (
                                    <StentMatrixPicker
                                      onSelect={(variant) => updateItem(item.id, { variant })}
                                      selectedVariant={item.variant}
                                      availableVariants={selectedDefinition.variants || []}
                                    />
                                  ) : isBalloon ? (
                                    <HybridVariantPicker
                                      primaryLabel="Diameter (mm)"
                                      primaryOptions={BALLOON_DIAMETERS}
                                      secondaryLabel="Length (mm)"
                                      secondaryOptions={BALLOON_LENGTHS}
                                      separator="x"
                                      selectedVariant={item.variant}
                                      onSelect={(variant) => updateItem(item.id, { variant })}
                                    />
                                  ) : isGuidingCatheter ? (
                                    <HybridVariantPicker
                                      primaryLabel="Curve"
                                      primaryOptions={GUIDING_CATHETER_CURVES}
                                      secondaryLabel="Size (F)"
                                      secondaryOptions={GUIDING_CATHETER_SIZES}
                                      separator=" "
                                      selectedVariant={item.variant}
                                      onSelect={(variant) => updateItem(item.id, { variant })}
                                    />
                                  ) : isDiagnosticCatheter ? (
                                    <CatheterCurvePicker
                                      onSelect={(curve) => updateItem(item.id, { variant: curve })}
                                      selectedCurve={item.variant}
                                      availableVariants={selectedDefinition.variants || []}
                                    />
                                  ) : (
                                    <VariantQuickPicker
                                      variants={selectedDefinition.variants}
                                      selectedVariant={item.variant}
                                      onSelect={(variant) => updateItem(item.id, { variant })}
                                      recentVariants={recentVariants}
                                    />
                                  )}
                                </div>
                              );
                            })()}
                          </PopoverContent>
                        </Popover>
                      </div>
                    ) : (
                      <Input
                        value={item.variant}
                        onChange={(e) => updateItem(item.id, { variant: e.target.value })}
                        placeholder={t('variant')}
                        className="h-9 text-xs"
                      />
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase text-muted-foreground">{t('quantity')}</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, { quantity: e.target.value })}
                        placeholder={t('quantity')}
                        className="h-9 text-xs font-bold"
                      />
                    </div>
                    {canViewPrices && (
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase text-muted-foreground">{t('purchase_price')}</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.purchasePrice}
                          onChange={(e) => updateItem(item.id, { purchasePrice: e.target.value })}
                          placeholder={t('purchase_price')}
                          className="h-9 text-xs"
                        />
                      </div>
                    )}
                  </div>
                </MobileSupplyItemCard>
              );
            })}
          </div>

          <div className="mt-4 flex gap-2">
            <Button
              type="button"
              onClick={addItem}
              variant="outline"
              className="flex-1"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              {t('add_item')}
            </Button>
            {scanHistory.length > 0 && (
              <Button
                type="button"
                onClick={handleUndo}
                variant="ghost"
                className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
              >
                {t('undo')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {isScannerActive && (
        <div className="fixed inset-0 z-50 bg-black">
          <video ref={videoRef} className="w-full h-full object-cover" playsInline />
          <BarcodeScannerViewfinder onCapture={captureAndDecode} />
          <Button
            onClick={() => {
              stopScanner();
              setActiveScannerId(null);
            }}
            className="absolute top-4 right-4"
            variant="destructive"
          >
            {t('cancel')}
          </Button>
        </div>
      )}
    </>
  );
};

export default InventoryItemForm;
