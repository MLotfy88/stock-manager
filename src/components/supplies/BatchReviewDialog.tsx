import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLanguage } from '@/contexts/LanguageContext';
import { Trash2, Check, X, AlertCircle } from 'lucide-react';
import { ParsedGS1Data } from '@/hooks/useBarcodeScanner';
import { Card, CardContent } from '@/components/ui/card';

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
    productName: string;
    variantName: string;
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
            price: number;
        }>;
    }) => void;
    onBack: () => void;
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

    const [patterns, setPatterns] = useState<GroupedPattern[]>([]);
    const [prices, setPrices] = useState<Record<string, number>>({});
    const [quantities, setQuantities] = useState<Record<string, number>>({});
    const [expiries, setExpiries] = useState<Record<string, string>>({});

    // Initialize patterns from scans
    useEffect(() => {
        if (isOpen && batchScans.length > 0) {
            const groups = new Map<string, GroupedPattern>();
            batchScans.forEach(entry => {
                const existing = groups.get(entry.fingerprint);
                const qty = typeof entry.parsedData.quantity === 'number' ? entry.parsedData.quantity : parseInt(entry.parsedData.quantity || '1') || 1;
                const batchNum = entry.parsedData.lotNumber || '';
                const expiryDate = entry.parsedData.expiryDate || '';

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
            const initialPatterns = Array.from(groups.values());
            setPatterns(initialPatterns);

            // Initialize quantities and expiries
            const initialQtys: Record<string, number> = {};
            const initialExpiries: Record<string, string> = {};

            initialPatterns.forEach(p => {
                initialQtys[p.fingerprint] = p.totalQuantity;
                // Parse GS1 date (YYMMDD) to YYYY-MM-DD for input
                if (p.expiry && p.expiry.length === 6) {
                    try {
                        const year = parseInt('20' + p.expiry.substring(0, 2));
                        const month = parseInt(p.expiry.substring(2, 4));
                        const day = parseInt(p.expiry.substring(4, 6));
                        const date = new Date(year, month - 1, day);
                        // Check valid date
                        if (!isNaN(date.getTime())) {
                            initialExpiries[p.fingerprint] = date.toISOString().substring(0, 10);
                        } else {
                            initialExpiries[p.fingerprint] = '';
                        }
                    } catch {
                        initialExpiries[p.fingerprint] = '';
                    }
                } else {
                    initialExpiries[p.fingerprint] = ''; // Or keep original if already ISO? Parser returns ISO usually?
                    // Wait, useBarcodeScanner returns ISO string in expiryDate?
                    // Let's check Parser. Parsing logic in useBarcodeScanner:
                    // uses convertGS1DateToISO => returns YYYY-MM-DD.
                    // So p.expiry is ALREADY YYYY-MM-DD.
                    initialExpiries[p.fingerprint] = p.expiry || '';
                }
            });
            setQuantities(initialQtys);
            setExpiries(initialExpiries);
        }
    }, [isOpen, batchScans]);

    const totalQuantity = useMemo(() => {
        return patterns.reduce((sum, p) => sum + (quantities[p.fingerprint] || 0), 0);
    }, [patterns, quantities]);

    const removePattern = (fingerprint: string) => {
        setPatterns(prev => prev.filter(p => p.fingerprint !== fingerprint));
    };

    const updateQuantity = (fingerprint: string, newVal: number) => {
        if (newVal >= 0) {
            setQuantities(prev => ({ ...prev, [fingerprint]: newVal }));
        }
    };

    const handleSubmit = () => {
        // Validate
        const finalPatterns = patterns.map(p => ({
            ...p,
            totalQuantity: quantities[p.fingerprint] || 0,
            expiry: expiries[p.fingerprint] || '', // Use edited expiry
            price: prices[p.fingerprint] || 0
        })).filter(p => p.totalQuantity > 0);

        if (finalPatterns.length === 0 || finalPatterns.some(p => p.price <= 0)) {
            return;
        }

        // Validate Expiry Presence
        if (finalPatterns.some(p => !p.expiry)) {
            alert(t('expiry_date_required') || "Expiry Date is required for all items");
            return;
        }

        onAddToCart({
            patterns: finalPatterns
        });

        // Reset
        setPrices({});
        setQuantities({});
        setExpiries({});
        onClose();
    };



    const renderPatternRow = (pattern: GroupedPattern, isMobile: boolean) => {
        const qty = quantities[pattern.fingerprint] || 0;
        const price = prices[pattern.fingerprint] || '';

        if (isMobile) {
            return (
                <Card key={pattern.fingerprint} className="mb-3 relative">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 text-destructive h-8 w-8"
                        onClick={() => removePattern(pattern.fingerprint)}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                    <CardContent className="p-4 space-y-3">
                        <div className="flex justify-between items-start pr-8">
                            <div>
                                <div className="font-mono text-xs text-muted-foreground">{pattern.gtin || 'No GTIN'}</div>
                                <div className="font-semibold text-sm">Batch: {pattern.batch || '-'}</div>
                                <div className="mt-1">
                                    <Label className="text-xs sr-only">Expiry</Label>
                                    <Input
                                        type="date"
                                        value={expiries[pattern.fingerprint] || ''}
                                        onChange={e => setExpiries(prev => ({ ...prev, [pattern.fingerprint]: e.target.value }))}
                                        className="h-7 w-32 text-xs"
                                    />
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="bg-blue-100 dark:bg-blue-900 text-xs px-2 py-1 rounded">
                                    {pattern.scanCount} scans
                                </span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <div>
                                <Label className="text-xs">{t('quantity')}</Label>
                                <Input
                                    type="number"
                                    value={qty}
                                    onChange={e => updateQuantity(pattern.fingerprint, parseInt(e.target.value) || 0)}
                                    className="h-9"
                                />
                            </div>
                            <div>
                                <Label className="text-xs">{t('price')}</Label>
                                <Input
                                    type="number"
                                    value={price}
                                    placeholder="0.00"
                                    onChange={e => setPrices(prev => ({ ...prev, [pattern.fingerprint]: parseFloat(e.target.value) || 0 }))}
                                    className="h-9"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            );
        }

        return (
            <TableRow key={pattern.fingerprint}>
                <TableCell className="font-mono text-xs">{pattern.gtin || '-'}</TableCell>
                <TableCell className="font-semibold">{pattern.batch || '-'}</TableCell>
                <TableCell>
                    <Input
                        type="date"
                        value={expiries[pattern.fingerprint] || ''}
                        onChange={e => setExpiries(prev => ({ ...prev, [pattern.fingerprint]: e.target.value }))}
                        className="h-8 w-[130px] text-xs"
                    />
                </TableCell>
                <TableCell className="text-center">
                    <span className="bg-blue-100 dark:bg-blue-900 px-2 py-0.5 rounded text-sm">
                        {pattern.scanCount}×
                    </span>
                </TableCell>
                <TableCell className="text-center w-[120px]">
                    <Input
                        type="number"
                        value={qty}
                        onChange={e => updateQuantity(pattern.fingerprint, parseInt(e.target.value) || 0)}
                        className="h-8 text-center"
                    />
                </TableCell>
                <TableCell className="w-[120px]">
                    <Input
                        type="number"
                        value={price}
                        placeholder="0.00"
                        onChange={e => setPrices(prev => ({ ...prev, [pattern.fingerprint]: parseFloat(e.target.value) || 0 }))}
                        className="h-8 text-right"
                    />
                </TableCell>
                <TableCell>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => removePattern(pattern.fingerprint)}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </TableCell>
            </TableRow>
        );
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="text-xl">
                        {t('batch_review') || 'Batch Review & Assign'}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 pt-2">
                    {/* Header Info */}
                    <div className="bg-muted/30 p-4 rounded-lg mb-6 flex justify-between items-center">
                        <div>
                            <div className="text-sm text-muted-foreground">{t('product')}</div>
                            <div className="font-bold">{productName}</div>
                            <div className="text-sm">{variantName}</div>
                        </div>
                        <div className="text-right">
                            <div className="text-sm text-muted-foreground">{t('total_quantity')}</div>
                            <div className="text-2xl font-bold text-primary">{totalQuantity}</div>
                        </div>
                    </div>

                    {/* Mobile View */}
                    <div className="md:hidden">
                        {patterns.map(p => renderPatternRow(p, true))}
                    </div>

                    {/* Desktop View */}
                    <div className="hidden md:block border rounded-lg overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50">
                                    <TableHead>GTIN</TableHead>
                                    <TableHead>LOT</TableHead>
                                    <TableHead>{t('expiry') || 'Expiry'}</TableHead>
                                    <TableHead className="text-center">{t('scans')}</TableHead>
                                    <TableHead className="text-center">{t('quantity')}</TableHead>
                                    <TableHead className="text-right">{t('price')}</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {patterns.map(p => renderPatternRow(p, false))}
                            </TableBody>
                        </Table>
                    </div>

                    {patterns.length === 0 && (
                        <div className="text-center py-10 text-muted-foreground">
                            {t('no_items_left') || 'No items left'}
                        </div>
                    )}
                </div>

                <DialogFooter className="p-6 pt-2 gap-2 border-t bg-background">
                    <Button variant="outline" onClick={onBack}>
                        {t('back')}
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={patterns.length === 0 || Object.keys(prices).length !== patterns.length || Object.values(prices).some(p => p <= 0)}
                        className="flex-1 md:flex-none"
                    >
                        {t('add_to_cart') || 'Add to Cart'} ({totalQuantity})
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default BatchReviewDialog;
