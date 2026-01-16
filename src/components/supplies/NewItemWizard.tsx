import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetDescription } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProductDefinition } from '@/types';
import { StentMatrixPicker } from './StentMatrixPicker';
import { CatheterCurvePicker } from './CatheterCurvePicker';
import { getProductDefinitions } from '@/data/operations/productDefinitionOperations';
import { ArrowLeft, ArrowRight, Save, Search, CheckCircle } from 'lucide-react';
import { ParsedGS1Data } from '@/hooks/useBarcodeScanner';
import { ConfirmedItemData } from './ItemConfirmationDialog';

interface NewItemWizardProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete: (productDef: ProductDefinition, variant: string, data: ConfirmedItemData) => void;
    scannedData: ParsedGS1Data | null;
    defaultBarcode?: string;
}

export const NewItemWizard: React.FC<NewItemWizardProps> = ({
    isOpen,
    onClose,
    onComplete,
    scannedData,
    defaultBarcode
}) => {
    const { t, direction } = useLanguage();
    const [step, setStep] = useState(1);
    const [allDefinitions, setAllDefinitions] = useState<ProductDefinition[]>([]);
    const [filteredDefinitions, setFilteredDefinitions] = useState<ProductDefinition[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    // Selection State
    const [selectedDefinition, setSelectedDefinition] = useState<ProductDefinition | null>(null);
    const [selectedVariant, setSelectedVariant] = useState('');

    // Final Details
    const [quantity, setQuantity] = useState(1);
    const [price, setPrice] = useState(0);
    const [expiryDate, setExpiryDate] = useState<string>('');
    const [batchNumber, setBatchNumber] = useState('');

    // Initial Data Load
    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setSearchQuery('');
            setSelectedDefinition(null);
            setSelectedVariant('');

            // Pre-fill from scan
            if (scannedData) {
                setQuantity(scannedData.quantity ? parseInt(scannedData.quantity) : 1);
                setBatchNumber(scannedData.lotNumber || '');
                setExpiryDate(scannedData.expiryDate || '');
            }

            loadDefinitions();
        }
    }, [isOpen, scannedData]);

    const loadDefinitions = async () => {
        try {
            const defs = await getProductDefinitions();
            setAllDefinitions(defs);
            setFilteredDefinitions(defs);
        } catch (err) {
            console.error("Failed to load product definitions", err);
        }
    };

    useEffect(() => {
        const lowerQuery = searchQuery.toLowerCase();
        setFilteredDefinitions(
            allDefinitions.filter(d => d.name.toLowerCase().includes(lowerQuery))
        );
    }, [searchQuery, allDefinitions]);

    const handleDefinitionSelect = (def: ProductDefinition) => {
        setSelectedDefinition(def);

        // Logic to determine next step
        if (def.visual_picker_preference === 'none' || (!def.visual_picker_preference && def.variants.length === 0)) {
            // No variants, skip to details
            setSelectedVariant('Standard');
            setStep(3);
        } else {
            // Go to variant picker
            setStep(2);
        }
    };

    const handleVariantSelect = (variant: string) => {
        setSelectedVariant(variant);
        // Auto-advance to details after selection
        setStep(3);
    };

    const handleFinalSave = () => {
        if (!selectedDefinition) return;

        onComplete(selectedDefinition, selectedVariant, {
            quantity,
            batchNumber,
            purchasePrice: price,
            expiryDate: expiryDate ? new Date(expiryDate) : undefined
        });
        onClose();
    };

    const renderStep1 = () => (
        <div className="space-y-4">
            <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder={t('search_products') || "Search products..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-12"
                    autoFocus
                />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[60vh] overflow-y-auto pb-20">
                {filteredDefinitions.map(def => (
                    <Button
                        key={def.id}
                        variant="outline"
                        className="h-auto py-4 flex flex-col items-start gap-1 whitespace-normal text-left"
                        onClick={() => handleDefinitionSelect(def)}
                    >
                        <span className="font-bold text-base">{def.name}</span>
                        <span className="text-xs text-muted-foreground">{def.variant_label || "Standard"}</span>
                    </Button>
                ))}
                {filteredDefinitions.length === 0 && (
                    <div className="col-span-full text-center py-8 text-muted-foreground">
                        {t('no_products_found') || 'لا توجد منتجات مطابقة'} "{searchQuery}"
                    </div>
                )}
            </div>
        </div>
    );

    const renderStep2 = () => {
        if (!selectedDefinition) return null;

        const preference = selectedDefinition.visual_picker_preference || 'auto';
        const isMatrix = preference === 'matrix';
        const isCurve = preference === 'curve';

        // Fallback to simple list if 'auto' or 'list'
        const isList = preference === 'list' || (!isMatrix && !isCurve);

        return (
            <div className="space-y-4">
                <div className="text-center mb-4">
                    <h3 className="font-semibold">{selectedDefinition.name}</h3>
                    <p className="text-sm text-muted-foreground">Select {selectedDefinition.variant_label}</p>
                </div>

                {isMatrix && (
                    <StentMatrixPicker
                        selectedVariant={selectedVariant}
                        onSelect={handleVariantSelect}
                    />
                )}

                {isCurve && (
                    <CatheterCurvePicker
                        selectedCurve={selectedVariant}
                        onSelect={handleVariantSelect}
                    />
                )}

                {isList && (
                    <div className="grid grid-cols-3 gap-3">
                        {selectedDefinition.variants.map((v, idx) => (
                            <Button
                                key={idx}
                                variant={selectedVariant === v.name ? "default" : "outline"}
                                className={selectedVariant === v.name ? "h-16 text-lg border-2 border-primary" : "h-16 text-lg"}
                                onClick={() => handleVariantSelect(v.name)}
                            >
                                {v.name}
                            </Button>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const renderStep3 = () => (
        <div className="space-y-6">
            <div className="bg-muted/50 p-4 rounded-lg">
                <div className="font-bold">{selectedDefinition?.name}</div>
                <div className="text-sm text-muted-foreground">{selectedVariant !== "Standard" ? selectedVariant : ""}</div>
                <div className="text-xs font-mono mt-1 text-primary">{defaultBarcode || scannedData?.rawValue}</div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>{t('quantity')}</Label>
                    <Input
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                        className="h-12 text-center text-lg font-bold"
                    />
                </div>
                <div className="space-y-2">
                    <Label>{t('price')}</Label>
                    <Input
                        type="number"
                        value={price}
                        onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                        className="h-12 text-center text-lg"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label>{t('expiry_date')}</Label>
                <Input
                    type="date"
                    value={expiryDate ? expiryDate.substring(0, 10) : ''}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="h-12"
                />
            </div>

            <div className="space-y-2">
                <Label>{t('batch_number')}</Label>
                <Input
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    className="h-12"
                />
            </div>
        </div>
    );

    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <SheetContent side="bottom" className="rounded-t-[20px] max-h-[90vh] min-h-[50vh] overflow-y-auto">
                <SheetHeader className="mb-4">
                    <SheetTitle className="flex justify-between items-center">
                        <span>
                            {step === 1 && t('identify_product')}
                            {step === 2 && t('select_variant')}
                            {step === 3 && t('confirm_details')}
                        </span>
                        <span className="text-sm font-normal text-muted-foreground">Step {step}/3</span>
                    </SheetTitle>
                </SheetHeader>

                <div className="py-2">
                    {step === 1 && renderStep1()}
                    {step === 2 && renderStep2()}
                    {step === 3 && renderStep3()}
                </div>

                <SheetFooter className="mt-6 flex-row gap-3 sm:space-x-0">
                    {step > 1 && (
                        <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1">
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back
                        </Button>
                    )}

                    {step < 3 && step !== 1 && (
                        // Step 1 buttons are inside the list; Step 2 auto-advances generally but can have manual next if needed
                        <div className="flex-1"></div>
                    )}

                    {step === 3 && (
                        <Button onClick={handleFinalSave} className="flex-[2]">
                            <Save className="mr-2 h-4 w-4" /> Save Item
                        </Button>
                    )}
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
};
