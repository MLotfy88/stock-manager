import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLanguage } from '@/contexts/LanguageContext';
import { ProductDefinition } from '@/types';
import { format } from 'date-fns';
import { Check, X } from 'lucide-react';
import { ParsedGS1Data } from '@/hooks/useBarcodeScanner';

interface BatchScanEntry {
    id: string;
    timestamp: number;
    rawBarcode: string;
    fingerprint: string;
    parsedData: ParsedGS1Data;
}

interface GroupedPattern {
    fingerprint: string;
    gtin: string;
    batch: string;
    expiry: string;
    quantityPerUnit: number;
    scanCount: number;
    totalQuantity: number;
    entries: BatchScanEntry[];
}

interface BatchReviewDialogProps {
    isOpen: boolean;
    onClose: () => void;
    batchScans: BatchScanEntry[];
    productName: string;           // NEW: Pre-selected
    variantName: string;            // NEW: Pre-selected
    onAddToCart: (items: {
        patterns: Array<{
            fingerprint: string;
            gtin: string;
            batch: string;
            expiry: string;
            quantityPerUnit: number;
            scanCount: number;
            totalQuantity: number;
            entries: any[];
            price: number;              // NEW: Price per pattern
        }>;
    }) => void;
    onBack: () => void;             // NEW: Back button
}

const BatchReviewDialog: React.FC<BatchReviewDialogProps> = ({
    isOpen,
    onClose,
    batchScans,
    productName,
    variantName,
    onAddToCart,
    onBack
}) => {
    const { t } = useLanguage();

    // Price state for each pattern
    const [patternPrices, setPatternPrices] = React.useState<Record<string, number>>({});

    // Group scans by fingerprint
    const groupedPatterns = useMemo(() => {
        const groups = new Map<string, GroupedPattern>();

        batchScans.forEach(entry => {
            const existing = groups.get(entry.fingerprint);
            const qty = typeof entry.parsedData.quantity === 'number' ? entry.parsedData.quantity : parseInt(entry.parsedData.quantity || '1') || 1;
            const batchNum = (entry.parsedData as any).batch || (entry.parsedData as any).batchNumber || '';
            const expiryDate = (entry.parsedData as any).expiry || (entry.parsedData as any).expiryDate || '';

            if (existing) {
                existing.scanCount++;
                existing.totalQuantity += qty;
                existing.entries.push(entry);
            } else {
                groups.set(entry.fingerprint, {
                    fingerprint: entry.fingerprint,
                    gtin: entry.parsedData.gtin || '',
                    batch: batchNum,
                    expiry: expiryDate,
                    quantityPerUnit: qty,
                    scanCount: 1,
                    totalQuantity: qty,
                    entries: [entry]
                });
            }
        });

        return Array.from(groups.values());
    }, [batchScans]);

    const totalQuantity = useMemo(() => {
        return groupedPatterns.reduce((sum, p) => sum + p.totalQuantity, 0);
    }, [groupedPatterns]);

    const handleSubmit = () => {
        // Validate all prices are set
        const patternsWithPrices = groupedPatterns.map(p => ({
            ...p,
            price: patternPrices[p.fingerprint] || 0
        }));

        if (patternsWithPrices.some(p => p.price <= 0)) {
            return; // Don't submit if any price is invalid
        }

        onAddToCart({
            patterns: patternsWithPrices
        });

        // Reset
        setPatternPrices({});
        onClose();
    };

    const formatExpiry = (expiry: string) => {
        if (!expiry) return '-';
        // Expiry format: YYMMDD
        try {
            const year = parseInt('20' + expiry.substring(0, 2));
            const month = parseInt(expiry.substring(2, 4));
            const day = parseInt(expiry.substring(4, 6));
            return `${day}/${month}/${year}`;
        } catch {
            return expiry;
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl">
                        {t('batch_review') || 'Batch Review & Assign'}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Product/Variant Info (Read-only) */}
                    <div className="bg-primary/5 p-4 rounded-lg border-2 border-primary/20">
                        <h3 className="font-semibold mb-3 text-sm text-muted-foreground">
                            {t('selected_product_variant') || 'Selected Product & Variant'}
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <div className="text-xs text-muted-foreground">{t('product')}</div>
                                <div className="text-lg font-semibold">{productName}</div>
                            </div>
                            <div>
                                <div className="text-xs text-muted-foreground">{t('variant')}</div>
                                <div className="text-lg font-semibold">{variantName}</div>
                            </div>
                        </div>
                    </div>

                    {/* Patterns Review Section */}
                    <div>
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm">✓</span>
                            {t('review_patterns') || 'Review Scanned Patterns - Step 4'}
                        </h3>
                        <div className="border rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead className="w-[50px]">#</TableHead>
                                        <TableHead>GTIN</TableHead>
                                        <TableHead>LOT</TableHead>
                                        <TableHead>{t('expiry') || 'Expiry'}</TableHead>
                                        <TableHead className="text-center">{t('qty_unit') || 'Qty/Unit'}</TableHead>
                                        <TableHead className="text-center">{t('scans') || 'Scans'}</TableHead>
                                        <TableHead className="text-right font-bold">{t('total_qty') || 'Total Qty'}</TableHead>
                                        <TableHead className="text-right">{t('price_unit') || 'Price/Unit'}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {groupedPatterns.map((pattern, idx) => (
                                        <TableRow key={pattern.fingerprint}>
                                            <TableCell className="font-medium">{idx + 1}</TableCell>
                                            <TableCell className="font-mono text-xs">{pattern.gtin || '-'}</TableCell>
                                            <TableCell className="font-semibold">{pattern.batch || '-'}</TableCell>
                                            <TableCell>{formatExpiry(pattern.expiry)}</TableCell>
                                            <TableCell className="text-center">{pattern.quantityPerUnit}</TableCell>
                                            <TableCell className="text-center">
                                                <span className="bg-blue-100 dark:bg-blue-900 px-2 py-0.5 rounded text-sm">
                                                    {pattern.scanCount}×
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-lg">
                                                {pattern.totalQuantity}
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    placeholder="0.00"
                                                    className="w-24 text-right"
                                                    value={patternPrices[pattern.fingerprint] || ''}
                                                    onChange={(e) => setPatternPrices(prev => ({
                                                        ...prev,
                                                        [pattern.fingerprint]: parseFloat(e.target.value) || 0
                                                    }))}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow className="bg-primary/10 font-bold">
                                        <TableCell colSpan={6} className="text-right">
                                            {t('total_quantity') || 'Total Quantity:'}
                                        </TableCell>
                                        <TableCell className="text-right text-xl">
                                            {totalQuantity}
                                        </TableCell>
                                        <TableCell></TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                        {Object.keys(patternPrices).length === groupedPatterns.length &&
                            Object.values(patternPrices).every(p => p > 0) ? (
                            <span className="text-green-600 flex items-center gap-1">
                                <Check className="h-3 w-3" /> {t('ready_to_add') || 'Ready to add'}
                            </span>
                        ) : (
                            <span className="text-amber-600 flex items-center gap-1">
                                <X className="h-3 w-3" /> {t('enter_all_prices') || 'Enter all prices'}
                            </span>
                        )}
                    </div>
                    <Button variant="outline" onClick={onBack}>
                        {t('back')}
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={Object.keys(patternPrices).length !== groupedPatterns.length ||
                            Object.values(patternPrices).some(p => p <= 0)}
                    >
                        {t('add_to_cart') || 'Add to Cart'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default BatchReviewDialog;
