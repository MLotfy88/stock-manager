import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { Badge } from '@/components/ui/badge';
import { Scan, Check, X } from 'lucide-react';
import { ParsedGS1Data } from '@/hooks/useBarcodeScanner';
import QuickActionScanner from './QuickActionScanner';

interface BatchScanEntry {
    id: string;
    timestamp: number;
    rawBarcode: string;
    fingerprint: string;
    parsedData: ParsedGS1Data;
}

interface BatchScanningStepProps {
    isOpen: boolean;
    scans: BatchScanEntry[];
    onScan: (data: ParsedGS1Data) => void;
    onNext: () => void;
    onCancel: () => void;
    isLoading: boolean;
}

const BatchScanningStep: React.FC<BatchScanningStepProps> = ({
    isOpen,
    scans,
    onScan,
    onNext,
    onCancel,
    isLoading
}) => {
    const { t } = useLanguage();

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
            <DialogContent className="max-w-2xl max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle className="text-xl flex items-center gap-2">
                        <Scan className="h-6 w-6 text-primary" />
                        {t('batch_scanning') || 'Batch Scanning - Step 1'}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Scan Counter */}
                    <div className="bg-primary/10 p-6 rounded-lg text-center">
                        <div className="text-sm text-muted-foreground mb-2">
                            {t('scanned_items') || 'Scanned Items'}
                        </div>
                        <div className="text-6xl font-bold text-primary">
                            {scans.length}
                        </div>
                    </div>

                    {/* Scanner */}
                    <div>
                        <QuickActionScanner onScan={onScan} isLoading={isLoading} />
                    </div>

                    {/* Recent Scans Preview */}
                    {scans.length > 0 && (
                        <div className="border rounded-lg p-4 max-h-[200px] overflow-y-auto">
                            <div className="text-sm font-semibold mb-2 flex items-center gap-2">
                                <Check className="h-4 w-4 text-green-600" />
                                {t('recent_scans') || 'Recent Scans'}
                            </div>
                            <div className="space-y-1">
                                {scans.slice(-5).reverse().map((scan, idx) => (
                                    <div
                                        key={scan.id}
                                        className="flex items-center gap-2 text-xs p-2 bg-muted/30 rounded"
                                    >
                                        <Badge variant="outline" className="text-xs">
                                            {scans.length - idx}
                                        </Badge>
                                        <span className="font-mono flex-1 truncate">
                                            {scan.parsedData.gtin || scan.rawBarcode}
                                        </span>
                                        {scan.parsedData.quantity && (
                                            <Badge variant="secondary" className="text-xs">
                                                Qty: {scan.parsedData.quantity}
                                            </Badge>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Instructions */}
                    <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg text-sm">
                        <p className="text-blue-800 dark:text-blue-200">
                            💡 {t('batch_scan_tip') || 'Scan all items for the same product, then click Next to select the product.'}
                        </p>
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={onCancel}>
                        <X className="h-4 w-4 mr-2" />
                        {t('cancel')}
                    </Button>
                    <Button
                        onClick={onNext}
                        disabled={scans.length === 0}
                        size="lg"
                    >
                        {t('next')} ({scans.length})
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default BatchScanningStep;
