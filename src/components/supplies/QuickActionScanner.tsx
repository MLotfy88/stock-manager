import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScanBarcode, Camera, X } from 'lucide-react';
import { useBarcodeScanner, ParsedGS1Data, extractGS1DataForSupply } from '@/hooks/useBarcodeScanner';
import { Card } from '@/components/ui/card';

interface QuickActionScannerProps {
    onScan: (data: ParsedGS1Data) => void;
    isLoading?: boolean;
}

const QuickActionScanner: React.FC<QuickActionScannerProps> = ({ onScan, isLoading }) => {
    const { t, direction } = useLanguage();
    const inputRef = useRef<HTMLInputElement>(null);
    const [manualInput, setManualInput] = useState('');

    const handleScanSuccess = (data: ParsedGS1Data) => {
        onScan(data);
        setManualInput('');
        stopScanner();
        // Re-focus input after processing (small delay to ensure UI updates)
        setTimeout(() => inputRef.current?.focus(), 100);
    };

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

    // Auto-focus input on mount
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

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
            <form onSubmit={handleManualSubmit} className="relative flex gap-2 items-center">
                <div className="relative flex-1">
                    <ScanBarcode className={`absolute top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground ${direction === 'rtl' ? 'right-3' : 'left-3'}`} />
                    <Input
                        ref={inputRef}
                        value={manualInput}
                        onChange={(e) => setManualInput(e.target.value)}
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
            </form>
        </div>
    );
};

export default QuickActionScanner;
