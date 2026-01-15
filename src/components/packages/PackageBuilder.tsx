
import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ProductDefinition, PackageItem } from '@/types';
import { getProductDefinitions } from '@/data/operations/productDefinitionOperations';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Save, Package as PackageIcon, Box } from 'lucide-react';
import { createPackage } from '@/data/operations/packageOperations';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';

const PackageBuilder = () => {
    const { t, direction } = useLanguage();
    const { toast } = useToast();
    const navigate = useNavigate();

    const [products, setProducts] = useState<ProductDefinition[]>([]);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [items, setItems] = useState<Omit<PackageItem, 'id' | 'package_id'>[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const loadProducts = async () => {
            const data = await getProductDefinitions();
            setProducts(data);
        };
        loadProducts();
    }, []);

    const addItem = () => {
        setItems([...items, { product_definition_id: '', variant: '', quantity: 1 }]);
    };

    const removeItem = (index: number) => {
        const newItems = [...items];
        newItems.splice(index, 1);
        setItems(newItems);
    };

    const updateItem = (index: number, field: keyof Omit<PackageItem, 'id' | 'package_id'>, value: any) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    const handleSave = async () => {
        if (!name.trim()) {
            toast({ title: t('error'), description: "يرجى إدخال اسم الباقة / Please enter package name", variant: 'destructive' });
            return;
        }
        if (items.length === 0) {
            toast({ title: t('error'), description: "الباقة فارغة / Package is empty", variant: 'destructive' });
            return;
        }

        setIsSubmitting(true);
        try {
            await createPackage(name, description, items);
            toast({ title: t('success'), description: "تم حفظ الباقة بنجاح / Package saved successfully" });
            navigate('/packages');
        } catch (error) {
            console.error(error);
            toast({ title: t('error'), description: "فشل الحفظ / Save failed", variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6" dir={direction}>
            <Card className="glass-card shadow-lg border-2 border-primary/10">
                <CardHeader className="bg-primary/5 pb-4">
                    <CardTitle className="flex items-center gap-2 text-xl">
                        <PackageIcon className="h-6 w-6 text-primary" />
                        {t('create_new_package') || 'إنشاء باقة جديدة'}
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                    <div className="space-y-2">
                        <Label>{t('package_name') || 'اسم الباقة'}</Label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="مثال: باقة قسطرة تشخيصية / Diagnostic Pack"
                            className="text-lg font-medium"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>{t('description') || 'الوصف'}</Label>
                        <Input
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="وصف مختصر للباقة (اختياري)"
                        />
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-4">
                <div className="flex justify-between items-center px-2">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Box className="h-5 w-5 text-secondary" />
                        {t('package_contents') || 'محتويات الباقة'}
                    </h3>
                    <Button onClick={addItem} variant="outline" size="sm" className="gap-2 hover:bg-primary hover:text-white transition-colors">
                        <Plus className="h-4 w-4" />
                        {t('add_item') || 'إضافة صنف'}
                    </Button>
                </div>

                {items.map((item, index) => (
                    <Card key={index} className="glass-card animate-in slide-in-from-bottom-2 duration-300">
                        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-end">
                            <div className="flex-1 w-full space-y-2">
                                <Label className="text-xs text-muted-foreground">{t('product') || 'المنتج'}</Label>
                                <Select
                                    value={item.product_definition_id}
                                    onValueChange={(val) => updateItem(index, 'product_definition_id', val)}
                                >
                                    <SelectTrigger><SelectValue placeholder={t('select_product')} /></SelectTrigger>
                                    <SelectContent>
                                        {products.map(p => (
                                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="w-full md:w-1/4 space-y-2">
                                <Label className="text-xs text-muted-foreground">{t('variant') || 'المتغير'}</Label>
                                <Input
                                    value={item.variant}
                                    onChange={(e) => updateItem(index, 'variant', e.target.value)}
                                    placeholder="e.g. 6F, 2.5mm"
                                />
                            </div>

                            <div className="w-full md:w-24 space-y-2">
                                <Label className="text-xs text-muted-foreground">{t('quantity') || 'الكمية'}</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    value={item.quantity}
                                    onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value))}
                                    className="font-bold text-center"
                                />
                            </div>

                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:bg-destructive/10"
                                onClick={() => removeItem(index)}
                            >
                                <Trash2 className="h-5 w-5" />
                            </Button>
                        </CardContent>
                    </Card>
                ))}

                {items.length === 0 && (
                    <div className="text-center py-10 border-2 border-dashed border-muted-foreground/20 rounded-xl bg-muted/5">
                        <Box className="h-10 w-10 text-muted-foreground/50 mx-auto mb-2" />
                        <p className="text-muted-foreground">{t('no_items_in_package') || 'لا توجد أصناف في هذه الباقة'}</p>
                        <Button variant="link" onClick={addItem}>{t('add_first_item') || 'أضف الصنف الأول'}</Button>
                    </div>
                )}
            </div>

            <div className="fixed bottom-24 right-4 md:static md:flex md:justify-end">
                <Button
                    onClick={handleSave}
                    disabled={isSubmitting}
                    size="lg"
                    className="rounded-full shadow-glow md:rounded-lg gap-2"
                >
                    <Save className="h-5 w-5" />
                    {isSubmitting ? (t('saving') || 'جاري الحفظ...') : (t('save_package') || 'حفظ الباقة')}
                </Button>
            </div>
        </div>
    );
};

export default PackageBuilder;
