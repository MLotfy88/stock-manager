import React, { useState, useEffect } from 'react';
import { db, LocalInventoryEntry } from '../data/localDb';
import { useLiveQuery } from 'dexie-react-hooks';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Trash2, Edit2, Download, Package, Calendar, Tag, Trash } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

interface QuickEntryCartProps {
    onEdit: (entry: LocalInventoryEntry) => void;
}

export const QuickEntryCart: React.FC<QuickEntryCartProps> = ({ onEdit }) => {
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
                'الباركود': e.barcode,
                'اسم المنتج': e.productName,
                'المتغير': e.variant,
                'رقم اللوط': e.lotNumber,
                'تاريخ الصلاحية': e.expiryDate,
                'الكمية': e.quantity,
                'سعر الشراء': e.purchasePrice,
                'الشركة المصنعة': e.manufacturerName,
                'المورد': e.supplierName,
                'الوقت': new Date(e.timestamp).toLocaleString('ar-EG')
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
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold flex items-center gap-2">
                    <Tag className="h-5 w-5 text-primary" />
                    القراءات المحفوظة ({entries.length})
                </h3>
                <div className="flex gap-2">
                    <Button variant="destructive" size="sm" onClick={handleClearAll} className="h-10">
                        <Trash className="mr-2 h-4 w-4" /> مسح الكل
                    </Button>
                    <Button onClick={handleExport} className="h-10 bg-green-600 hover:bg-green-700 text-white">
                        <Download className="mr-2 h-4 w-4" /> تصدير إكسيل
                    </Button>
                </div>
            </div>

            <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
                <div className="max-h-[600px] overflow-auto">
                <Table>
                    <TableHeader className="bg-muted/50 sticky top-0 z-10">
                        <TableRow>
                            <TableHead className="w-12 text-center">#</TableHead>
                            <TableHead>المنتج / المتغير</TableHead>
                            <TableHead>اللوط / الصلاحية</TableHead>
                            <TableHead className="text-center">الكمية</TableHead>
                            <TableHead className="text-center">السعر</TableHead>
                            <TableHead className="w-[100px] text-center">إجراءات</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {entries.map((entry, index) => (
                            <TableRow key={entry.id} className="hover:bg-muted/30">
                                <TableCell className="text-center font-mono opacity-50">{index + 1}</TableCell>
                                <TableCell>
                                    <div className="font-bold">{entry.productName}</div>
                                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Tag className="h-3 w-3" /> {entry.variant || 'بدون متغير'}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground font-mono mt-1 opacity-50">{entry.barcode}</div>
                                </TableCell>
                                <TableCell>
                                    <div className="font-mono text-sm">{entry.lotNumber}</div>
                                    <div className="flex items-center gap-1 text-xs text-destructive font-bold">
                                        <Calendar className="h-3 w-3" /> {entry.expiryDate}
                                    </div>
                                </TableCell>
                                <TableCell className="text-center">
                                    <span className="bg-primary/10 text-primary px-3 py-1 rounded-full font-bold">
                                        {entry.quantity}
                                    </span>
                                </TableCell>
                                <TableCell className="text-center font-mono">
                                    {entry.purchasePrice ? `${entry.purchasePrice} EGP` : '-'}
                                </TableCell>
                                <TableCell>
                                    <div className="flex justify-center gap-1">
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(entry)}>
                                            <Edit2 className="h-3 w-3 text-blue-600" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(entry.id)}>
                                            <Trash2 className="h-3 w-3 text-red-600" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                </div>
            </div>
        </div>
    );
};
