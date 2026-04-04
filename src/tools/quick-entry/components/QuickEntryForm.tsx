import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ParsedGS1Data } from '../hooks/useBarcodeScanner';
import { SmartHybridPicker } from './SmartHybridPicker';
import { db, LocalInventoryEntry } from '../data/localDb';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { Search, Check, ChevronRight, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';

interface QuickEntryFormProps {
  isOpen: boolean;
  onClose: () => void;
  scannedData: ParsedGS1Data;
  onSave: (entry: LocalInventoryEntry) => void;
  initialValues?: LocalInventoryEntry | null;
}

export type WizardStep = 'context' | 'product' | 'variant' | 'review';

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
      setQty(1);
      setPrice(0);
      setLot('');
      setExpiry('');
    }
  }, [isOpen, scannedData]);

  const loadInitialData = async () => {
    try {
      // Try to load from cache table first (Offline support)
      const cachedMfgs = await db.cache.get('manufacturers');
      const cachedSups = await db.cache.get('suppliers');

      if (cachedMfgs) setManufacturers(cachedMfgs.data);
      if (cachedSups) setSuppliers(cachedSups.data);

      // Fetch fresh if online
      const { data: mfgs } = await supabase.from('manufacturers').select('id, name');
      const { data: sups } = await supabase.from('suppliers').select('id, name');

      if (mfgs) {
        setManufacturers(mfgs);
        db.cache.put({ id: 'manufacturers', data: mfgs, updatedAt: Date.now() });
      }
      if (sups) {
        setSuppliers(sups);
        db.cache.put({ id: 'suppliers', data: sups, updatedAt: Date.now() });
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
      return; // Found everything locally
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
        .select('name, manufacturer_id')
        .eq('id', scannedData.product_id)
        .single();
        
      if (data) {
        setProductName(data.name);
        if (data.manufacturer_id) setMfgId(data.manufacturer_id);
      }
    }
  };

  // Step Nav
  const nextStep = () => {
    if (step === 'context' && mfgId && supplierId) setStep('product');
    else if (step === 'product' && productId) {
      // Check if product has variants
      loadVariants(productId).then(hasVariants => {
        if (hasVariants) setStep('variant');
        else setStep('review');
      });
    }
    else if (step === 'variant') setStep('review');
  };

  const prevStep = () => {
    if (step === 'review') {
        loadVariants(productId).then(hasVariants => {
            setStep(hasVariants ? 'variant' : 'product');
        });
    }
    else if (step === 'variant') setStep('product');
    else if (step === 'product') setStep('context');
  };

  const loadVariants = async (pId: string): Promise<boolean> => {
    const { data } = await supabase.from('product_variants').select('id, name').eq('product_definition_id', pId);
    if (data && data.length > 0) {
      setAvailableVariants(data);
      return true;
    }
    setAvailableVariants([]);
    return false;
  };

  const handleProductSearch = async (query?: string) => {
    const supabase = getSupabaseClient();
    let rpc = supabase.from('product_definitions')
      .select('id, name'); // Removed manufacturer_id as it doesn't exist on this table

    if (query) {
      rpc = rpc.ilike('name', `%${query}%`);
    }
    
    const { data, error } = await rpc.limit(20);
    if (error) {
      console.error('Search error:', error);
      return;
    }
    if (data) setProducts(data);
  };

  // Trigger search when entering product step
  useEffect(() => {
    if (step === 'product') {
        handleProductSearch(searchQuery);
    }
  }, [step, mfgId]);

  const handleProductSelection = (p: any) => {
    setProductId(p.id);
    setProductName(p.name);
    // Note: manufacturer_id is not stored in product_definitions directly
    nextStep(); 
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

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden bg-background border-none shadow-2xl rounded-2xl">
        <div className="bg-primary p-6 text-primary-foreground">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center justify-between">
              <span>{step === 'context' ? 'الجهة الموردة' : step === 'product' ? 'اختيار المنتج' : step === 'variant' ? 'اختيار المتغير' : 'مراجعة البيانات'}</span>
              <span className="text-sm opacity-70 font-normal">Step {step === 'context' ? 1 : step === 'product' ? 2 : step === 'variant' ? 3 : 4}/4</span>
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-6">
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

          {step === 'product' && (
            <div className="space-y-4">
               {productName && (
                  <div className="bg-primary/10 p-3 rounded-lg flex items-center justify-between border border-primary/20">
                     <span className="font-bold text-primary">{productName}</span>
                     <Button variant="ghost" size="sm" onClick={() => {setProductId(''); setProductName('');}}>تغيير</Button>
                  </div>
               )}
               {!productId && (
                  <>
                    <div className="flex gap-2">
                        <Input 
                            placeholder="ابحث عن منتج..." 
                            value={searchQuery} 
                            onChange={e => setSearchQuery(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleProductSearch(searchQuery)}
                            className="h-11"
                        />
                        <Button onClick={() => handleProductSearch(searchQuery)} className="h-11 px-3"><Search className="h-4 w-4" /></Button>
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

          {step === 'variant' && (
            <div className="flex justify-center py-2">
                <SmartHybridPicker
                    availableVariants={availableVariants}
                    selectedVariant={selectedVariant}
                    onSelect={setSelectedVariant}
                    primaryLabel="المقاس / القطر"
                    secondaryLabel="الطول / الحجم"
                    separator="x"
                    mode={productName.includes('Ballon') ? 'balloon' : productName.includes('Guide') ? 'guide' : 'general'}
                />
            </div>
          )}

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
