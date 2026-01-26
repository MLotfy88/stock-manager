import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { ProductDefinition } from '@/types';
import { ChevronLeft, Tag } from 'lucide-react';

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

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onBack()}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="text-xl flex items-center gap-2">
                        <Tag className="h-6 w-6 text-primary" />
                        {t('select_variant') || 'Select Variant - Step 3'}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Product Info */}
                    <div className="bg-muted/30 p-4 rounded-lg">
                        <div className="text-sm text-muted-foreground">{t('selected_product')}</div>
                        <div className="text-lg font-semibold">{product?.name}</div>
                    </div>

                    {/* Variant Selection */}
                    <div>
                        <Label className="text-sm text-muted-foreground mb-2">
                            {t('variant')}
                        </Label>
                        <Select value={selectedVariant} onValueChange={onSelect}>
                            <SelectTrigger className="w-full h-12">
                                <SelectValue placeholder={t('select_variant') || 'Select Variant...'} />
                            </SelectTrigger>
                            <SelectContent>
                                {product?.variants.map(v => (
                                    <SelectItem key={String(v)} value={String(v)} className="py-3">
                                        <span className="font-medium">{String(v)}</span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Info */}
                    <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg text-sm">
                        <p className="text-blue-800 dark:text-blue-200">
                            ℹ️ {t('select_variant_tip') || 'Select the variant that matches all scanned items. Price will be entered in the next step.'}
                        </p>
                    </div>
                </div>

                <DialogFooter className="gap-2">
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
