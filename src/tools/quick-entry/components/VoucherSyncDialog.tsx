import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { db, LocalInventoryEntry } from '../data/localDb';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { createSupplyVoucherWithItems } from '@/data/operations/voucherOperations';
import { toast } from 'sonner';
import { Loader2, UploadCloud, Store, CreditCard, FileText } from 'lucide-react';
import { format } from 'date-fns';

interface VoucherSyncDialogProps {
    isOpen: boolean;
    onClose: () => void;
    entries: LocalInventoryEntry[];
    onSuccess: () => void;
}

export const VoucherSyncDialog: React.FC<VoucherSyncDialogProps> = ({ isOpen, onClose, entries, onSuccess }) => {
    const supabase = getSupabaseClient();
    const [isLoading, setIsLoading] = useState(false);
    
    // Form State
    const [stores, setStores] = useState<any[]>([]);
    const [selectedStore, setSelectedStore] = useState('');
    const [stockType, setStockType] = useState('stock');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [voucherNumber, setVoucherNumber] = useState('');
    const [notes, setNotes] = useState('');
    const [invoiceFile, setInvoiceFile] = useState<File | null>(null);

    // Initial load
    useEffect(() => {
        if (isOpen) {
            fetchStores();
        }
    }, [isOpen]);

    const fetchStores = async () => {
        const { data } = await supabase.from('stores').select('id, name').order('name');
        if (data) setStores(data);
    };

    const handleUploadImage = async (file: File): Promise<string> => {
        const fileName = `invoice_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
        const { error } = await supabase.storage.from('invoices').upload(fileName, file);
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from('invoices').getPublicUrl(fileName);
        return publicUrl;
    };

    const handleSubmit = async () => {
        if (!selectedStore) {
            toast.error('يرجى اختيار المخزن');
            return;
        }

        setIsLoading(true);
        try {
            // 1. Group items primarily to find main supplier (assume majority or first item's supplier)
            const mainSupplierId = entries[0]?.supplierId || null;
            if (!mainSupplierId) throw new Error("لم يتم تحديد مورد للأصناف");

            // 2. Upload invoice if exists
            let uploadedUrls: string[] = [];
            if (invoiceFile) {
                const url = await handleUploadImage(invoiceFile);
                uploadedUrls.push(url);
            }

            // 3. Calculate totals
            const totalAmount = entries.reduce((sum, item) => sum + (item.quantity * (item.purchasePrice || 0)), 0);

            // 4. Build Document
            const voucherData: any = {
                supplier_id: mainSupplierId,
                date: format(new Date(), 'yyyy-MM-dd'),
                stock_type: stockType as any,
                voucher_number: voucherNumber || null,
                payment_method: paymentMethod,
                payment_status: paymentMethod === 'cash' ? 'paid' : 'pending',
                total_amount: totalAmount,
                paid_amount: paymentMethod === 'cash' ? totalAmount : 0,
                notes: notes || 'تم الترحيل من أداة الإدخال السريع',
                invoice_image_urls: uploadedUrls.length > 0 ? uploadedUrls : undefined
            };

            // 5. Build Items Payload
            const itemsPayload = entries.map(item => {
                // Parse dates properly
                let normalizedExpiry = item.expiryDate;
                if (normalizedExpiry && normalizedExpiry.length === 5) {
                    // standard MM/YY to YYYY-MM-DD for DB
                    const [m, y] = normalizedExpiry.split('/');
                    normalizedExpiry = `20${y}-${m}-01`;
                }

                return {
                    product_definition_id: item.productDefinitionId,
                    variant: item.variant,
                    barcode: item.barcode || null,
                    gtin: item.gtin || null,
                    quantity: item.quantity,
                    initial_quantity: item.quantity,
                    purchase_price: item.purchasePrice || 0,
                    batch_number: item.lotNumber,
                    expiry_date: normalizedExpiry,
                    store_id: selectedStore,
                    manufacturer_id: item.manufacturerId || null,
                    supplier_id: item.supplierId || null
                };
            });

            // 6. Execute save to database
            await createSupplyVoucherWithItems(voucherData, itemsPayload as any);

            toast.success('تم إنشاء فاتورة المشتريات بنجاح وترحيل البيانات!');
            onSuccess();
            onClose();
            
        } catch (error: any) {
            console.error('Sync error:', error);
            toast.error(error.message || 'حدث خطأ غير متوقع أثناء الترحيل');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-w-md bg-background border-none shadow-2xl rounded-2xl p-0 overflow-hidden">
                <div className="bg-blue-600 p-6 text-white">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            <UploadCloud className="w-5 h-5" /> إنشاء فاتورة مشتريات
                        </DialogTitle>
                        <DialogDescription className="text-blue-100 mt-2">
                            سيتم ترحيل {entries.length} صنف من المسحات المحلية إلى النظام كفاتورة رسمية.
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="p-6 space-y-5">
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2"><Store className="w-4 h-4 text-blue-600" /> المخزن الوجهة <span className="text-red-500">*</span></Label>
                        <Select value={selectedStore} onValueChange={setSelectedStore}>
                            <SelectTrigger className="h-12">
                                <SelectValue placeholder="اختر المخزن..." />
                            </SelectTrigger>
                            <SelectContent>
                                {stores.map(store => (
                                    <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>طريقة الدفع</Label>
                            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                <SelectTrigger className="h-10">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="cash">نقدي (Cash)</SelectItem>
                                    <SelectItem value="credit">آجل (Credit)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>نوع المخزون</Label>
                            <Select value={stockType} onValueChange={setStockType}>
                                <SelectTrigger className="h-10">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="stock">الرصيد الرئيسي</SelectItem>
                                    <SelectItem value="consignment">أمانة (Consignment)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>رقم الفاتورة الدفتري (اختياري)</Label>
                        <Input value={voucherNumber} onChange={e => setVoucherNumber(e.target.value)} placeholder="مثال: INV-2023-001" className="h-10" />
                    </div>

                    <div className="space-y-2">
                        <Label>صورة الفاتورة (اختياري)</Label>
                        <Input type="file" accept="image/*,application/pdf" className="cursor-pointer" onChange={(e) => setInvoiceFile(e.target.files?.[0] || null)} />
                    </div>
                </div>

                <DialogFooter className="p-6 pt-0 sm:justify-start">
                    <Button onClick={handleSubmit} disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-lg">
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                        اعتماد وترحيل البيانات
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
