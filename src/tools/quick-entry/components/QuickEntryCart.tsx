import React, { useState, useEffect } from 'react';
import { db, LocalInventoryEntry } from '../data/localDb';
import { useLiveQuery } from 'dexie-react-hooks';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Trash2, Edit2, Download, Package, Calendar, Tag, Trash, Combine, UploadCloud, FileSpreadsheet, Send } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

interface QuickEntryCartProps {
    onEdit: (entry: LocalInventoryEntry) => void;
    onSyncVoucher: () => void;
    onSyncAudit: () => void;
}

export const QuickEntryCart: React.FC<QuickEntryCartProps> = ({ onEdit, onSyncVoucher, onSyncAudit }) => {
    // Watch DB for changes
    const entries = useLiveQuery(() => db.inventory_entries.orderBy('timestamp').toArray());

    const handleDelete = async (id?: number) => {
        if (!id) return;
        if (confirm('هل تريد حذف هذه القراءة؟')) {
            await db.inventory_entries.delete(id);
            toast.success('تم حذف القراءة');
        }
    };

    const handleClearAll = async () => {
        if (confirm('هل تريد مسح جميع القراءات والبدء من جديد؟')) {
            await db.inventory_entries.clear();
            toast.success('تم مسح جميع البيانات المحلية');
        }
    };

    const handleExport = () => {
        if (!entries || entries.length === 0) return;

        try {
            const dataToExport = entries.map(e => ({
                'barcode': e.barcode,
                'gtin': e.gtin || null,
                'product_id': e.productDefinitionId,
                'product_name': e.productName,
                'variant': e.variant,
                'lot_number': e.lotNumber,
                'expiry_date': e.expiryDate,
                'quantity': e.quantity,
                'purchase_price': e.purchasePrice || null,
                'manufacturer_id': e.manufacturerId,
                'supplier_id': e.supplierId,
            }));

            const ws = XLSX.utils.json_to_sheet(dataToExport);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Inventory_Scans");
            
            XLSX.writeFile(wb, `StockScan_${new Date().toISOString().slice(0, 10)}.xlsx`);
            toast.success('تم تصدير ملف الإكسيل بنجاح');
        } catch (err) {
            console.error(err);
            toast.error('حدث خطأ أثناء تصدير الملف');
        }
    };

    if (!entries || entries.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
                <Package className="h-12 w-12 mb-4 opacity-20" />
                <p>لا توجد قراءات محفوظة حالياً</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h3 className="text-xl font-bold flex items-center gap-2">
                    <Tag className="h-5 w-5 text-primary" />
                    القراءات المحفوظة ({entries.length})
                </h3>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button className="h-10 bg-indigo-600 hover:bg-indigo-700 text-white flex-1 sm:flex-none">
                                <Send className="mr-2 h-4 w-4" /> ترحيل البيانات
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 mt-2">
                            <DropdownMenuLabel>خيارات الترحيل المتقدمة</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={onSyncVoucher} className="font-bold cursor-pointer">
                                <UploadCloud className="mr-2 h-4 w-4 text-blue-500" /> تضمين في فاتورة مشتريات
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={onSyncAudit} className="font-bold cursor-pointer">
                                <Combine className="mr-2 h-4 w-4 text-emerald-500" /> تنفيذ كعملية جرد مخزون
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleExport} className="cursor-pointer">
                                <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" /> تصدير ملف إكسيل
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <Button variant="destructive" size="sm" onClick={handleClearAll} className="h-10 flex-1 sm:flex-none">
                        <Trash className="mr-2 h-4 w-4" /> مسح الكل
                    </Button>
                </div>
            </div>

            <div className="max-h-[45vh] lg:max-h-[55vh] overflow-y-auto pr-1 pb-4 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {entries.map((entry, index) => (
                    <div key={entry.id} className="bg-card border rounded-xl p-4 shadow-sm relative space-y-3 transition-all hover:shadow-md">
                        {/* Card Header (Actions & Index) */}
                        <div className="flex justify-between items-start">
                            <div className="flex bg-muted text-muted-foreground w-8 h-8 rounded-full items-center justify-center font-bold text-xs">{index + 1}</div>
                            <div className="flex gap-1 bg-muted/30 p-1 rounded-lg">
                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-blue-100 hover:text-blue-600" onClick={() => onEdit(entry)}>
                                    <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-100 hover:text-red-600" onClick={() => handleDelete(entry.id)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Product Info */}
                        <div>
                            <div className="font-bold text-lg leading-tight">{entry.productName}</div>
                            <div className="text-sm text-primary flex items-center gap-1 font-bold mt-1.5">
                                <Tag className="h-3.5 w-3.5" /> {entry.variant || 'بدون متغير'}
                            </div>
                            <div className="text-[10px] text-muted-foreground font-mono mt-1 opacity-60 break-all">{entry.barcode}</div>
                            {entry.gtin && <div className="text-[10px] text-blue-600/70 dark:text-blue-400/70 font-mono mt-0.5">GTIN: {entry.gtin}</div>}
                        </div>

                        {/* LOT / Expiry */}
                        <div className="grid grid-cols-2 gap-2 bg-muted/20 p-2.5 rounded-lg border border-dashed text-sm">
                            <div>
                                <span className="text-[10px] text-muted-foreground block uppercase">اللوط (LOT)</span>
                                <span className="font-mono font-bold truncate block">{entry.lotNumber || '-'}</span>
                            </div>
                            <div>
                                <span className="text-[10px] text-muted-foreground block uppercase">الصلاحية</span>
                                <span className="font-mono font-bold text-destructive flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />{entry.expiryDate || '-'}
                                </span>
                            </div>
                        </div>

                        {/* Price & Qty */}
                        <div className="flex justify-between items-end pt-2 border-t">
                            <div>
                                <span className="text-[10px] text-muted-foreground block uppercase">السعر</span>
                                <span className="font-mono font-bold text-base">{entry.purchasePrice ? `${entry.purchasePrice} EGP` : '-'}</span>
                            </div>
                            <div className="text-center">
                                <span className="text-[10px] text-muted-foreground block uppercase mb-1">الكمية</span>
                                <span className="bg-primary/20 text-primary px-4 py-1 rounded-full font-black text-lg">
                                    {entry.quantity}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
                
                {entries.length === 0 && (
                    <div className="col-span-full py-12 text-center text-muted-foreground bg-muted/10 rounded-xl border border-dashed">
                        لا توجد أصناف ممسوحة بعد. قم بتشغيل الكاميرا ومسح باركود لإضافته هنا.
                    </div>
                )}
                </div>
            </div>
        </div>
    );
};
