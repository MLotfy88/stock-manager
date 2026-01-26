import React, { useState, useEffect, useMemo } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { useMediaQuery } from '@/hooks/use-mobile';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getSuppliers } from '@/data/operations/supplierOperations';
import { Supplier, Manufacturer, Store, StockType, ProductDefinition, PaymentMethod, PaymentStatus, VoucherInstallment } from '@/types';
import { Save, RotateCcw, Trash2, Plus, Edit, Scan, ExternalLink, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { getManufacturers } from '@/data/operations/manufacturerOperations';
import { getStores } from '@/data/operations/storesOperations';
import { createSupplyVoucherWithItems, saveDraftVoucher, finalizeDraftVoucher } from '@/data/operations/voucherOperations';
import { batchSaveGTINMappings, getGTINMapping } from '@/data/operations/gtinMappingOperations';
import { ParsedGS1Data } from '@/hooks/useBarcodeScanner';
import QuickActionScanner from '@/components/supplies/QuickActionScanner';
import ItemConfirmationDialog, { ConfirmedItemData } from '@/components/supplies/ItemConfirmationDialog';
import { NewItemWizard } from '@/components/supplies/NewItemWizard';
import { getProductDefinitions } from '@/data/operations/productDefinitionOperations';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import DocumentScanner from '@/components/common/DocumentScanner';
import { getSupabaseClient } from '@/lib/supabaseClient';
import BatchReviewDialog from '@/components/supplies/BatchReviewDialog';

// Extended type for local cart items
interface CartItem {
  id: string;
  productDefinitionId: string;
  productName: string;
  variant: string;
  barcode: string;
  gtin?: string; // Captured from GS1
  batchNumber: string;
  expiryDate?: Date;
  quantity: number;
  purchasePrice: number;
}

// Batch scan entry
interface BatchScanEntry {
  id: string;
  timestamp: number;
  rawBarcode: string;
  fingerprint: string;
  parsedData: ParsedGS1Data;
}

// Generate fingerprint for grouping
const generateFingerprint = (data: ParsedGS1Data): string => {
  const parts = [
    data.gtin || '',
    (data as any).batch || (data as any).batchNumber || '', // Safe access
    (data as any).expiry || (data as any).expiryDate || '', // Safe access
    data.quantity?.toString() || '1'
  ];
  return parts.join('|');
};

const AddInventoryPage = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 1024px)');
  const { t, direction } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => isMobile && setIsSidebarOpen(false);

  // --- Data Loading ---
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [manufacturersList, setManufacturersList] = useState<Manufacturer[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [productDefsCache, setProductDefsCache] = useState<ProductDefinition[]>([]);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [suppliersData, manufacturersData, storesData, defsData] = await Promise.all([
          getSuppliers(),
          getManufacturers(),
          getStores(),
          getProductDefinitions(),
        ]);
        setSuppliers(suppliersData);
        setManufacturersList(manufacturersData);
        setStores(storesData);
        setProductDefsCache(defsData);
      } catch (error) {
        toast({ title: t('error'), description: t('error_fetching_data'), variant: 'destructive' });
      }
    };
    loadInitialData();
  }, [toast, t]);

  // --- Form State ---
  const [supplierId, setSupplierId] = useState('');
  const [manufacturerId, setManufacturerId] = useState('');
  const [storeId, setStoreId] = useState('');
  const [stockType, setStockType] = useState<StockType>('purchased');
  const [voucherNumber, setVoucherNumber] = useState('');

  // --- Payment State ---
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('paid');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [installments, setInstallments] = useState<Omit<VoucherInstallment, 'id' | 'voucher_id' | 'status'>[]>([]);

  // Installment input state
  const [newInstAmount, setNewInstAmount] = useState<string>('');
  const [newInstDate, setNewInstDate] = useState<string>('');
  const [newInstNote, setNewInstNote] = useState<string>('');

  // --- Scanner State ---
  const [isDocScannerOpen, setIsDocScannerOpen] = useState(false);
  // Multi-page support: Arrays instead of single value
  const [invoiceImageBlobs, setInvoiceImageBlobs] = useState<Blob[]>([]);
  const [invoiceImageUrls, setInvoiceImageUrls] = useState<string[]>([]);

  // --- Cart State ---
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // Calculated Totals
  const totalCartValue = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + (item.quantity * item.purchasePrice), 0);
  }, [cartItems]);

  useEffect(() => {
    // Create preview URLs
    const urls = invoiceImageBlobs.map(blob => URL.createObjectURL(blob));
    setInvoiceImageUrls(urls);
    // Cleanup
    return () => {
      urls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [invoiceImageBlobs]);

  const handleDocScan = (blob: Blob) => {
    setInvoiceImageBlobs(prev => [...prev, blob]);
    // Keep scanner open or close? Let's stay open to allow consecutive scans?
    // No, usually better to confirm one by one. Or ask user.
    // Behavior: Scanner closes after confirm. User clicks "Add Page" to scan more.
  };

  const removeImage = (index: number) => {
    setInvoiceImageBlobs(prev => prev.filter((_, i) => i !== index));
  };

  // Sync paid amount/status defaults based on method
  useEffect(() => {
    if (paymentMethod === 'cash') {
      setPaidAmount(totalCartValue);
      setPaymentStatus('paid');
      setInstallments([]);
    } else if (paymentMethod === 'deferred' || paymentMethod === 'installments') {
      setPaymentStatus('pending');
    }
  }, [paymentMethod, totalCartValue]);


  // --- Scanning Logic ---
  const [isScannerLoading, setIsScannerLoading] = useState(false);
  const [currentScannedData, setCurrentScannedData] = useState<ParsedGS1Data | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmDialogProduct, setConfirmDialogProduct] = useState<{ name: string, variant: string }>({ name: '', variant: '' });
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  // --- Batch Scan State ---
  const [scanMode, setScanMode] = useState<'single' | 'batch'>('single');
  const [batchScans, setBatchScans] = useState<BatchScanEntry[]>([]);
  const [isBatchReviewOpen, setIsBatchReviewOpen] = useState(false);

  const handleScan = async (data: ParsedGS1Data) => {
    setIsScannerLoading(true);
    setCurrentScannedData(data);

    // Batch mode: Add to queue
    if (scanMode === 'batch') {
      const entry: BatchScanEntry = {
        id: `scan_${Date.now()}_${Math.random()}`,
        timestamp: Date.now(),
        rawBarcode: data.rawValue,
        fingerprint: generateFingerprint(data),
        parsedData: data
      };
      setBatchScans(prev => [...prev, entry]);
      toast({
        title: t('scan_successful') || "Added to Batch",
        description: `${batchScans.length + 1} items scanned`,
        duration: 800,
        className: "bg-blue-500 text-white border-none"
      });
      setIsScannerLoading(false);
      return;
    }

    // Single mode: Original flow
    toast({
      title: t('scan_successful') || "Scan Successful",
      description: data.rawValue,
      duration: 1000,
      className: "bg-green-500 text-white border-none"
    });
    try {
      let matchedDefId = data.product_id;
      let matchedVariant = data.variant_name;
      if (matchedDefId && matchedVariant) {
        const def = productDefsCache.find(d => d.id === matchedDefId);
        setConfirmDialogProduct({ name: def?.name || "Unknown Product", variant: matchedVariant });
        setIsConfirmOpen(true);
      } else {
        setIsWizardOpen(true);
      }
    } catch (e) {
      toast({ title: t('error'), description: "Error processing scan", variant: "destructive" });
    } finally {
      setIsScannerLoading(false);
    }
  };

  const handleConfirmItem = (data: ConfirmedItemData) => {
    if (!currentScannedData || !currentScannedData.product_id) return;
    const def = productDefsCache.find(d => d.id === currentScannedData.product_id);
    const newItem: CartItem = {
      id: `item_${Date.now()}`,
      productDefinitionId: currentScannedData.product_id,
      productName: def?.name || "Unknown",
      variant: currentScannedData.variant_name || "Standard",
      barcode: currentScannedData.rawValue,
      gtin: currentScannedData.gtin,
      batchNumber: data.batchNumber,
      expiryDate: data.expiryDate,
      quantity: data.quantity,
      purchasePrice: data.purchasePrice
    };
    setCartItems(prev => [...prev, newItem]);
    toast({ title: "Item Added", description: `${newItem.productName} (x${newItem.quantity})` });
  };

  const handleWizardComplete = (def: ProductDefinition, variant: string, data: ConfirmedItemData) => {
    const newItem: CartItem = {
      id: `item_${Date.now()}`,
      productDefinitionId: def.id,
      productName: def.name,
      variant: variant,
      barcode: currentScannedData?.rawValue || "",
      gtin: currentScannedData?.gtin,
      batchNumber: data.batchNumber,
      expiryDate: data.expiryDate,
      quantity: data.quantity,
      purchasePrice: data.purchasePrice
    };
    setCartItems(prev => [...prev, newItem]);
    toast({ title: "New Item Configured", description: `${def.name} - ${variant}` });
  };

  const handleBatchReview = (data: {
    productDefId: string;
    variant: string;
    price: number;
    patterns: Array<{
      fingerprint: string;
      gtin: string;
      batch: string;
      expiry: string;
      quantityPerUnit: number;
      scanCount: number;
      totalQuantity: number;
      entries: any[];
    }>;
  }) => {
    const def = productDefsCache.find(d => d.id === data.productDefId);
    if (!def) return;

    // Create cart item for each unique pattern
    const newItems: CartItem[] = data.patterns.map((pattern, idx) => {
      // Parse expiry date
      let expiryDate: Date | undefined;
      if (pattern.expiry) {
        try {
          const year = parseInt('20' + pattern.expiry.substring(0, 2));
          const month = parseInt(pattern.expiry.substring(2, 4));
          const day = parseInt(pattern.expiry.substring(4, 6));
          expiryDate = new Date(year, month - 1, day);
        } catch {
          expiryDate = undefined;
        }
      }

      return {
        id: `batch_${Date.now()}_${idx}`,
        productDefinitionId: data.productDefId,
        productName: def.name,
        variant: data.variant,
        barcode: pattern.entries[0]?.rawBarcode || pattern.gtin,
        gtin: pattern.gtin,
        batchNumber: pattern.batch || '',
        expiryDate,
        quantity: pattern.totalQuantity,
        purchasePrice: data.price
      };
    });

    setCartItems(prev => [...prev, ...newItems]);
    setBatchScans([]); // Clear batch queue
    toast({
      title: "Batch Added",
      description: `${newItems.length} patterns added to cart (${newItems.reduce((sum, i) => sum + i.quantity, 0)} total units)`
    });
  };

  const removeItem = (index: number) => {
    setCartItems(prev => prev.filter((_, i) => i !== index));
  };

  // Payment Handlers
  const addInstallment = () => {
    const amount = parseFloat(newInstAmount);
    if (!amount || amount <= 0 || !newInstDate) {
      toast({ title: t('error'), description: t('invalid_installment'), variant: "destructive" });
      return;
    }
    setInstallments(prev => [...prev, { amount, due_date: newInstDate, notes: newInstNote }]);
    setNewInstAmount('');
    setNewInstDate('');
    setNewInstNote('');
  };

  const removeInstallment = (index: number) => {
    setInstallments(prev => prev.filter((_, i) => i !== index));
  };

  const remainingAmount = useMemo(() => {
    const planned = installments.reduce((sum, i) => sum + i.amount, 0);
    return totalCartValue - planned - (paymentMethod === 'cash' ? 0 : paidAmount); // Deduct paidAmount if partially paid
  }, [totalCartValue, installments, paymentMethod, paidAmount]);

  // Save Logic
  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!supplierId || !storeId || !stockType) {
      toast({ title: t('error'), description: t('please_fill_header_fields'), variant: 'destructive' });
      return;
    }
    if (cartItems.length === 0) {
      toast({ title: t('error'), description: "Cart is empty", variant: 'destructive' });
      return;
    }

    try {
      // Upload Images
      let uploadedImageUrls: string[] = [];
      if (invoiceImageBlobs.length > 0) {
        const supabase = getSupabaseClient();
        if (supabase) {
          // Upload all in parallel
          const uploadPromises = invoiceImageBlobs.map(async (blob) => {
            const fileName = `invoice_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
            const { data: uploadData, error } = await supabase.storage
              .from('invoices')
              .upload(fileName, blob);

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage.from('invoices').getPublicUrl(fileName);
            return publicUrl;
          });

          try {
            uploadedImageUrls = await Promise.all(uploadPromises);
          } catch (err) {
            console.error("Upload failed", err);
            toast({ title: "Warning", description: "Failed to upload some images.", variant: "destructive" });
            // Continue...
          }
        }
      }

      const voucherData = {
        supplier_id: supplierId,
        date: format(new Date(), 'yyyy-MM-dd'),
        stock_type: stockType,
        voucher_number: voucherNumber,
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        total_amount: totalCartValue,
        paid_amount: paidAmount,
        invoice_image_urls: uploadedImageUrls.length > 0 ? uploadedImageUrls : undefined,
        installments: installments as any
      };

      const newInventoryItems = cartItems.map(item => ({
        product_definition_id: item.productDefinitionId,
        variant: item.variant,
        barcode: item.barcode || null,
        quantity: item.quantity,
        initial_quantity: item.quantity,
        store_id: storeId,
        manufacturer_id: manufacturerId || null,
        supplier_id: supplierId,
        batch_number: item.batchNumber,
        expiry_date: item.expiryDate ? format(item.expiryDate, 'yyyy-MM-dd') : undefined,
        purchase_price: item.purchasePrice,
      }));

      await createSupplyVoucherWithItems(voucherData, newInventoryItems as any);

      // GTIN mapping saving...
      const gtinMappings = cartItems
        .filter(item => item.gtin && item.productDefinitionId && item.variant)
        .map(item => ({
          gtin: item.gtin!,
          product_definition_id: item.productDefinitionId,
          variant_name: item.variant,
          last_supplier_id: supplierId,
          average_price: item.purchasePrice || undefined,
        }));
      if (gtinMappings.length > 0) await batchSaveGTINMappings(gtinMappings);

      toast({ title: t('success'), description: t('invoice_processed_successfully') });
      navigate('/supplies');
    } catch (error) {
      console.error(error);
      toast({ title: t('error'), description: t('error_saving_invoice'), variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background pb-20" dir={direction}>
      <Header toggleSidebar={toggleSidebar} />
      <Sidebar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} closeSidebar={closeSidebar} />
      <main className={`pt-20 ${isMobile ? 'px-4' : direction === 'rtl' ? 'pr-72 pl-8' : 'pl-72 pr-8'} transition-all`}>
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">{t('add_new_inventory_invoice')}</h1>
          </div>

          <form onSubmit={handleSaveInvoice}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Invoice Header & Payment */}
              <div className="lg:col-span-2 space-y-6">
                <Card className="border-l-4 border-l-primary shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Edit className="h-4 w-4 text-muted-foreground" />
                      {t('invoice_details')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{t('stock_type')}</Label>
                      <Select value={stockType} onValueChange={(value) => setStockType(value as StockType)}>
                        <SelectTrigger className="h-9"><SelectValue placeholder={t('select_stock_type')} /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="purchased">{t('purchased')}</SelectItem>
                          <SelectItem value="on_shelf">{t('on_shelf')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{t('voucher_number')}</Label>
                      <Input value={voucherNumber} onChange={(e) => setVoucherNumber(e.target.value)} className="h-9" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{t('supplier')}</Label>
                      <Select value={supplierId} onValueChange={setSupplierId}>
                        <SelectTrigger className="h-9"><SelectValue placeholder={t('select_supplier')} /></SelectTrigger>
                        <SelectContent>{suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{t('store')}</Label>
                      <Select value={storeId} onValueChange={setStoreId}>
                        <SelectTrigger className="h-9"><SelectValue placeholder={t('select_store')} /></SelectTrigger>
                        <SelectContent>{stores.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                {/* Payment Section */}
                <Card className="border-l-4 border-l-green-500 shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg">{t('payment_details') || 'Payment Details'}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">{t('payment_method') || 'Payment Method'}</Label>
                        <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">{t('cash') || 'Cash'}</SelectItem>
                            <SelectItem value="deferred">{t('deferred') || 'Deferred'}</SelectItem>
                            <SelectItem value="installments">{t('installments') || 'Installments'}</SelectItem>
                            <SelectItem value="check">{t('check') || 'Check'}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {(paymentMethod === 'deferred' || paymentMethod === 'installments') && (
                        <div>
                          <Label className="text-xs text-muted-foreground">{t('paid_amount_now') || 'Paid Amount Now'}</Label>
                          <Input
                            type="number"
                            value={paidAmount}
                            onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                            min="0"
                          />
                        </div>
                      )}
                    </div>

                    {/* Installments Table */}
                    {(paymentMethod === 'installments' || paymentMethod === 'deferred') && (
                      <div className="bg-muted/30 p-4 rounded-lg border">
                        <div className="mb-3 flex justify-between items-center">
                          <span className="font-semibold text-sm">{t('installments_schedule') || 'Installments Schedule'}</span>
                          <Badge variant={Math.abs(remainingAmount) < 1 ? "default" : "destructive"}>
                            {t('remaining')}: {remainingAmount.toFixed(2)}
                          </Badge>
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{t('amount')}</TableHead>
                              <TableHead>{t('due_date')}</TableHead>
                              <TableHead>{t('notes')}</TableHead>
                              <TableHead></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {installments.map((inst, idx) => (
                              <TableRow key={idx}>
                                <TableCell>{inst.amount}</TableCell>
                                <TableCell>{inst.due_date}</TableCell>
                                <TableCell>{inst.notes}</TableCell>
                                <TableCell>
                                  <Button variant="ghost" size="sm" onClick={() => removeInstallment(idx)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                                </TableCell>
                              </TableRow>
                            ))}
                            <TableRow>
                              <TableCell><Input type="number" placeholder="0.00" value={newInstAmount} onChange={e => setNewInstAmount(e.target.value)} className="h-8 w-24" /></TableCell>
                              <TableCell><Input type="date" value={newInstDate} onChange={e => setNewInstDate(e.target.value)} className="h-8" /></TableCell>
                              <TableCell><Input placeholder="Check no..." value={newInstNote} onChange={e => setNewInstNote(e.target.value)} className="h-8" /></TableCell>
                              <TableCell>
                                <Button variant="secondary" size="sm" onClick={addInstallment} disabled={remainingAmount <= 0}><Plus className="h-4 w-4" /></Button>
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Cart Items */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex justify-between">
                      <span>{t('scanned_items')} ({cartItems.length})</span>
                      <Badge variant="secondary">{t('total')}: {totalCartValue.toFixed(2)}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {cartItems.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[40%] text-right">{t('product')}</TableHead>
                            <TableHead className="text-center">{t('quantity')}</TableHead>
                            <TableHead className="text-right">{t('price')}</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {cartItems.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                <div className="font-medium">{item.productName}</div>
                                <div className="text-xs text-muted-foreground">{item.variant}</div>
                              </TableCell>
                              <TableCell className="text-center font-bold">{item.quantity}</TableCell>
                              <TableCell className="text-right">{item.purchasePrice > 0 ? item.purchasePrice.toFixed(2) : '-'}</TableCell>
                              <TableCell>
                                <Button variant="ghost" size="sm" onClick={() => removeItem(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="p-8 text-center text-muted-foreground">{t('no_items_added')}</div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right Column: Scanner & Actions */}
              <div className="space-y-6">
                {/* Invoice Image Scanner */}
                <Card className="border-l-4 border-l-blue-500 shadow-sm overflow-hidden">
                  <CardHeader className="bg-blue-50/50 pb-2">
                    <CardTitle className="text-base text-blue-700">{t('invoice_image') || 'Invoice Images'}</CardTitle>
                    <CardDescription className="text-xs">Scan one or more pages</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 flex flex-col items-center justify-center min-h-[200px] border-b">
                    {invoiceImageUrls.length > 0 ? (
                      <div className="w-full space-y-4">
                        <div className="grid grid-cols-2 gap-2">
                          {invoiceImageUrls.map((url, idx) => (
                            <div key={idx} className="relative group aspect-[3/4]">
                              <img src={url} alt={`Page ${idx + 1}`} className="w-full h-full object-cover rounded-md border" />
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="absolute top-1 right-1 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => removeImage(idx)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                              <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1 rounded">P{idx + 1}</span>
                            </div>
                          ))}
                        </div>
                        <Button type="button" onClick={() => setIsDocScannerOpen(true)} className="w-full" variant="secondary">
                          <Plus className="h-4 w-4 mr-2" />
                          {t('add_another_page') || 'Add Page'}
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center space-y-4">
                        <div className="bg-blue-100 p-4 rounded-full inline-block">
                          <Scan className="h-8 w-8 text-blue-600" />
                        </div>
                        <p className="text-sm text-muted-foreground">Scan invoice pages (Multi-page supported)</p>
                        <Button type="button" onClick={() => setIsDocScannerOpen(true)} className="w-full">
                          {t('scan_invoice') || 'Scan First Page'}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Barcode Scanner */}
                <div className="sticky top-24">
                  {/* Scan Mode Toggle */}
                  <Card className="mb-4 border-2">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Scan Mode</CardTitle>
                    </CardHeader>
                    <CardContent className="flex gap-2">
                      <Button
                        variant={scanMode === 'single' ? 'default' : 'outline'}
                        onClick={() => setScanMode('single')}
                        className="flex-1"
                        size="sm"
                      >
                        Single
                      </Button>
                      <Button
                        variant={scanMode === 'batch' ? 'default' : 'outline'}
                        onClick={() => setScanMode('batch')}
                        className="flex-1"
                        size="sm"
                      >
                        Batch
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Batch Mode Info */}
                  {scanMode === 'batch' && (
                    <Card className="mb-4 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium">Scanned Items</span>
                          <Badge variant="default" className="text-lg px-3">
                            {batchScans.length}
                          </Badge>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setBatchScans([])}
                            disabled={batchScans.length === 0}
                            className="flex-1"
                          >
                            Clear
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => setIsBatchReviewOpen(true)}
                            disabled={batchScans.length === 0}
                            className="flex-1"
                          >
                            Review
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <Label className="block mb-2 text-lg font-semibold">{t('quick_scan') || 'Quick Scan Item'}</Label>
                  <QuickActionScanner onScan={handleScan} isLoading={isScannerLoading} />

                  <div className="mt-8 flex flex-col gap-3">
                    <Button type="submit" className="h-12 text-lg shadow-lg" disabled={cartItems.length === 0}>
                      <Save className="h-5 w-5 mr-2" /> {t('save_invoice')}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => navigate('/supplies')} className="h-10">
                      {t('cancel')}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </main>

      {/* Dialogs */}
      <ItemConfirmationDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmItem}
        scannedData={currentScannedData}
        productName={confirmDialogProduct.name}
        variantName={confirmDialogProduct.variant}
      />

      <NewItemWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onComplete={handleWizardComplete}
        scannedData={currentScannedData}
        defaultBarcode={currentScannedData?.rawValue}
      />

      <DocumentScanner
        isOpen={isDocScannerOpen}
        onClose={() => setIsDocScannerOpen(false)}
        onScan={handleDocScan}
      />

      <BatchReviewDialog
        isOpen={isBatchReviewOpen}
        onClose={() => setIsBatchReviewOpen(false)}
        batchScans={batchScans}
        productDefinitions={productDefsCache}
        onAddToCart={handleBatchReview}
      />
    </div>
  );
};

export default AddInventoryPage;
