import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { ProductDefinition } from '@/types';
import { ChevronLeft, Tag } from 'lucide-react';
import { StentMatrixPicker } from './StentMatrixPicker';
import { CatheterCurvePicker } from './CatheterCurvePicker';

interface BatchVariantStepProps {
    isOpen: boolean;
    product: ProductDefinition | undefined;
    selectedVariant: string;
    onSelect: (variant: string) => void;
    onNext: () => void;
    onBack: () => void;
}

const BatchVariantStep: React.FC<BatchVariantStepProps> = ({
    isOpen,
    product,
    selectedVariant,
    onSelect,
    onNext,
    onBack
}) => {
    const { t } = useLanguage();

    // Determine picker type
    const preference = product?.visual_picker_preference || 'auto';
    const isMatrix = preference === 'matrix';
    const isCurve = preference === 'curve';
    const isList = preference === 'list' || (!isMatrix && !isCurve);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onBack()}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl flex items-center gap-2">
                        <Tag className="h-6 w-6 text-primary" />
                        {t('select_variant') || 'Select Variant - Step 3'}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Product Info */}
                    <div className="bg-muted/30 p-4 rounded-lg text-center">
                        <div className="text-sm text-muted-foreground">{t('selected_product')}</div>
                        <div className="text-xl font-bold text-primary">{product?.name}</div>
                        <div className="text-sm mt-1">{product?.variant_label || t('variant')}</div>
                    </div>

                    {/* Variant Selection Logic - Matching Single Mode */}
                    <div className="min-h-[300px]">
                        {isMatrix && product && (
                            <StentMatrixPicker
                                availableVariants={product.variants || []}
                                selectedVariant={selectedVariant}
                                onSelect={onSelect}
                            />
                        )}

                        {isCurve && product && (
                            <CatheterCurvePicker
                                availableVariants={product.variants || []}
                                selectedCurve={selectedVariant}
                                onSelect={onSelect}
                            />
                        )}

                        {isList && product && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {product.variants.map((v: any, idx: number) => {
                                    const vName = typeof v === 'string' ? v : (v.name || JSON.stringify(v));
                                    return (
                                        <Button
                                            key={idx}
                                            variant={selectedVariant === vName ? "default" : "outline"}
                                            className={`h-16 text-lg whitespace-normal ${selectedVariant === vName ? "border-2 border-primary" : ""}`}
                                            onClick={() => onSelect(vName)}
                                        >
                                            {vName}
                                        </Button>
                                    );
                                })}
                            </div>
                        )}

                        {(!product || !product.variants || product.variants.length === 0) && (
                            <div className="text-center py-10 text-muted-foreground">
                                {t('no_variants_available') || 'No variants available'}
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="gap-2 sticky bottom-0 bg-background pt-4 border-t mt-4">
                    <Button variant="outline" onClick={onBack}>
                        <ChevronLeft className="h-4 w-4 mr-2" />
                        {t('back')}
                    </Button>
                    <Button
                        onClick={onNext}
                        disabled={!selectedVariant}
                        size="lg"
                    >
                        {t('review') || 'Review'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default BatchVariantStep;
