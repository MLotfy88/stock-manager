import React, { useState, useEffect } from 'react';
import { useBarcodeScanner, ParsedGS1Data } from './hooks/useBarcodeScanner';
import { QuickEntryForm } from './components/QuickEntryForm';
import { QuickEntryCart } from './components/QuickEntryCart';
import { db, LocalInventoryEntry } from './data/localDb';
import { Button } from '@/components/ui/button';
import { Camera, X, Check, PackageOpen, ScanLine, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const QuickEntryPage: React.FC = () => {
    const navigate = useNavigate();
    const [scannedData, setScannedData] = useState<ParsedGS1Data | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingEntry, setEditingEntry] = useState<LocalInventoryEntry | null>(null);

    const { videoRef, isScannerActive, startScanner, stopScanner, error, isSupported } = useBarcodeScanner({
        onScanSuccess: (data) => {
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
                <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-black aspect-video md:aspect-[21/9]">
                    {!isScannerActive && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-black/60 z-10 transition-all">
                            <Camera className="h-12 w-12 mb-4 opacity-50" />
                            <Button onClick={startScanner} className="bg-primary hover:bg-primary/90">
                                تشغيل الكاميرا للمسح
                            </Button>
                            {error && <p className="mt-4 text-red-400 text-sm">{error}</p>}
                        </div>
                    )}
                    
                    <video 
                        ref={videoRef} 
                        playsInline 
                        className="w-full h-full object-cover"
                    />

                    {/* Scan Indicator Overlay */}
                    {isScannerActive && (
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                            <div className="w-64 h-32 border-2 border-white/30 rounded-xl relative overflow-hidden bg-white/5 backdrop-blur-[1px]">
                                <div className="absolute top-0 left-0 w-full h-[2px] bg-primary/80 shadow-[0_0_15px_rgba(var(--primary),0.8)] animate-scan" />
                            </div>
                            <div className="absolute bottom-4 text-white/50 text-[10px] bg-black/40 px-3 py-1 rounded-full flex items-center gap-2">
                                <ScanLine className="h-3 w-3" /> جاري البحث عن باركود...
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
                <QuickEntryCart onEdit={(entry) => {
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
                }} />
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
