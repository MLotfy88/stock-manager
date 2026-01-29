import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScanBarcode, Camera, X } from 'lucide-react';

import { useBarcodeScanner, ParsedGS1Data, extractGS1DataForSupply } from '@/hooks/useBarcodeScanner';
import { playSuccessSound } from '@/utils/audio';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface QuickActionScannerProps {
    onScan: (data: ParsedGS1Data) => void;
    isLoading?: boolean;
    continuous?: boolean; // NEW
}

const QuickActionScanner: React.FC<QuickActionScannerProps> = ({ onScan, isLoading, continuous = false }) => {
    const { t, direction } = useLanguage();
    const { toast } = useToast();
    const inputRef = useRef<HTMLInputElement>(null);
    const [manualInput, setManualInput] = useState('');

    // Ref to hold stopScanner to avoid circular dependency
    const stopScannerRef = useRef<() => void>(() => { });

    const handleScanSuccess = useCallback((data: ParsedGS1Data) => {
        // Haptic feedback
        if (navigator.vibrate) navigator.vibrate(200);

        // Audio feedback
        playSuccessSound();

        // Visual feedback
        toast({
            title: t('barcode_scanned'),
            description: `${data.gtin || data.rawValue} (${t('success')})`,
            duration: 1000, // Shorter duration
        });

        onScan(data);
        setManualInput('');

        // Stop only if NOT continuous
        if (!continuous) {
            stopScannerRef.current();
        }

        // Re-focus input
        setTimeout(() => inputRef.current?.focus(), 100);
    }, [onScan, continuous, t, toast]);

    const {
        videoRef,
        isScannerActive,
        error,
        startScanner,
        stopScanner
    } = useBarcodeScanner({
        onScanSuccess: handleScanSuccess,
        onScanFailure: (err) => console.error(err)
    });

    // Update ref when stopScanner changes
    useEffect(() => {
        stopScannerRef.current = stopScanner;
    }, [stopScanner]);

    // Auto-focus removed to prevent mobile scrolling
    // useEffect(() => {
    //     inputRef.current?.focus();
    // }, []);

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualInput.trim()) return;

        // Try to parse as GS1 first, otherwise treat as simple barcode
        const parsed = extractGS1DataForSupply(manualInput) || {
            rawValue: manualInput,
            formattedValue: manualInput
        };

        // Auto-detect GTIN from length if not parsed
        if (!parsed.gtin && manualInput.length === 14) {
            parsed.gtin = manualInput;
        }

        onScan(parsed);
        setManualInput('');
    };

    return (
        <div className="w-full space-y-4">
            {/* Scanner Viewport */}
            {isScannerActive && (
                <Card className="relative overflow-hidden aspect-video bg-black rounded-xl mb-4 shadow-2xl border-primary/20 border-2">
                    <video
                        ref={videoRef}
                        className="w-full h-full object-cover"
                        autoPlay
                        playsInline
                        muted
                    />
                    <div className="absolute top-4 left-4 bg-black/60 text-white px-3 py-1 rounded-full text-xs font-mono animate-pulse flex items-center gap-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
                        {t('scanning') || 'Scanning...'}
                    </div>
                    <div className="absolute inset-0 border-2 border-white/30 rounded-lg m-8 pointer-events-none">
                        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary -mt-1 -ml-1"></div>
                        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary -mt-1 -mr-1"></div>
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary -mb-1 -ml-1"></div>
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary -mb-1 -mr-1"></div>
                    </div>
                    <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-4 right-4 rounded-full shadow-lg"
                        onClick={stopScanner}
                    >
                        <X className="h-6 w-6" />
                    </Button>
                    {error && (
                        <div className="absolute bottom-4 left-4 right-4 bg-red-500/80 text-white p-2 rounded text-center text-sm">
                            {error}
                        </div>
                    )}
                </Card>
            )}

            {/* Input Area */}
            <div className="relative flex gap-2 items-center">
                <div className="relative flex-1">
                    <ScanBarcode className={`absolute top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground ${direction === 'rtl' ? 'right-3' : 'left-3'}`} />
                    <Input
                        ref={inputRef}
                        value={manualInput}
                        onChange={(e) => setManualInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                e.stopPropagation(); // Stop it from triggering outer form submit
                                handleManualSubmit(e);
                            }
                        }}
                        placeholder={t('scan_barcode_placeholder') || "Scan or enter barcode..."}
                        className={`h-14 text-lg shadow-sm border-primary/20 focus-visible:ring-primary ${direction === 'rtl' ? 'pr-10 pl-4' : 'pl-10 pr-4'}`}
                        disabled={isLoading}
                        autoComplete="off"
                    />
                </div>

                <Button
                    type="button"
                    size="icon"
                    variant={isScannerActive ? "default" : "outline"}
                    className="h-14 w-14 shrink-0 rounded-xl border-2"
                    onClick={isScannerActive ? stopScanner : startScanner}
                >
                    <Camera className="h-6 w-6" />
                </Button>
            </div>
        </div>
    );
};

export default QuickActionScanner;
