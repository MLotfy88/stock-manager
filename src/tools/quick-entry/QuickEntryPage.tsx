import React, { useState, useEffect } from 'react';
import { useBarcodeScanner, ParsedGS1Data } from './hooks/useBarcodeScanner';
import { QuickEntryForm } from './components/QuickEntryForm';
import { QuickEntryCart } from './components/QuickEntryCart';
import { VoucherSyncDialog } from './components/VoucherSyncDialog';
import { InventoryAuditDialog } from './components/InventoryAuditDialog';
import { db, LocalInventoryEntry } from './data/localDb';
import { useLiveQuery } from 'dexie-react-hooks';
import { Button } from '@/components/ui/button';
import { Camera, X, Check, PackageOpen, ScanLine, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { playSuccessSound } from '@/utils/audio';

const QuickEntryPage: React.FC = () => {
    const navigate = useNavigate();
    const [scannedData, setScannedData] = useState<ParsedGS1Data | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingEntry, setEditingEntry] = useState<LocalInventoryEntry | null>(null);

    const { videoRef, isScannerActive, startScanner, stopScanner, error, isSupported } = useBarcodeScanner({
        onScanSuccess: (data) => {
            playSuccessSound(0.5); // Play louder beep
            setScannedData(data);
            setIsFormOpen(true);
        },
        isPaused: isFormOpen // Pause when form is open as requested
    });

    useEffect(() => {
        // Start scanner on mount
        startScanner();
        return () => stopScanner();
    }, []);

    const [isVoucherSyncOpen, setIsVoucherSyncOpen] = useState(false);
    const [isAuditSyncOpen, setIsAuditSyncOpen] = useState(false);

    // Fetch entries for the sync dialogs
    const entries = useLiveQuery(() => db.inventory_entries.orderBy('timestamp').toArray()) || [];

    const handleSave = async (entry: LocalInventoryEntry) => {
        try {
            await db.inventory_entries.add(entry);
            toast.success(`تم حفظ القراءة بنجاح برقم لوط: ${entry.lotNumber}`);
            setIsFormOpen(false);
            setScannedData(null);
        } catch (err) {
            console.error(err);
            toast.error('فشل حفظ البيانات محلياً');
        }
    };

    const handleCloseForm = () => {
        setIsFormOpen(false);
        setScannedData(null);
        setEditingEntry(null);
    };

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* Header / Nav */}
            <div className="bg-primary text-primary-foreground p-4 flex items-center justify-between shadow-lg sticky top-0 z-20">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-white hover:bg-white/20">
                    <ArrowRight className="h-6 w-6" />
                </Button>
                <h1 className="text-lg font-bold">أداة الإدخال السريع (جرد المخزون)</h1>
                <div className="w-10" /> {/* Spacer */}
            </div>

            <div className="container max-w-4xl px-4 py-6 space-y-8">
                {/* Scanner Section */}
                <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-black aspect-[4/3] md:aspect-video border-2 md:border-4 border-muted/20">
                    {!isScannerActive && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-black/60 z-10 transition-all px-8 text-center">
                            <Camera className="h-16 w-16 mb-4 opacity-50 text-primary" />
                            <h3 className="text-xl font-bold mb-2">الكاميرا متوقفة</h3>
                            <p className="text-sm opacity-70 mb-6">اضغط على الزر أدناه لتفعيل ماسح الباركود وبدء جرد الأصناف</p>
                            <Button onClick={startScanner} className="bg-primary hover:bg-primary/90 h-14 px-8 text-lg font-bold rounded-xl shadow-xl">
                                تشغيل الكاميرا للمسح
                            </Button>
                            {error && <p className="mt-4 text-red-400 text-sm">{error}</p>}
                        </div>
                    )}
                    
                    <video 
                        ref={videoRef} 
                        playsInline 
                        className="w-full h-full object-cover scale-[1.1]"
                    />

                    {/* Scan Indicator Overlay */}
                    {isScannerActive && (
                        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                            {/* MUCH WIDER Box for GS1 medical barcodes */}
                            <div className="w-[92%] h-40 md:w-[80%] md:h-64 border-2 border-primary/50 rounded-2xl relative overflow-hidden bg-white/5 backdrop-blur-[1px] shadow-[0_0_50px_rgba(var(--primary),0.3)]">
                                <div className="absolute top-0 left-0 w-full h-[3px] bg-primary shadow-[0_0_20px_rgba(var(--primary),1)] animate-scan" />
                                
                                {/* Corner Accents - Larger for wider view */}
                                <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-primary rounded-tl-xl" />
                                <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-primary rounded-tr-xl" />
                                <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-primary rounded-bl-xl" />
                                <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-primary rounded-tr-xl" />
                            </div>
                            <div className="absolute bottom-4 text-white font-bold text-[10px] md:text-sm bg-primary/60 backdrop-blur-md px-4 py-1 rounded-full flex items-center gap-2 border border-white/20">
                                <ScanLine className="h-3 w-3 animate-pulse" /> وجه الكاميرا نحو الباركود العريض
                            </div>
                        </div>
                    )}
                </div>

                {/* Info Card */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30 p-4 rounded-xl flex items-start gap-4">
                    <div className="bg-blue-500 rounded-full p-2 text-white mt-1">
                        <PackageOpen className="h-5 w-5" />
                    </div>
                    <div>
                        <h4 className="font-bold text-blue-700 dark:text-blue-400">نصيحة للإدخال السريع</h4>
                        <p className="text-sm text-blue-600/80 dark:text-blue-400/60 leading-relaxed">
                            بعد مسح الصنف، سيتم تذكر المورد والشركة تلقائياً. تأكد من مراجعة الباتش والكمية لكل صندوق تقوم بمسحه.
                        </p>
                    </div>
                </div>

                {/* Entries List Section */}
                <QuickEntryCart 
                    onEdit={(entry) => {
                        setEditingEntry(entry);
                        const pseudoScannedData: ParsedGS1Data = {
                            rawValue: entry.barcode,
                            gtin: entry.gtin,
                            lotNumber: entry.lotNumber,
                            expiryDate: entry.expiryDate,
                            formattedValue: entry.barcode
                        };
                        setScannedData(pseudoScannedData);
                        setIsFormOpen(true);
                    }}
                    onSyncVoucher={() => setIsVoucherSyncOpen(true)}
                    onSyncAudit={() => setIsAuditSyncOpen(true)}
                />
            </div>

            {/* Quick Entry Dialog */}
            {scannedData && (
                <QuickEntryForm 
                    isOpen={isFormOpen} 
                    onClose={handleCloseForm} 
                    scannedData={scannedData}
                    initialValues={editingEntry}
                    onSave={async (entry) => {
                        try {
                            if (editingEntry?.id) {
                                // Update existing
                                await db.inventory_entries.update(editingEntry.id, entry);
                                toast.success('تم تحديث القراءة');
                            } else {
                                // Add new
                                await db.inventory_entries.add(entry);
                                toast.success(`تم حفظ القراءة بنجاح برقم لوط: ${entry.lotNumber}`);
                            }
                            handleCloseForm();
                        } catch (err) {
                            console.error(err);
                            toast.error('فشل حفظ البيانات');
                        }
                    }}
                />
            )}

            {/* Sync Dialogs */}
            <VoucherSyncDialog
                isOpen={isVoucherSyncOpen}
                onClose={() => setIsVoucherSyncOpen(false)}
                entries={entries}
                onSuccess={async () => {
                    await db.inventory_entries.clear();
                }}
            />

            <InventoryAuditDialog
                isOpen={isAuditSyncOpen}
                onClose={() => setIsAuditSyncOpen(false)}
                entries={entries}
            />

            {/* Global Styles for Scan Animation */}
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes scan {
                    0% { top: 0; }
                    100% { top: 100%; }
                }
                .animate-scan {
                    position: absolute;
                    animation: scan 2s linear infinite;
                }
            `}} />
        </div>
    );
};

export default QuickEntryPage;
