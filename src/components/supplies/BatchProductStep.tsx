import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { ProductDefinition } from '@/types';
import { ChevronLeft, ChevronRight, Package } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface BatchProductStepProps {
    isOpen: boolean;
    products: ProductDefinition[];
    selectedProduct: string;
    onSelect: (productId: string) => void;
    onNext: () => void;
    onBack: () => void;
}

const BatchProductStep: React.FC<BatchProductStepProps> = ({
    isOpen,
    products,
    selectedProduct,
    onSelect,
    onNext,
    onBack
}) => {
    const { t } = useLanguage();
    const [searchTerm, setSearchTerm] = React.useState('');

    const filteredProducts = React.useMemo(() => {
        if (!searchTerm) return products;
        return products.filter(p =>
            p.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [products, searchTerm]);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onBack()}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="text-xl flex items-center gap-2">
                        <Package className="h-6 w-6 text-primary" />
                        {t('select_product') || 'Select Product - Step 2'}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Search */}
                    <div>
                        <Label className="text-sm text-muted-foreground mb-2">
                            {t('search_product') || 'Search Product'}
                        </Label>
                        <Input
                            placeholder={t('type_to_search') || 'Type to search...'}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="mb-2"
                        />
                    </div>

                    {/* Product Selection */}
                    <div>
                        <Label className="text-sm text-muted-foreground mb-2">
                            {t('product')}
                        </Label>
                        <Select value={selectedProduct} onValueChange={onSelect}>
                            <SelectTrigger className="w-full h-12">
                                <SelectValue placeholder={t('select_product') || 'Select Product...'} />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                                {filteredProducts.map(p => (
                                    <SelectItem key={p.id} value={p.id} className="py-3">
                                        <div className="flex flex-col">
                                            <span className="font-medium">{p.name}</span>
                                            {p.variants.length > 0 && (
                                                <span className="text-xs text-muted-foreground">
                                                    {p.variants.length} variants
                                                </span>
                                            )}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Info */}
                    <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg text-sm">
                        <p className="text-blue-800 dark:text-blue-200">
                            ℹ️ {t('select_product_tip') || 'Select the product that matches all scanned barcodes.'}
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
                        disabled={!selectedProduct}
                        size="lg"
                    >
                        {t('next')}
                        <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default BatchProductStep;
