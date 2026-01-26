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
    productDefinitions: ProductDefinition[];
    onAddToCart: (items: {
        productDefId: string;
        variant: string;
        price: number;
        patterns: GroupedPattern[];
    }) => void;
}

const BatchReviewDialog: React.FC<BatchReviewDialogProps> = ({
    isOpen,
    onClose,
    batchScans,
    productDefinitions,
    onAddToCart
}) => {
    const { t } = useLanguage();
    const [selectedProductId, setSelectedProductId] = useState('');
    const [selectedVariant, setSelectedVariant] = useState('');
    const [purchasePrice, setPurchasePrice] = useState('');

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

    const selectedProduct = useMemo(() => {
        return productDefinitions.find(p => p.id === selectedProductId);
    }, [selectedProductId, productDefinitions]);

    const handleSubmit = () => {
        if (!selectedProductId || !selectedVariant || !purchasePrice) {
            return;
        }

        onAddToCart({
            productDefId: selectedProductId,
            variant: selectedVariant,
            price: parseFloat(purchasePrice),
            patterns: groupedPatterns
        });

        // Reset form
        setSelectedProductId('');
        setSelectedVariant('');
        setPurchasePrice('');
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
                    {/* Product Assignment Section */}
                    <div className="bg-primary/5 p-4 rounded-lg border-2 border-primary/20">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm">1</span>
                            {t('assign_product_variant') || 'Assign Product & Variant'}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <Label className="text-xs text-muted-foreground mb-1">{t('product')}</Label>
                                <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('select_product') || 'Select Product...'} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {productDefinitions.map(p => (
                                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className="text-xs text-muted-foreground mb-1">{t('variant')}</Label>
                                <Select
                                    value={selectedVariant}
                                    onValueChange={setSelectedVariant}
                                    disabled={!selectedProduct}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('select_variant') || 'Select Variant...'} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {selectedProduct?.variants.map(v => (
                                            <SelectItem key={String(v)} value={String(v)}>{String(v)}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className="text-xs text-muted-foreground mb-1">{t('purchase_price') || 'Price/Unit'}</Label>
                                <Input
                                    type="number"
                                    placeholder="0.00"
                                    value={purchasePrice}
                                    onChange={e => setPurchasePrice(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Patterns Review Section */}
                    <div>
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm">2</span>
                            {t('review_patterns') || 'Review Scanned Patterns'}
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
                                        <TableHead className="text-right font-bold">{t('total') || 'Total'}</TableHead>
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
                                        </TableRow>
                                    ))}
                                    <TableRow className="bg-primary/10 font-bold">
                                        <TableCell colSpan={6} className="text-right">
                                            {t('total_quantity') || 'Total Quantity:'}
                                        </TableCell>
                                        <TableCell className="text-right text-xl">
                                            {totalQuantity}
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                        {selectedProductId && selectedVariant && purchasePrice ? (
                            <span className="text-green-600 flex items-center gap-1">
                                <Check className="h-3 w-3" /> Ready to add
                            </span>
                        ) : (
                            <span className="text-amber-600 flex items-center gap-1">
                                <X className="h-3 w-3" /> Fill all fields
                            </span>
                        )}
                    </div>
                    <Button variant="outline" onClick={onClose}>
                        {t('cancel')}
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!selectedProductId || !selectedVariant || !purchasePrice}
                    >
                        {t('add_to_cart') || 'Add to Cart'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default BatchReviewDialog;
