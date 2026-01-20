import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/components/ui/use-toast';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { useMediaQuery } from '@/hooks/use-mobile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Copy, CheckCircle, XCircle, Settings } from 'lucide-react';
import {
    getProcedureTypes,
    getProcedureTemplates,
    createProcedureTemplate,
    updateProcedureTemplate,
    deleteProcedureTemplate,
    toggleTemplateActive,
    createProcedureType,
    updateProcedureType,
    deleteProcedureType,
    ProcedureType,
    ProcedureTemplateWithItems,
    ProcedureTemplateItem
} from '@/data/operations/procedureTemplatesOperations';
import { getProductDefinitions } from '@/data/operations/productDefinitionOperations';
import { ProductDefinition } from '@/types';

const ProcedureTemplatesPage = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const isMobile = useMediaQuery('(max-width: 1024px)');
    const { t, direction } = useLanguage();
    const { toast } = useToast();

    const [procedureTypes, setProcedureTypes] = useState<ProcedureType[]>([]);
    const [templates, setTemplates] = useState<ProcedureTemplateWithItems[]>([]);
    const [products, setProducts] = useState<ProductDefinition[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isTypeDialogOpen, setIsTypeDialogOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<ProcedureTemplateWithItems | null>(null);
    const [editingType, setEditingType] = useState<ProcedureType | null>(null);
    const [typeFormData, setTypeFormData] = useState({ name: '', description: '' });

    // Form state
    const [formData, setFormData] = useState({
        procedure_type_id: '',
        name: '',
        description: '',
        is_active: true
    });
    const [formItems, setFormItems] = useState<Omit<ProcedureTemplateItem, 'id' | 'template_id'>[]>([]);

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
    const closeSidebar = () => { if (isMobile) setIsSidebarOpen(false); };

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [typesData, templatesData, productsData] = await Promise.all([
                getProcedureTypes(),
                getProcedureTemplates(false),
                getProductDefinitions()
            ]);
            setProcedureTypes(typesData);
            setTemplates(templatesData);
            setProducts(productsData);
        } catch (error) {
            toast({ title: t('error'), description: String(error), variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenDialog = (template?: ProcedureTemplateWithItems) => {
        if (template) {
            setEditingTemplate(template);
            setFormData({
                procedure_type_id: template.procedure_type_id,
                name: template.name,
                description: template.description || '',
                is_active: template.is_active
            });
            setFormItems(template.items.map(item => ({
                product_definition_id: item.product_definition_id,
                variant: item.variant,
                default_quantity: item.default_quantity,
                notes: item.notes
            })));
        } else {
            setEditingTemplate(null);
            setFormData({ procedure_type_id: '', name: '', description: '', is_active: true });
            setFormItems([]);
        }
        setIsDialogOpen(true);
    };

    const handleAddItem = () => {
        setFormItems([...formItems, { product_definition_id: '', variant: '', default_quantity: 1, notes: '' }]);
    };

    const handleRemoveItem = (index: number) => {
        setFormItems(formItems.filter((_, i) => i !== index));
    };

    const handleItemChange = (index: number, field: keyof Omit<ProcedureTemplateItem, 'id' | 'template_id'>, value: any) => {
        const newItems = [...formItems];
        newItems[index] = { ...newItems[index], [field]: value };
        setFormItems(newItems);
    };

    const handleSubmit = async () => {
        if (!formData.procedure_type_id || !formData.name) {
            toast({ title: t('error'), description: 'الرجاء ملء الحقول المطلوبة', variant: 'destructive' });
            return;
        }

        try {
            if (editingTemplate) {
                await updateProcedureTemplate(editingTemplate.id, formData, formItems);
                toast({ title: t('success'), description: 'تم تحديث القالب بنجاح' });
            } else {
                await createProcedureTemplate(formData, formItems);
                toast({ title: t('success'), description: 'تم إنشاء القالب بنجاح' });
            }
            setIsDialogOpen(false);
            loadData();
        } catch (error) {
            toast({ title: t('error'), description: String(error), variant: 'destructive' });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('هل أنت متأكد من حذف هذا القالب؟')) return;

        try {
            await deleteProcedureTemplate(id);
            toast({ title: t('success'), description: 'تم حذف القالب بنجاح' });
            loadData();
        } catch (error) {
            toast({ title: t('error'), description: String(error), variant: 'destructive' });
        }
    };

    const handleToggleActive = async (id: string, isActive: boolean) => {
        try {
            await toggleTemplateActive(id, !isActive);
            toast({ title: t('success'), description: isActive ? 'تم تعطيل القالب' : 'تم تفعيل القالب' });
            loadData();
        } catch (error) {
            toast({ title: t('error'), description: String(error), variant: 'destructive' });
        }
    };

    const handleSaveType = async () => {
        if (!typeFormData.name) {
            toast({ title: t('error'), description: 'الرجاء إدخال اسم النوع', variant: 'destructive' });
            return;
        }

        try {
            if (editingType) {
                await updateProcedureType(editingType.id, typeFormData.name, typeFormData.description);
                toast({ title: t('success'), description: 'تم تحديث النوع بنجاح' });
            } else {
                await createProcedureType(typeFormData.name, typeFormData.description);
                toast({ title: t('success'), description: 'تم إنشاء النوع بنجاح' });
            }
            setTypeFormData({ name: '', description: '' });
            setEditingType(null);
            loadData();
        } catch (error) {
            toast({ title: t('error'), description: String(error), variant: 'destructive' });
        }
    };

    const handleDeleteType = async (id: string) => {
        if (!confirm('هل أنت متأكد من حذف هذا النوع؟ سيتم حذف جميع القوالب المرتبطة به!')) return;

        try {
            await deleteProcedureType(id);
            toast({ title: t('success'), description: 'تم حذف النوع بنجاح' });
            loadData();
        } catch (error) {
            toast({ title: t('error'), description: String(error), variant: 'destructive' });
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background dark:from-slate-900 dark:to-slate-950 pb-20" dir={direction}>
            <Header toggleSidebar={toggleSidebar} />
            <Sidebar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} closeSidebar={closeSidebar} />

            <main className={`pt-20 ${isMobile ? 'px-4' : direction === 'rtl' ? 'pr-72 pl-8' : 'pl-72 pr-8'}`}>
                <div className="max-w-6xl mx-auto">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold">قوالب الإجراءات الطبية</h1>
                            <p className="text-muted-foreground">إدارة قوالب المستلزمات حسب نوع الإجراء</p>
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                            <Button onClick={() => handleOpenDialog()} className="flex-1 md:flex-none">
                                <Plus className="h-4 w-4 mr-2" />
                                قالب جديد
                            </Button>
                            <Button variant="outline" onClick={() => setIsTypeDialogOpen(true)} className="flex-1 md:flex-none">
                                <Settings className="h-4 w-4 mr-2" />
                                إدارة الأنواع
                            </Button>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="text-center py-12">جاري التحميل...</div>
                    ) : (
                        <div className="grid gap-6">
                            {procedureTypes.map(type => {
                                const typeTemplates = templates.filter(t => t.procedure_type_id === type.id);
                                return (
                                    <Card key={type.id}>
                                        <CardHeader>
                                            <CardTitle className="flex items-center justify-between">
                                                <span>{type.name}</span>
                                                <Badge variant="outline">{typeTemplates.length} قالب</Badge>
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            {typeTemplates.length === 0 ? (
                                                <p className="text-center text-muted-foreground py-4">لا توجد قوالب</p>
                                            ) : (
                                                <div className="space-y-3">
                                                    {typeTemplates.map(template => (
                                                        <div key={template.id} className="flex items-center justify-between p-4 border rounded-lg">
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2">
                                                                    <h3 className="font-semibold">{template.name}</h3>
                                                                    {template.is_active ? (
                                                                        <Badge variant="default">نشط</Badge>
                                                                    ) : (
                                                                        <Badge variant="secondary">معطل</Badge>
                                                                    )}
                                                                </div>
                                                                {template.description && (
                                                                    <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                                                                )}
                                                                <p className="text-sm text-muted-foreground mt-2">
                                                                    {template.items.length} صنف
                                                                </p>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <Button size="sm" variant="outline" onClick={() => handleOpenDialog(template)}>
                                                                    <Edit className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => handleToggleActive(template.id, template.is_active)}
                                                                >
                                                                    {template.is_active ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                                                                </Button>
                                                                <Button size="sm" variant="destructive" onClick={() => handleDelete(template.id)}>
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>

            {/* Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto p-4 md:p-6">
                    <DialogHeader>
                        <DialogTitle>{editingTemplate ? 'تعديل القالب' : 'قالب جديد'}</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div>
                            <Label>نوع الإجراء *</Label>
                            <Select value={formData.procedure_type_id} onValueChange={(val) => setFormData({ ...formData, procedure_type_id: val })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="اختر نوع الإجراء" />
                                </SelectTrigger>
                                <SelectContent>
                                    {procedureTypes.map(type => (
                                        <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label>اسم القالب *</Label>
                            <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                        </div>

                        <div>
                            <Label>الوصف</Label>
                            <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <Label>المستلزمات</Label>
                                <Button type="button" size="sm" onClick={handleAddItem}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    إضافة صنف
                                </Button>
                            </div>

                            <div className="space-y-4">
                                {formItems.map((item, index) => (
                                    <div key={index} className="flex flex-col md:flex-row gap-4 p-4 border rounded-lg bg-gray-50/50 dark:bg-muted/50 relative">
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => handleRemoveItem(index)}
                                            className="absolute top-2 left-2 md:relative md:top-auto md:left-auto md:self-center text-destructive h-8 w-8"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>

                                        <div className="flex-1 space-y-2">
                                            <Label className="text-xs font-semibold">المنتج</Label>
                                            <Select
                                                value={item.product_definition_id}
                                                onValueChange={(val) => {
                                                    const newItems = [...formItems];
                                                    newItems[index] = {
                                                        ...newItems[index],
                                                        product_definition_id: val,
                                                        variant: ''
                                                    };
                                                    setFormItems(newItems);
                                                }}
                                            >
                                                <SelectTrigger className="bg-white dark:bg-background h-9 w-full">
                                                    <SelectValue placeholder="اختر المنتج" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {products.map(p => (
                                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="flex-1 space-y-2">
                                            <Label className="text-xs font-semibold">المتغير</Label>
                                            <Select
                                                value={item.variant}
                                                onValueChange={(val) => handleItemChange(index, 'variant', val)}
                                                disabled={!item.product_definition_id}
                                            >
                                                <SelectTrigger className="bg-white dark:bg-background h-9 w-full">
                                                    <SelectValue placeholder="اختر المتغير" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {products.find(p => p.id === item.product_definition_id)?.variants.map(v => (
                                                        <SelectItem key={v.name} value={v.name}>{v.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="w-full md:w-24 space-y-2">
                                            <Label className="text-xs font-semibold">الكمية</Label>
                                            <Input
                                                type="number"
                                                min="1"
                                                value={item.default_quantity}
                                                onChange={(e) => handleItemChange(index, 'default_quantity', parseInt(e.target.value))}
                                                className="bg-white dark:bg-background h-9"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>إلغاء</Button>
                            <Button onClick={handleSubmit}>حفظ</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Manage Types Dialog */}
            <Dialog open={isTypeDialogOpen} onOpenChange={setIsTypeDialogOpen}>
                <DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] overflow-y-auto p-4 md:p-6">
                    <DialogHeader>
                        <DialogTitle>إدارة أنواع الإجراءات</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-6">
                        {/* Add/Edit Form */}
                        <div className="p-4 bg-muted/30 rounded-lg space-y-4 border">
                            <h3 className="text-sm font-semibold">{editingType ? 'تعديل نوع' : 'إضافة نوع جديد'}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label>اسم النوع *</Label>
                                    <Input
                                        value={typeFormData.name}
                                        onChange={(e) => setTypeFormData({ ...typeFormData, name: e.target.value })}
                                        placeholder="مثال: قسطرة قلبية"
                                    />
                                </div>
                                <div>
                                    <Label>الوصف</Label>
                                    <Input
                                        value={typeFormData.description}
                                        onChange={(e) => setTypeFormData({ ...typeFormData, description: e.target.value })}
                                        placeholder="وصف اختياري"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2">
                                {editingType && (
                                    <Button variant="ghost" size="sm" onClick={() => {
                                        setEditingType(null);
                                        setTypeFormData({ name: '', description: '' });
                                    }}>
                                        إلغاء التعديل
                                    </Button>
                                )}
                                <Button size="sm" onClick={handleSaveType}>
                                    {editingType ? 'تحديث' : 'إضافة'}
                                </Button>
                            </div>
                        </div>

                        {/* List */}
                        <div className="border rounded-md overflow-hidden">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="whitespace-nowrap">الاسم</TableHead>
                                            <TableHead className="whitespace-nowrap">الوصف</TableHead>
                                            <TableHead className="w-[100px] whitespace-nowrap">إجراءات</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {procedureTypes.map((type) => (
                                            <TableRow key={type.id}>
                                                <TableCell className="font-medium whitespace-nowrap">{type.name}</TableCell>
                                                <TableCell className="min-w-[150px]">{type.description || '-'}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1">
                                                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => {
                                                            setEditingType(type);
                                                            setTypeFormData({ name: type.name, description: type.description || '' });
                                                        }}>
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDeleteType(type.id)}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {procedureTypes.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                                                    لا توجد أنواع مضافة
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ProcedureTemplatesPage;
