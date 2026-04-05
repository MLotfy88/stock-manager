import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { db, LocalInventoryEntry } from '../data/localDb';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { Loader2, Store, FileText, Download, Combine, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';

interface InventoryAuditDialogProps {
    isOpen: boolean;
    onClose: () => void;
    entries: LocalInventoryEntry[];
}

export const InventoryAuditDialog: React.FC<InventoryAuditDialogProps> = ({ isOpen, onClose, entries }) => {
    const supabase = getSupabaseClient();
    const [isLoading, setIsLoading] = useState(false);
    
    // Form State
    const [stores, setStores] = useState<any[]>([]);
    const [selectedStore, setSelectedStore] = useState('');
    const [auditReport, setAuditReport] = useState<any[]>([]);
    const [isReportReady, setIsReportReady] = useState(false);

    // Initial load
    useEffect(() => {
        if (isOpen) {
            fetchStores();
            setIsReportReady(false);
            setAuditReport([]);
        }
    }, [isOpen]);

    const fetchStores = async () => {
        const { data } = await supabase.from('stores').select('id, name').order('name');
        if (data) setStores(data);
    };

    const generateReport = async () => {
        if (!selectedStore) {
            toast.error('يرجى اختيار المخزن المراد جرده');
            return;
        }

        setIsLoading(true);
        try {
            // Aggregate scanned data (in case there are duplicate rows for same product/variant/lot in local DB)
            const scannedMap = new Map<string, any>();
            entries.forEach(entry => {
                const key = `${entry.productDefinitionId}_${entry.variant}_${entry.lotNumber}`;
                if (scannedMap.has(key)) {
                    scannedMap.get(key)!.quantity += entry.quantity;
                } else {
                    scannedMap.set(key, { ...entry, quantity: entry.quantity });
                }
            });

            // Get product IDs to filter database footprint
            const productIds = Array.from(new Set(entries.map(e => e.productDefinitionId)));
            
            // Query current DB inventory for these products in the chosen store
            const { data: dbItems, error } = await supabase
                .from('inventory_items')
                .select('product_definition_id, product_name, variant, batch_number, quantity, initial_quantity')
                .eq('store_id', selectedStore)
                .in('product_definition_id', productIds);

            if (error) throw error;

            // Aggregate DB data
            const dbMap = new Map<string, number>();
            dbItems?.forEach(item => {
                const key = `${item.product_definition_id}_${item.variant}_${item.batch_number}`; // Match local lotNumber
                dbMap.set(key, (dbMap.get(key) || 0) + (item.quantity || 0));
            });

            // Build comparison
            const report: any[] = [];
            const allKeys = new Set([...Array.from(scannedMap.keys()), ...Array.from(dbMap.keys())]);

            allKeys.forEach(key => {
                const scannedData = scannedMap.get(key);
                // Fallback to searching dbItems for name/variant if not scanned (meaning it was in DB but not scanned!)
                const dbContextMatch = dbItems?.find(i => `${i.product_definition_id}_${i.variant}_${i.batch_number}` === key);
                
                const productName = scannedData?.productName || dbContextMatch?.product_name || 'غير معروف';
                const variant = scannedData?.variant || dbContextMatch?.variant;
                const lot = scannedData?.lotNumber || dbContextMatch?.batch_number;

                const actualQty = scannedData?.quantity || 0;
                const expectedQty = dbMap.get(key) || 0;
                const difference = actualQty - expectedQty;

                report.push({
                    key,
                    productName,
                    variant,
                    lot,
                    expectedQty,
                    actualQty,
                    difference
                });
            });

            // Sort differences (bring problems to top: difference != 0)
            report.sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference));

            setAuditReport(report);
            setIsReportReady(true);
            toast.success('تم إنشاء التقرير بنجاح');
            
        } catch (error: any) {
            console.error('Audit error:', error);
            toast.error('حدث خطأ أثناء الاتصال بقاعدة البيانات');
        } finally {
            setIsLoading(false);
        }
    };

    const handleExport = () => {
        const dataToExport = auditReport.map(r => ({
            'اسم المنتج': r.productName,
            'المتغير': r.variant,
            'رقم اللوط': r.lot,
            'الرصيد الدفتري (المتوقع)': r.expectedQty,
            'الرصيد الفعلي (الممسوح)': r.actualQty,
            'الفرق (العجز/الزيادة)': r.difference
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Inventory_Audit_Report");
        XLSX.writeFile(wb, `Audit_Report_${selectedStore}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-w-4xl max-h-[90vh] bg-background border-none shadow-2xl rounded-2xl p-0 flex flex-col">
                <div className="bg-emerald-600 p-6 text-white shrink-0">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            <Combine className="w-5 h-5" /> جرد مخزون (تقرير مقارنة)
                        </DialogTitle>
                        <DialogDescription className="text-emerald-100 mt-2">
                            محاكاة تقرير جرد يقارن القراءات الحالية بالرصيد المسجل فعلياً في قاعدة البيانات.
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="p-6 flex-1 overflow-auto space-y-5">
                    {!isReportReady ? (
                        <div className="space-y-4 max-w-sm mx-auto py-10">
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2"><Store className="w-4 h-4 text-emerald-600" /> المخزن المراد جرده <span className="text-red-500">*</span></Label>
                                <Select value={selectedStore} onValueChange={setSelectedStore}>
                                    <SelectTrigger className="h-12 border-emerald-200">
                                        <SelectValue placeholder="اختر المخزن..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {stores.map(store => (
                                            <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            <Button onClick={generateReport} disabled={isLoading} className="w-full bg-emerald-600 hover:bg-emerald-700 h-14 text-lg">
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                                بدء استخراج المقارنة
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center bg-muted/50 p-3 rounded-lg border">
                                <span className="font-bold">ملخص الجرد للمستودع المحدد</span>
                                <Button onClick={handleExport} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                                    <Download className="w-4 h-4 mr-2" /> تحميل إكسيل
                                </Button>
                            </div>

                            <div className="border rounded-xl overflow-hidden shadow-sm">
                                <Table>
                                    <TableHeader className="bg-muted">
                                        <TableRow>
                                            <TableHead>المنتج</TableHead>
                                            <TableHead>المتغير / اللوط</TableHead>
                                            <TableHead className="text-center">متوقع (نظام)</TableHead>
                                            <TableHead className="text-center bg-blue-50/50">فعلي (ممسوح)</TableHead>
                                            <TableHead className="text-center">الفرق</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {auditReport.map((row, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell className="font-bold">{row.productName}</TableCell>
                                                <TableCell>
                                                    <div className="text-sm font-semibold text-primary">{row.variant || '-'}</div>
                                                    <div className="text-xs text-muted-foreground font-mono">{row.lot || '-'}</div>
                                                </TableCell>
                                                <TableCell className="text-center font-mono opacity-50">{row.expectedQty}</TableCell>
                                                <TableCell className="text-center font-mono font-bold bg-blue-50/30 text-blue-700">{row.actualQty}</TableCell>
                                                <TableCell className="text-center">
                                                    {row.difference === 0 ? (
                                                        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold font-mono">متطابق</span>
                                                    ) : row.difference > 0 ? (
                                                        <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold font-mono">+{row.difference} زيادة</span>
                                                    ) : (
                                                        <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold font-mono flex items-center justify-center gap-1">
                                                            <AlertTriangle className="w-3 h-3" /> {row.difference} عجز
                                                        </span>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                            
                            <p className="text-xs text-muted-foreground text-center mt-4 pb-4">
                                ملاحظة: هذا الإجراء يقوم بطرح بيانات توضيحية فقط ولا يقوم بعمل تسوية للمخزون آلياً.
                            </p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};
