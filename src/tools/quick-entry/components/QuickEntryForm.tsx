import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ParsedGS1Data } from '../hooks/useBarcodeScanner';
import { StentMatrixPicker } from '@/components/supplies/StentMatrixPicker';
import { CatheterCurvePicker } from '@/components/supplies/CatheterCurvePicker';
import { db, LocalInventoryEntry } from '../data/localDb';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { Search, Check, ChevronRight, ChevronLeft, PackageX } from 'lucide-react';
import { toast } from 'sonner';
import { ProductDefinition } from '@/types';

interface QuickEntryFormProps {
  isOpen: boolean;
  onClose: () => void;
  scannedData: ParsedGS1Data;
  onSave: (entry: LocalInventoryEntry) => void;
  initialValues?: LocalInventoryEntry | null;
}

export type WizardStep = 'context' | 'product' | 'variant' | 'review';

// All 4 steps in fixed order
const STEPS: WizardStep[] = ['context', 'product', 'variant', 'review'];

export const QuickEntryForm: React.FC<QuickEntryFormProps> = ({
  isOpen,
  onClose,
  scannedData,
  onSave,
  initialValues
}) => {
  const [step, setStep] = useState<WizardStep>('context');
  
  // Data for inputs
  const [manufacturers, setManufacturers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [productDefsCache, setProductDefsCache] = useState<any[]>([]); // Full product definitions with variants
  const [availableVariants, setAvailableVariants] = useState<any[]>([]);

  // Selection state
  const [mfgId, setMfgId] = useState<string>('');
  const [supplierId, setSupplierId] = useState<string>('');
  const [productId, setProductId] = useState<string>('');
  const [productName, setProductName] = useState<string>('');
  const [selectedVariant, setSelectedVariant] = useState<string>('');
  const [qty, setQty] = useState<number>(1);
  const [price, setPrice] = useState<number>(0);
  const [lot, setLot] = useState<string>(scannedData.lotNumber || '');
  const [expiry, setExpiry] = useState<string>(scannedData.expiryDate || '');
  
  const [searchQuery, setSearchQuery] = useState('');
  const supabase = getSupabaseClient();

  // 1. Initial Load & Pre-fill from last scan of same barcode
  useEffect(() => {
    if (isOpen) {
      loadInitialData();
      checkExistingEntry();
      // Ensure LOT/Expiry are synced with current scan immediately on open
      setLot(scannedData.lotNumber || '');
      setExpiry(scannedData.expiryDate || '');
    } else {
      // Reset for next scan
      setStep('context');
      setProductId('');
      setProductName('');
      setSelectedVariant('');
      setAvailableVariants([]);
      setQty(1);
      setPrice(0);
      setLot('');
      setExpiry('');
      setSearchQuery('');
    }
  }, [isOpen, scannedData]);

  const loadInitialData = async () => {
    try {
      // Try to load from cache table first (Offline support)
      const cachedMfgs = await db.cache.get('manufacturers');
      const cachedSups = await db.cache.get('suppliers');
      const cachedProducts = await db.cache.get('product_definitions');

      if (cachedMfgs) setManufacturers(cachedMfgs.data);
      if (cachedSups) setSuppliers(cachedSups.data);
      if (cachedProducts) setProductDefsCache(cachedProducts.data);

      // Fetch fresh if online
      const { data: mfgs } = await supabase.from('manufacturers').select('id, name');
      const { data: sups } = await supabase.from('suppliers').select('id, name');
      // Fetch ALL product definitions WITH their variants (JSONB column)
      const { data: prods } = await supabase.from('product_definitions')
        .select('id, name, variants, variant_label, visual_picker_preference')
        .order('name', { ascending: true });

      if (mfgs) {
        setManufacturers(mfgs);
        db.cache.put({ id: 'manufacturers', data: mfgs, updatedAt: Date.now() });
      }
      if (sups) {
        setSuppliers(sups);
        db.cache.put({ id: 'suppliers', data: sups, updatedAt: Date.now() });
      }
      if (prods) {
        setProductDefsCache(prods);
        db.cache.put({ id: 'product_definitions', data: prods, updatedAt: Date.now() });
      }

      // Memory: Default to last used if not set
      const lastEntry = await db.inventory_entries.orderBy('timestamp').last();
      if (lastEntry && !mfgId) setMfgId(lastEntry.manufacturerId || '');
      if (lastEntry && !supplierId) setSupplierId(lastEntry.supplierId);
    } catch (e) {
      console.error("Failed to load initial data", e);
    }
  };

  const checkExistingEntry = async () => {
    // 1. If explicit edit from list
    if (initialValues) {
      setMfgId(initialValues.manufacturerId || '');
      setSupplierId(initialValues.supplierId);
      setProductId(initialValues.productDefinitionId);
      setProductName(initialValues.productName);
      setSelectedVariant(initialValues.variant);
      setPrice(initialValues.purchasePrice || 0);
      setQty(initialValues.quantity);
      setLot(initialValues.lotNumber);
      setExpiry(initialValues.expiryDate);
      return;
    }

    // 2. High Priority: Exact Barcode Match in Local DB (Same Batch/Expiry)
    const exactMatch = await db.inventory_entries
      .where('barcode')
      .equals(scannedData.rawValue)
      .last();

    if (exactMatch) {
      setMfgId(exactMatch.manufacturerId || '');
      setSupplierId(exactMatch.supplierId);
      setProductId(exactMatch.productDefinitionId);
      setProductName(exactMatch.productName);
      setSelectedVariant(exactMatch.variant);
      setPrice(exactMatch.purchasePrice || 0);
      return;
    }

    // 3. Medium Priority: GTIN Match in Local DB (Different Batch, Same Product/Context)
    if (scannedData.gtin) {
      const gtinMatch = await db.inventory_entries
        .where('gtin')
        .equals(scannedData.gtin)
        .last();

      if (gtinMatch) {
        setMfgId(gtinMatch.manufacturerId || '');
        setSupplierId(gtinMatch.supplierId);
        setProductId(gtinMatch.productDefinitionId);
        setProductName(gtinMatch.productName);
        setSelectedVariant(gtinMatch.variant);
        setPrice(gtinMatch.purchasePrice || 0);
        return;
      }
    }

    // 4. Low Priority: Supabase Mapping (Already stored in central DB)
    if (scannedData.product_id) {
      setProductId(scannedData.product_id);
      setSelectedVariant(scannedData.variant_name || '');
      
      const supabase = getSupabaseClient();
      const { data } = await supabase
        .from('product_definitions')
        .select('name')
        .eq('id', scannedData.product_id)
        .single();
        
      if (data) {
        setProductName(data.name);
      }
    }
  };

  // ============================================================
  // FIXED STEP NAVIGATION: Always 4 steps, always manual
  // ============================================================
  const nextStep = () => {
    const currentIndex = STEPS.indexOf(step);
    if (currentIndex < STEPS.length - 1) {
      // Validate current step before moving
      if (step === 'context' && (!mfgId || !supplierId)) {
        toast.error('يرجى اختيار الشركة المصنعة والمورد أولاً');
        return;
      }
      if (step === 'product' && !productId) {
        toast.error('يرجى اختيار المنتج أولاً');
        return;
      }
      setStep(STEPS[currentIndex + 1]);
    }
  };

  const prevStep = () => {
    const currentIndex = STEPS.indexOf(step);
    if (currentIndex > 0) {
      setStep(STEPS[currentIndex - 1]);
    }
  };

  // Load variants from the cached product definitions (JSONB column)
  const loadVariantsFromCache = (pId: string) => {
    const productDef = productDefsCache.find(p => p.id === pId);
    if (productDef && productDef.variants && Array.isArray(productDef.variants) && productDef.variants.length > 0) {
      setAvailableVariants(productDef.variants);
      return true;
    }
    setAvailableVariants([]);
    return false;
  };

  // When productId changes, update variants from cache
  useEffect(() => {
    if (productId && productDefsCache.length > 0) {
      loadVariantsFromCache(productId);
    }
  }, [productId, productDefsCache]);

  // Product search: filter from cached product definitions (instant, offline-capable)
  const handleProductSearch = (query?: string) => {
    if (!query) {
      setProducts(productDefsCache.slice(0, 30));
      return;
    }
    const q = query.toLowerCase();
    const filtered = productDefsCache.filter(p => p.name.toLowerCase().includes(q));
    setProducts(filtered.slice(0, 30));
  };

  // Trigger search when entering product step
  useEffect(() => {
    if (step === 'product') {
      handleProductSearch(searchQuery || undefined);
    }
  }, [step, productDefsCache]);

  const handleProductSelection = (p: any) => {
    setProductId(p.id);
    setProductName(p.name);
    setSelectedVariant(''); // Reset variant when product changes
    // Do NOT auto-navigate; user will press "التالي" manually
  };

  const handleSave = () => {
    if (!productId || !qty) return;

    const entry: LocalInventoryEntry = {
      barcode: scannedData.rawValue,
      gtin: scannedData.gtin,
      lotNumber: lot,
      expiryDate: expiry,
      quantity: qty,
      purchasePrice: price,
      productDefinitionId: productId,
      productName: productName,
      variant: selectedVariant,
      manufacturerId: mfgId,
      manufacturerName: manufacturers.find(m => m.id === mfgId)?.name,
      supplierId: supplierId,
      supplierName: suppliers.find(s => s.id === supplierId)?.name,
      timestamp: Date.now()
    };

    onSave(entry);
    onClose();
  };

  // Get the full ProductDefinition object for the selected product
  const selectedProduct: ProductDefinition | undefined = useMemo(() => {
    if (!productId) return undefined;
    return productDefsCache.find((p: any) => p.id === productId) as ProductDefinition | undefined;
  }, [productId, productDefsCache]);

  const hasVariants = selectedProduct?.variants && selectedProduct.variants.length > 0;
  const pickerPreference = selectedProduct?.visual_picker_preference || 'auto';
  const isMatrix = pickerPreference === 'matrix';
  const isCurve = pickerPreference === 'curve';
  const isList = pickerPreference === 'list' || (!isMatrix && !isCurve);

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg p-0 overflow-hidden bg-background border-none shadow-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
        <div className="bg-primary p-6 text-primary-foreground">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center justify-between">
              <span>{step === 'context' ? 'الجهة الموردة' : step === 'product' ? 'اختيار المنتج' : step === 'variant' ? 'اختيار المتغير' : 'مراجعة البيانات'}</span>
              <span className="text-sm opacity-70 font-normal">الخطوة {STEPS.indexOf(step) + 1} من 4</span>
            </DialogTitle>
          </DialogHeader>
          {/* Step Progress Indicator */}
          <div className="flex gap-1 mt-3">
            {STEPS.map((s, i) => (
              <div key={s} className={`flex-1 h-1.5 rounded-full transition-all ${STEPS.indexOf(step) >= i ? 'bg-primary-foreground' : 'bg-primary-foreground/30'}`} />
            ))}
          </div>
        </div>

        <div className="p-6 space-y-6 min-h-[250px]">
          {/* ===== STEP 1: Context (Manufacturer & Supplier) ===== */}
          {step === 'context' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>الشركة المصنعة</Label>
                <Select value={mfgId} onValueChange={setMfgId}>
                  <SelectTrigger className="h-12 text-lg">
                    <SelectValue placeholder="اختر الشركة..." />
                  </SelectTrigger>
                  <SelectContent>
                    {manufacturers.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>المورد</Label>
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger className="h-12 text-lg">
                    <SelectValue placeholder="اختر المورد..." />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* ===== STEP 2: Product Selection ===== */}
          {step === 'product' && (
            <div className="space-y-4">
               {productName && (
                  <div className="bg-primary/10 p-3 rounded-lg flex items-center justify-between border border-primary/20">
                     <span className="font-bold text-primary">{productName}</span>
                     <Button variant="ghost" size="sm" onClick={() => {setProductId(''); setProductName(''); setSelectedVariant(''); setAvailableVariants([]);}}>تغيير</Button>
                  </div>
               )}
               {!productId && (
                  <>
                    <div className="flex gap-2">
                        <Input 
                            placeholder="ابحث عن منتج..." 
                            value={searchQuery} 
                            onChange={e => { setSearchQuery(e.target.value); handleProductSearch(e.target.value); }}
                            className="h-11"
                        />
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-1 border rounded-lg p-1">
                        {products.map(p => (
                            <Button 
                                key={p.id} 
                                variant="ghost" 
                                className="w-full justify-start text-right h-auto py-3 px-4 border-b last:border-0"
                                onClick={() => handleProductSelection(p)}
                            >
                                {p.name}
                            </Button>
                        ))}
                        {products.length === 0 && <div className="p-4 text-center text-muted-foreground">لا توجد نتائج</div>}
                    </div>
                  </>
               )}
            </div>
          )}

          {/* ===== STEP 3: Variant Selection (ALWAYS SHOWN) ===== */}
          {step === 'variant' && (
            <div className="py-2">
              {hasVariants && selectedProduct ? (
                <div className="space-y-4">
                  {/* Product Info Banner */}
                  <div className="bg-muted/30 p-3 rounded-lg text-center">
                    <div className="text-sm text-muted-foreground">المنتج المختار</div>
                    <div className="text-lg font-bold text-primary">{selectedProduct.name}</div>
                    <div className="text-xs mt-1">{selectedProduct.variant_label || 'المتغير'}</div>
                  </div>

                  {/* Variant Picker - Same logic as BatchVariantStep */}
                  <div className="min-h-[200px]">
                    {isMatrix && (
                      <StentMatrixPicker
                        availableVariants={selectedProduct.variants || []}
                        selectedVariant={selectedVariant}
                        onSelect={setSelectedVariant}
                      />
                    )}

                    {isCurve && (
                      <CatheterCurvePicker
                        availableVariants={selectedProduct.variants || []}
                        selectedCurve={selectedVariant}
                        onSelect={setSelectedVariant}
                      />
                    )}

                    {isList && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {selectedProduct.variants.map((v: any, idx: number) => {
                          const vName = typeof v === 'string' ? v : (v.name || JSON.stringify(v));
                          return (
                            <Button
                              key={idx}
                              variant={selectedVariant === vName ? 'default' : 'outline'}
                              className={`h-14 text-base whitespace-normal ${selectedVariant === vName ? 'border-2 border-primary font-bold' : ''}`}
                              onClick={() => setSelectedVariant(vName)}
                            >
                              {vName}
                            </Button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Selection Summary */}
                  {selectedVariant && (
                    <div className="text-center text-sm font-bold bg-primary/10 text-primary px-4 py-2 rounded-full">
                      تم اختيار: {selectedVariant}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                  <PackageX className="h-16 w-16 mb-4 opacity-30" />
                  <p className="text-lg font-bold">لا توجد متغيرات لهذا الصنف</p>
                  <p className="text-sm opacity-70 mt-1">يمكنك الانتقال للخطوة التالية مباشرة</p>
                </div>
              )}
            </div>
          )}

          {/* ===== STEP 4: Review & Save ===== */}
          {step === 'review' && (
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 bg-muted/30 p-3 rounded-lg border border-dashed text-sm">
                    <div>
                        <Label className="text-[10px] text-muted-foreground">LOT</Label>
                        <div className="font-mono font-bold">{lot || '-'}</div>
                    </div>
                    <div>
                        <Label className="text-[10px] text-muted-foreground">Expiry</Label>
                        <div className="font-mono font-bold text-destructive">{expiry || '-'}</div>
                    </div>
                    <div className="col-span-2 border-t pt-2 mt-1">
                        <Label className="text-[10px] text-muted-foreground">Barcode</Label>
                        <div className="font-mono text-[10px] break-all opacity-50">{scannedData.rawValue}</div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <Label>سعر الشراء</Label>
                        <Input type="number" value={price} onChange={e => setPrice(parseFloat(e.target.value) || 0)} className="h-12 text-center text-lg font-bold" />
                    </div>
                    <div className="space-y-1">
                        <Label>الكمية</Label>
                        <Input type="number" value={qty} onChange={e => setQty(parseInt(e.target.value) || 1)} className="h-12 text-center text-lg font-bold" />
                    </div>
                </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-6 bg-muted/20 border-t flex items-center justify-between gap-4">
          {step !== 'context' && (
            <Button variant="outline" onClick={prevStep} className="flex-1 h-12">
              <ChevronLeft className="mr-2 h-4 w-4" /> السابق
            </Button>
          )}
          
          {step !== 'review' ? (
            <Button onClick={nextStep} className="flex-1 h-12">
              التالي <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSave} className="flex-1 h-12 bg-green-600 hover:bg-green-700 text-white font-bold text-lg">
              <Check className="mr-2 h-5 w-5" /> حفظ البيانات
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
