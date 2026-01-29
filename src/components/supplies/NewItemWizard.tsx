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
import { getManufacturers } from '@/data/operations/manufacturerOperations';

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
    const [manufacturerId, setManufacturerId] = useState<string | undefined>(undefined);
    const [location, setLocation] = useState<string>('');
    const [manufacturers, setManufacturers] = useState<Array<{ id: string; name: string }>>([]);

    const [isLoadingDefs, setIsLoadingDefs] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);

    // Initial Data Load
    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setSearchQuery('');
            setSelectedDefinition(null);
            setSelectedVariant('');
            setLoadError(null);

            // Pre-fill from scan
            if (scannedData) {
                setQuantity(scannedData.quantity ? parseInt(scannedData.quantity) : 1);
                setBatchNumber(scannedData.lotNumber || '');
                setExpiryDate(scannedData.expiryDate || '');
            }

            loadDefinitions();
            loadManufacturers();
        }
    }, [isOpen, scannedData]);

    const loadManufacturers = async () => {
        try {
            const data = await getManufacturers();
            setManufacturers(data);
        } catch (error) {
            console.error('Failed to load manufacturers', error);
        }
    };

    const loadDefinitions = async () => {
        setIsLoadingDefs(true);
        setLoadError(null);
        try {
            const defs = await getProductDefinitions();
            if (!defs || defs.length === 0) {
                // Checking if it's strictly empty or just loaded nothing
                console.warn("No product definitions found.");
            }
            setAllDefinitions(defs);
            setFilteredDefinitions(defs);
        } catch (err: any) {
            console.error("Failed to load product definitions", err);
            setLoadError(err.message || "Failed to load products");
        } finally {
            setIsLoadingDefs(false);
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

        // Set default variant if no picker needed
        if (def.visual_picker_preference === 'none' || (!def.visual_picker_preference && def.variants.length === 0)) {
            setSelectedVariant('Standard');
        } else {
            setSelectedVariant('');
        }
        // MANUAL NAVIGATION: User must click Next
    };

    const handleVariantSelect = (variant: string) => {
        setSelectedVariant(variant);
        // MANUAL NAVIGATION: User must click Next
    };

    const handleFinalSave = () => {
        if (!selectedDefinition) return;

        // Validation for Expiry Date (Required by DB)
        if (!expiryDate) {
            // Since we don't have toast accessible here easily without prop drilling or hook, 
            // valid way involves using a simple alert or adding validation state.
            // But we can use the browser alert for now or just block it.
            // Better: Add error state.
            const input = document.querySelector('input[type="date"]') as HTMLInputElement;
            if (input) input.focus();
            // Assuming we'll add visual error state in a better refactor, for now let's just use alert or rely on HTML5 validation if form.
            // Let's add a simple check and return.
            alert(t('expiry_date_required') || "Expiry Date is required");
            return;
        }

        onComplete(selectedDefinition, selectedVariant, {
            quantity,
            batchNumber,
            purchasePrice: price,
            expiryDate: new Date(expiryDate),
            manufacturerId: manufacturerId === 'none' ? undefined : manufacturerId,
            location: location || undefined
        });
        onClose();
    };

    const renderStep1 = () => (
        <div className="space-y-4">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-900 flex items-start gap-3">
                <div className="bg-yellow-100 dark:bg-yellow-900/40 p-1.5 rounded-full mt-0.5">
                    <Search className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                    <h4 className="font-semibold text-sm text-yellow-800 dark:text-yellow-200">{t('unknown_barcode') || 'Unknown Barcode'}</h4>
                    <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                        {defaultBarcode || scannedData?.rawValue}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                        {t('link_product_help') || 'This item is not in your database. Select a product below to link it for future scans.'}
                    </p>
                </div>
            </div>

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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[50vh] overflow-y-auto pb-20">
                {isLoadingDefs ? (
                    <div className="col-span-full py-8 text-center text-muted-foreground flex flex-col items-center gap-2">
                        <span className="animate-spin text-2xl">⏳</span>
                        <span>{t('loading_products') || 'Loading products...'}</span>
                    </div>
                ) : loadError ? (
                    <div className="col-span-full py-8 text-center text-destructive bg-destructive/5 rounded-lg">
                        <p className="font-semibold">Error Loading Products</p>
                        <p className="text-sm my-2">{loadError}</p>
                        <Button variant="outline" size="sm" onClick={loadDefinitions}>Retry</Button>
                    </div>
                ) : (
                    <>
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
                    </>
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
                        availableVariants={selectedDefinition.variants || []}
                        selectedVariant={selectedVariant}
                        onSelect={handleVariantSelect}
                    />
                )}

                {isCurve && (
                    <CatheterCurvePicker
                        availableVariants={selectedDefinition.variants || []}
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
                <div className="text-xs font-mono mt-1 text-primary">
                    {scannedData?.formattedValue || defaultBarcode || scannedData?.rawValue}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>GTIN</Label>
                    <Input
                        value={scannedData?.gtin || ''}
                        readOnly
                        className="h-12 font-mono bg-muted/30"
                    />
                </div>
                <div className="space-y-2">
                    <Label>{t('batch_number')}</Label>
                    <Input
                        value={batchNumber}
                        onChange={(e) => setBatchNumber(e.target.value)}
                        className="h-12 font-mono"
                    />
                </div>
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

            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>{t('manufacturer') || 'Manufacturer'}</Label>
                    <Select
                        value={manufacturerId || 'none'}
                        onValueChange={value => setManufacturerId(value === 'none' ? undefined : value)}
                    >
                        <SelectTrigger className="h-12">
                            <SelectValue placeholder={t('select_manufacturer') || 'Select manufacturer'} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">{t('none') || 'None'}</SelectItem>
                            {manufacturers.map(m => (
                                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>{t('storage_location') || 'Storage Location'}</Label>
                    <Input
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder={t('storage_location') || 'Storage location'}
                        className="h-12"
                    />
                </div>
            </div>
        </div >
    );

return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent
            side="bottom"
            className="rounded-t-[20px] max-h-[90vh] min-h-[50vh] overflow-y-auto"
            data-vaul-no-drag
        >
            <SheetHeader className="mb-4">
                <SheetTitle className="flex justify-between items-center">
                    <span>
                        {step === 1 && t('identify_product')}
                        {step === 2 && t('select_variant')}
                        {step === 3 && t('confirm_details')}
                    </span>
                    <span className="text-sm font-normal text-muted-foreground">Step {step}/3</span>
                </SheetTitle>
                <SheetDescription>
                    {step === 1 && (t('scan_search_instruction') || "Scan a barcode or search for a product to add.")}
                    {step === 2 && (t('select_variant_instruction') || "Select the specific variant for this product.")}
                    {step === 3 && (t('confirm_details_instruction') || "Verify quantity, batch, and expiry details.")}
                </SheetDescription>
            </SheetHeader>

            <div className="py-2">
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
            </div>

            <SheetFooter className="mt-6 flex-row gap-3 sm:space-x-0">
                {step > 1 && (
                    <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1">
                        <ArrowLeft className="mr-2 h-4 w-4" /> {t('back') || 'Back'}
                    </Button>
                )}

                {step === 1 && (
                    <Button
                        onClick={() => {
                            if (selectedDefinition?.visual_picker_preference === 'none' || (!selectedDefinition?.visual_picker_preference && selectedDefinition?.variants.length === 0)) {
                                setStep(3); // Skip to details if no variants
                            } else {
                                setStep(2); // Go to variant picker
                            }
                        }}
                        disabled={!selectedDefinition}
                        className="flex-1"
                    >
                        {t('next') || 'Next'} <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                )}

                {step === 2 && (
                    <Button
                        onClick={() => setStep(3)}
                        disabled={!selectedVariant}
                        className="flex-1"
                    >
                        {t('next') || 'Next'} <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
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
