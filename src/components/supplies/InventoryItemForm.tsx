import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ProductDefinition } from '@/types';
import { CalendarIcon, ScanBarcode, PlusCircle, Trash2, Copy, Sparkles } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { getProductDefinitions } from '@/data/operations/productDefinitionOperations';
import { useBarcodeScanner, extractGS1DataForSupply, ParsedGS1Data } from '@/hooks/useBarcodeScanner';
import { BarcodeScannerViewfinder } from '@/components/ui/BarcodeScannerViewfinder';
import { MobileSupplyItemCard } from '@/components/supplies/MobileSupplyItemCard';
import { VariantQuickPicker } from './VariantQuickPicker';
import { getGTINMapping } from '@/data/operations/gtinMappingOperations';
import { saveRecentVariant, getRecentVariants } from '@/utils/variantPreferences';
import { scanSuccessFeedback, scanErrorFeedback, playTick } from '@/utils/audioFeedback';
import { Badge } from '@/components/ui/badge';

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

interface InventoryItemFormProps {
  items: PurchaseOrderItem[];
  onItemsChange: (items: PurchaseOrderItem[]) => void;
}

const InventoryItemForm: React.FC<InventoryItemFormProps> = ({ items, onItemsChange }) => {
  const { t } = useLanguage();
  const { toast } = useToast();
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

  const handleItemChange = useCallback((itemId: string, field: keyof PurchaseOrderItem, value: any) => {
    onItemsChange(items.map(item => {
      if (item.id === itemId) {
        const updated = { ...item, [field]: value };

        // Save recent variant when variant is selected
        if (field === 'variant' && value && updated.productDefinitionId) {
          saveRecentVariant(updated.productDefinitionId, value);
        }

        return updated;
      }
      return item;
    }));
  }, [items, onItemsChange]);

  // Highlight a row temporarily
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
          // ✨ SMART GROUPING: Check if item already exists
          const existingItemIndex = items.findIndex(item =>
            item.gtin === gs1Data.gtin &&
            item.batchNumber === (gs1Data.lotNumber || '') &&
            item.expiryDate?.toDateString() === (gs1Data.expiryDate ? new Date(gs1Data.expiryDate).toDateString() : undefined)
          );

          if (existingItemIndex !== -1 && items[existingItemIndex].id !== activeScannerId) {
            // Item exists - increment quantity
            const existingItem = items[existingItemIndex];
            const newQuantity = parseInt(existingItem.quantity || '1') + 1;

            onItemsChange(items.map((item, idx) =>
              idx === existingItemIndex
                ? { ...item, quantity: newQuantity.toString() }
                : item
            ));

            // Visual feedback
            highlightRow(existingItem.id);
            scanSuccessFeedback(false); // Duplicate sound

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

          // Updates for the current item
          const updates: Partial<PurchaseOrderItem> = {
            barcode: gs1Data.formattedValue,
            gtin: gs1Data.gtin,
            batchNumber: gs1Data.lotNumber || '',
          };

          if (gs1Data.expiryDate) {
            updates.expiryDate = new Date(gs1Data.expiryDate);
          }

          // Use auto-detected mapping if available from hook
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
            // Fallback: check GTIN mapping manually just in case
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
          // Regular barcode
          handleItemChange(activeScannerId, 'barcode', data.rawValue);
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
                  <TableHead>{t('product')}</TableHead>
                  <TableHead>{t('variant')}</TableHead>
                  <TableHead>{t('batch_number')}</TableHead>
                  <TableHead>{t('expiry_date')}</TableHead>
                  <TableHead className="w-[100px]">{t('quantity')}</TableHead>
                  <TableHead className="w-[120px]">{t('purchase_price')}</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
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
                        <TableCell className="p-2 md:p-4">
                          <div className="flex items-center gap-2">
                            <Input
                              value={item.barcode}
                              onChange={(e) => handleItemChange(item.id, 'barcode', e.target.value)}
                              placeholder={t('scan_or_enter_barcode')}
                              className="font-mono text-xs"
                            />
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() => handleStartScan(item.id)}
                              title="Scan barcode"
                            >
                              <ScanBarcode className="h-5 w-5" />
                            </Button>
                            {item.gtin && (
                              <Badge variant="secondary" className="text-xs">
                                <Sparkles className="h-3 w-3 mr-1" />
                                GTIN
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="p-2 md:p-4">
                          <Select
                            value={item.productDefinitionId}
                            onValueChange={(val) => {
                              handleItemChange(item.id, 'productDefinitionId', val);
                              handleItemChange(item.id, 'variant', ''); // Reset variant
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={t('select_product')} />
                            </SelectTrigger>
                            <SelectContent>
                              {productDefinitions.map((def) => (
                                <SelectItem key={def.id} value={def.id}>{def.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="p-2 md:p-4">
                          {selectedDefinition ? (
                            <VariantQuickPicker
                              variants={selectedDefinition.variants}
                              selectedVariant={item.variant}
                              onSelect={(variant) => handleItemChange(item.id, 'variant', variant)}
                              recentVariants={recentVariants}
                            />
                          ) : (
                            <Select value={item.variant} disabled>
                              <SelectTrigger>
                                <SelectValue placeholder={t('select_product_first')} />
                              </SelectTrigger>
                            </Select>
                          )}
                        </TableCell>
                        <TableCell className="p-2 md:p-4">
                          <Input
                            value={item.batchNumber}
                            onChange={(e) => handleItemChange(item.id, 'batchNumber', e.target.value)}
                            placeholder="LOT"
                            className="font-mono text-xs"
                          />
                        </TableCell>
                        <TableCell className="p-2 md:p-4">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal text-xs",
                                  !item.expiryDate && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {item.expiryDate ? format(item.expiryDate, "PPP") : <span>{t('pick_date')}</span>}
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
                        <TableCell className="p-2 md:p-4">
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                            className="text-center font-bold"
                          />
                        </TableCell>
                        <TableCell className="p-2 md:p-4">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.purchasePrice}
                            onChange={(e) => handleItemChange(item.id, 'purchasePrice', e.target.value)}
                          />
                        </TableCell>
                        <TableCell className="p-2 md:p-4">
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => duplicateItem(item.id)}
                              title="Duplicate item"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeItem(item.id)}
                              disabled={items.length <= 1}
                              title="Remove item"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
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
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Input
                        value={item.barcode}
                        onChange={(e) => handleItemChange(item.id, 'barcode', e.target.value)}
                        placeholder={t('scan_or_enter_barcode')}
                        className="font-mono"
                      />
                      {item.gtin && (
                        <Badge variant="secondary" className="text-xs">
                          <Sparkles className="h-3 w-3 mr-1" />
                          Auto
                        </Badge>
                      )}
                    </div>

                    <Select
                      value={item.productDefinitionId}
                      onValueChange={(val) => {
                        handleItemChange(item.id, 'productDefinitionId', val);
                        handleItemChange(item.id, 'variant', '');
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('select_product')} />
                      </SelectTrigger>
                      <SelectContent>
                        {productDefinitions.map((def) => (
                          <SelectItem key={def.id} value={def.id}>{def.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {selectedDefinition && (
                      <VariantQuickPicker
                        variants={selectedDefinition.variants}
                        selectedVariant={item.variant}
                        onSelect={(variant) => handleItemChange(item.id, 'variant', variant)}
                        recentVariants={recentVariants}
                      />
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        value={item.batchNumber}
                        onChange={(e) => handleItemChange(item.id, 'batchNumber', e.target.value)}
                        placeholder={t('batch_number')}
                        className="font-mono"
                      />
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !item.expiryDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {item.expiryDate ? format(item.expiryDate, "P") : <span>{t('pick_date')}</span>}
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
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                        placeholder={t('quantity')}
                      />
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.purchasePrice}
                        onChange={(e) => handleItemChange(item.id, 'purchasePrice', e.target.value)}
                        placeholder={t('purchase_price')}
                      />
                    </div>
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

      {/* Barcode Scanner Overlay */}
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
