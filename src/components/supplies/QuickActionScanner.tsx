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

import { ScannerOverlay } from '@/components/common/ScannerOverlay';

export const QuickActionScanner: React.FC<QuickActionScannerProps> = ({ onScan, isLoading, continuous = false }) => {
    const { t, direction } = useLanguage();
    const { toast } = useToast();
    const inputRef = useRef<HTMLInputElement>(null);
    const [manualInput, setManualInput] = useState('');
    const [lastScanned, setLastScanned] = useState('');
    const [scannedCount, setScannedCount] = useState(0);

    // Ref to hold stopScanner to avoid circular dependency
    const stopScannerRef = useRef<() => void>(() => { });

    const handleScanSuccess = useCallback((data: ParsedGS1Data) => {
        // Haptic feedback
        if (navigator.vibrate) navigator.vibrate(200);

        // Audio feedback
        playSuccessSound();

        setLastScanned(data.gtin || data.rawValue);
        setScannedCount(prev => prev + 1);

        onScan(data);
        setManualInput('');

        // Stop only if NOT continuous
        if (!continuous) {
            stopScannerRef.current();
        }

        // Re-focus input
        setTimeout(() => inputRef.current?.focus(), 100);
    }, [onScan, continuous]);

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
        setLastScanned(parsed.rawValue);
    };

    return (
        <div className="w-full space-y-4">
            {/* Full Screen Scanner Overlay */}
            <ScannerOverlay
                videoRef={videoRef}
                isActive={isScannerActive}
                onClose={stopScanner}
                title={continuous ? t('batch_scanning') : t('scan_barcode')}
                lastScanned={lastScanned}
                scannedCount={continuous ? scannedCount : undefined}
            />

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
                    onClick={startScanner}
                >
                    <Camera className="h-6 w-6" />
                </Button>
            </div>

            {error && (
                <div className="text-sm text-red-500 text-center animate-pulse">
                    {error}
                </div>
            )}
        </div>
    );
};

export default QuickActionScanner;
