import React, { useState } from 'react';
import { Package, PackageItem } from '@/types';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle, Package as PackageIcon, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PackageConsumeDialogProps {
    package: Package | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const PackageConsumeDialog: React.FC<PackageConsumeDialogProps> = ({
    package: pkg,
    open,
    onOpenChange,
}) => {
    const { t } = useLanguage();
    const navigate = useNavigate();

    if (!pkg) return null;

    const handleConfirmConsume = () => {
        const initialItems = pkg.items?.map(item => ({
            id: `pkg_item_${Date.now()}_${Math.random()}`,
            inventory_item_id: '',
            product_definition_id: item.product_definition_id,
            variant: item.variant,
            quantity: item.quantity,
            availableQuantity: 0
        }));

        onOpenChange(false);
        navigate('/consumption', { state: { initialItems, packageName: pkg.name } });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <PackageIcon className="h-6 w-6 text-primary" />
                        {t('confirm_package_consumption') || 'تأكيد استهلاك الباقة'}
                    </DialogTitle>
                    <DialogDescription>
                        {t('review_package_items') || 'مراجعة محتويات الباقة قبل التأكيد'}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Package Info */}
                    <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
                        <h3 className="font-bold text-lg text-primary mb-1">{pkg.name}</h3>
                        {pkg.description && (
                            <p className="text-sm text-muted-foreground">{pkg.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary" className="gap-1">
                                {pkg.items?.length || 0} {t('items') || 'أصناف'}
                            </Badge>
                        </div>
                    </div>

                    {/* Items List */}
                    <div className="space-y-2">
                        <h4 className="font-semibold text-sm text-muted-foreground uppercase">
                            {t('package_contents') || 'محتويات الباقة'}
                        </h4>

                        <ScrollArea className="h-[280px] rounded-md border">
                            <div className="p-4 space-y-3">
                                {pkg.items?.map((item, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-start justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-start gap-2">
                                                <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                                                <div>
                                                    <p className="font-medium text-sm leading-tight">
                                                        {item.product_definition?.name || t('unknown_product')}
                                                    </p>
                                                    {item.variant && (
                                                        <p className="text-xs text-muted-foreground mt-1">
                                                            {t('variant')}: <span className="font-mono font-semibold">{item.variant}</span>
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right ml-4">
                                            <Badge variant="outline" className="font-mono text-sm">
                                                ×{item.quantity}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}

                                {(!pkg.items || pkg.items.length === 0) && (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">{t('no_items_in_package') || 'لا توجد أصناف في هذه الباقة'}</p>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </div>

                    {/* Warning Note */}
                    <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-900 rounded-lg p-3">
                        <p className="text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                            <span>
                                {t('package_consume_warning') || 'سيتم خصم جميع الأصناف المذكورة أعلاه من المخزون. يرجى التأكد من صحة البيانات قبل المتابعة.'}
                            </span>
                        </p>
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        {t('cancel') || 'إلغاء'}
                    </Button>
                    <Button
                        onClick={handleConfirmConsume}
                        className="gap-2"
                        disabled={!pkg.items || pkg.items.length === 0}
                    >
                        <CheckCircle className="h-4 w-4" />
                        {t('confirm_consumption') || 'تأكيد الاستهلاك'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
