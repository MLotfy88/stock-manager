import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { Save } from 'lucide-react';
import { format } from 'date-fns';
import { getManufacturers } from '@/data/operations/manufacturerOperations';

interface CartItem {
    id: string;
    productDefinitionId: string;
    productName: string;
    variant: string;
    barcode: string;
    gtin?: string;
    batchNumber: string;
    expiryDate?: Date;
    quantity: number;
    purchasePrice: number;
    manufacturerId?: string;
    location?: string;
}

interface EditCartItemDialogProps {
    isOpen: boolean;
    onClose: () => void;
    item: CartItem | null;
    onSave: (updatedItem: CartItem) => void;
}

export const EditCartItemDialog: React.FC<EditCartItemDialogProps> = ({
    isOpen,
    onClose,
    item,
    onSave
}) => {
    const { t } = useLanguage();

    const [formData, setFormData] = useState<Partial<CartItem>>({});
    const [manufacturers, setManufacturers] = useState<Array<{ id: string; name: string }>>([]);

    useEffect(() => {
        if (item && isOpen) {
            setFormData({ ...item });
        }
    }, [item, isOpen]);

    useEffect(() => {
        const loadManufacturers = async () => {
            try {
                const data = await getManufacturers();
                setManufacturers(data);
            } catch (error) {
                console.error('Failed to load manufacturers', error);
            }
        };
        if (isOpen) loadManufacturers();
    }, [isOpen]);

    const handleChange = (field: keyof CartItem, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        if (item && formData) {
            onSave({ ...item, ...formData } as CartItem);
            onClose();
        }
    };

    if (!item) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{t('edit_item') || 'Edit Item'}</DialogTitle>
                    <DialogDescription>
                        {t('edit_item_details_desc') || 'Modify the details of the selected item in your cart.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {/* Product & Variant (Read-onlyish or Text Edit) */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>{t('product_name')}</Label>
                            <Input
                                value={formData.productName || ''}
                                onChange={e => handleChange('productName', e.target.value)}
                                className="bg-muted/20"
                            />
                            <p className="text-[10px] text-muted-foreground">
                                * {t('changing_name_warning') || 'Changing name does not change the linked product definition ID.'}
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label>{t('variant')}</Label>
                            <Input
                                value={formData.variant || ''}
                                onChange={e => handleChange('variant', e.target.value)}
                                className="bg-muted/20"
                            />
                        </div>
                    </div>

                    {/* Barcode & GTIN */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>{t('barcode')}</Label>
                            <Input
                                value={formData.barcode || ''}
                                onChange={e => handleChange('barcode', e.target.value)}
                                className="font-mono"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>GTIN</Label>
                            <Input
                                value={formData.gtin || ''}
                                onChange={e => handleChange('gtin', e.target.value)}
                                className="font-mono bg-muted/20"
                            />
                        </div>
                    </div>

                    {/* Batch & Expiry */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>{t('batch_number')}</Label>
                            <Input
                                value={formData.batchNumber || ''}
                                onChange={e => handleChange('batchNumber', e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('expiry_date')}</Label>
                            <Input
                                type="date"
                                value={formData.expiryDate ? format(new Date(formData.expiryDate), 'yyyy-MM-dd') : ''}
                                onChange={e => handleChange('expiryDate', e.target.value ? new Date(e.target.value) : undefined)}
                            />
                        </div>
                    </div>

                    {/* Quantity & Price */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>{t('quantity')}</Label>
                            <Input
                                type="number"
                                value={formData.quantity || 0}
                                onChange={e => handleChange('quantity', parseInt(e.target.value) || 0)}
                                className="text-lg font-bold"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('purchase_price')}</Label>
                            <Input
                                type="number"
                                value={formData.purchasePrice || 0}
                                onChange={e => handleChange('purchasePrice', parseFloat(e.target.value) || 0)}
                            />
                        </div>
                    </div>

                    {/* Manufacturer & Location */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>{t('manufacturer') || 'Manufacturer'}</Label>
                            <Select
                                value={formData.manufacturerId || ''}
                                onValueChange={value => handleChange('manufacturerId', value || undefined)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={t('select_manufacturer') || 'Select manufacturer'} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">{t('none') || 'None'}</SelectItem>
                                    {manufacturers.map(m => (
                                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>{t('location') || 'Location'}</Label>
                            <Input
                                value={formData.location || ''}
                                onChange={e => handleChange('location', e.target.value)}
                                placeholder={t('storage_location') || 'Storage location'}
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>{t('cancel')}</Button>
                    <Button onClick={handleSave}>
                        <Save className="h-4 w-4 mr-2" />
                        {t('save_changes') || 'Save Changes'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
