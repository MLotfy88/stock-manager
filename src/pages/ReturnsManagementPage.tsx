import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/components/ui/use-toast';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { useMediaQuery } from '@/hooks/use-mobile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, PackageX, DollarSign, RefreshCw, XCircle } from 'lucide-react';
import {
    getProductReturns,
    createProductReturn,
    updateProductReturnStatus,
    getReturnStats,
    ProductReturnWithDetails
} from '@/data/operations/productReturnsOperations';
import { getProductDefinitions } from '@/data/operations/productDefinitionOperations';
import { getSuppliers } from '@/data/operations/supplierOperations';
import { ProductDefinition, Supplier } from '@/types';

const ReturnsManagementPage = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const isMobile = useMediaQuery('(max-width: 768px)');
    const { t, direction } = useLanguage();
    const { toast } = useToast();

    const [returns, setReturns] = useState<ProductReturnWithDetails[]>([]);
    const [products, setProducts] = useState<ProductDefinition[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedTab, setSelectedTab] = useState('all');

    const [formData, setFormData] = useState({
        product_definition_id: '',
        variant: '',
        return_type: 'defective' as const,
        quantity: 1,
        reason: '',
        supplier_id: '',
        status: 'pending' as const
    });

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
    const closeSidebar = () => { if (isMobile) setIsSidebarOpen(false); };

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [returnsData, productsData, suppliersData, statsData] = await Promise.all([
                getProductReturns(),
                getProductDefinitions(),
                getSuppliers(),
                getReturnStats()
            ]);
            setReturns(returnsData);
            setProducts(productsData);
            setSuppliers(suppliersData);
            setStats(statsData);
        } catch (error) {
            toast({ title: t('error'), description: String(error), variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateReturn = async () => {
        if (!formData.product_definition_id || !formData.variant || !formData.reason) {
            toast({ title: t('error'), description: 'الرجاء ملء جميع الحقول', variant: 'destructive' });
            return;
        }

        try {
            await createProductReturn({
                ...formData,
                inventory_item_id: null,
                photos: null,
                replacement_item_id: null,
                refund_amount: null,
                notes: null,
                created_by: null
            });
            toast({ title: t('success'), description: 'تم تسجيل المرتجع بنجاح' });
            setIsDialogOpen(false);
            setFormData({
                product_definition_id: '',
                variant: '',
                return_type: 'defective',
                quantity: 1,
                reason: '',
                supplier_id: '',
                status: 'pending'
            });
            loadData();
        } catch (error) {
            toast({ title: t('error'), description: String(error), variant: 'destructive' });
        }
    };

    const handleUpdateStatus = async (returnId: string, newStatus: any) => {
        try {
            await updateProductReturnStatus(returnId, newStatus);
            toast({ title: t('success'), description: 'تم تحديث الحالة' });
            loadData();
        } catch (error) {
            toast({ title: t('error'), description: String(error), variant: 'destructive' });
        }
    };

    const returnTypeLabels = {
        defective: 'معيب',
        expired: 'منتهي الصلاحية',
        damaged: 'تالف',
        wrong_item: 'صنف خاطئ',
        other: 'أخرى'
    };

    const statusLabels = {
        pending: 'قيد الانتظار',
        approved: 'موافق عليه',
        replaced: 'تم الاستبدال',
        refunded: 'تم الاسترداد',
        rejected: 'مرفوض'
    };

    const filterReturns = () => {
        if (selectedTab === 'all') return returns;
        return returns.filter(r => r.status === selectedTab);
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-10" dir={direction}>
            <Header toggleSidebar={toggleSidebar} />
            <Sidebar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} closeSidebar={closeSidebar} />

            <main className={`pt-20 ${isMobile ? 'px-4' : direction === 'rtl' ? 'pr-72 pl-8' : 'pl-72 pr-8'}`}>
                <div className="max-w-6xl mx-auto">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold">إدارة المرتجعات</h1>
                            <p className="text-muted-foreground">تتبع المنتجات المرتجعة والمعيبة</p>
                        </div>
                        <Button onClick={() => setIsDialogOpen(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            تسجيل مرتجع
                        </Button>
                    </div>

                    {/* Stats */}
                    {stats && (
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="text-center">
                                        <PackageX className="h-8 w-8 mx-auto mb-2 text-red-600" />
                                        <p className="text-2xl font-bold">{stats.total}</p>
                                        <p className="text-sm text-muted-foreground">إجمالي المرتجعات</p>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="pt-6">
                                    <div className="text-center">
                                        <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                                        <p className="text-sm text-muted-foreground">قيد الانتظار</p>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="pt-6">
                                    <div className="text-center">
                                        <RefreshCw className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                                        <p className="text-2xl font-bold">{stats.replaced}</p>
                                        <p className="text-sm text-muted-foreground">تم الاستبدال</p>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="pt-6">
                                    <div className="text-center">
                                        <DollarSign className="h-8 w-8 mx-auto mb-2 text-green-600" />
                                        <p className="text-2xl font-bold">{stats.totalRefundValue.toFixed(0)}</p>
                                        <p className="text-sm text-muted-foreground">قيمة المستردات</p>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="pt-6">
                                    <div className="text-center">
                                        <p className="text-2xl font-bold text-red-600">{stats.totalQuantity}</p>
                                        <p className="text-sm text-muted-foreground">عدد القطع</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Returns List */}
                    <Card>
                        <CardHeader>
                            <CardTitle>المرتجعات</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Tabs value={selectedTab} onValueChange={setSelectedTab}>
                                <TabsList className="mb-4">
                                    <TabsTrigger value="all">الكل ({stats?.total || 0})</TabsTrigger>
                                    <TabsTrigger value="pending">قيد الانتظار ({stats?.pending || 0})</TabsTrigger>
                                    <TabsTrigger value="approved">موافق ({stats?.approved || 0})</TabsTrigger>
                                    <TabsTrigger value="replaced">مستبدل ({stats?.replaced || 0})</TabsTrigger>
                                    <TabsTrigger value="refunded">مسترد ({stats?.refunded || 0})</TabsTrigger>
                                </TabsList>

                                {isLoading ? (
                                    <div className="text-center py-12">جاري التحميل...</div>
                                ) : (
                                    <div className="space-y-3">
                                        {filterReturns().map(returnItem => (
                                            <div key={returnItem.id} className="p-4 border rounded-lg">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <span className="font-semibold">{returnItem.product_name}</span>
                                                            <Badge variant="outline">{returnItem.variant}</Badge>
                                                            <Badge>{returnTypeLabels[returnItem.return_type]}</Badge>
                                                            <Badge variant={
                                                                returnItem.status === 'pending' ? 'secondary' :
                                                                    returnItem.status === 'approved' ? 'default' :
                                                                        returnItem.status === 'replaced' || returnItem.status === 'refunded' ? 'default' :
                                                                            'destructive'
                                                            }>
                                                                {statusLabels[returnItem.status]}
                                                            </Badge>
                                                        </div>

                                                        <p className="text-sm mb-2"><strong>الكمية:</strong> {returnItem.quantity}</p>
                                                        <p className="text-sm mb-2"><strong>السبب:</strong> {returnItem.reason}</p>
                                                        {returnItem.supplier_name && (
                                                            <p className="text-sm mb-2"><strong>المورد:</strong> {returnItem.supplier_name}</p>
                                                        )}
                                                        <p className="text-xs text-muted-foreground">
                                                            {new Date(returnItem.created_at).toLocaleDateString('ar-EG')}
                                                        </p>
                                                    </div>

                                                    {returnItem.status === 'pending' && (
                                                        <div className="flex gap-2">
                                                            <Button size="sm" onClick={() => handleUpdateStatus(returnItem.id, 'approved')}>
                                                                موافقة
                                                            </Button>
                                                            <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(returnItem.id, 'replaced')}>
                                                                استبدال
                                                            </Button>
                                                            <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(returnItem.id, 'refunded')}>
                                                                استرداد
                                                            </Button>
                                                            <Button size="sm" variant="destructive" onClick={() => handleUpdateStatus(returnItem.id, 'rejected')}>
                                                                رفض
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </Tabs>
                        </CardContent>
                    </Card>
                </div>
            </main>

            {/* Create Return Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>تسجيل مرتجع جديد</DialogTitle>
                    </DialogHeader>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>المنتج *</Label>
                            <Select value={formData.product_definition_id} onValueChange={(val) => setFormData({ ...formData, product_definition_id: val, variant: '' })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="اختر المنتج" />
                                </SelectTrigger>
                                <SelectContent>
                                    {products.map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label>المتغير *</Label>
                            <Select value={formData.variant} onValueChange={(val) => setFormData({ ...formData, variant: val })} disabled={!formData.product_definition_id}>
                                <SelectTrigger>
                                    <SelectValue placeholder="اختر المتغير" />
                                </SelectTrigger>
                                <SelectContent>
                                    {products.find(p => p.id === formData.product_definition_id)?.variants.map(v => (
                                        <SelectItem key={v.name} value={v.name}>{v.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label>نوع المرتجع *</Label>
                            <Select value={formData.return_type} onValueChange={(val: any) => setFormData({ ...formData, return_type: val })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(returnTypeLabels).map(([key, label]) => (
                                        <SelectItem key={key} value={key}>{label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label>الكمية *</Label>
                            <Input type="number" min="1" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })} />
                        </div>

                        <div className="col-span-2">
                            <Label>المورد</Label>
                            <Select value={formData.supplier_id} onValueChange={(val) => setFormData({ ...formData, supplier_id: val })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="اختر المورد" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">-- بدون مورد --</SelectItem>
                                    {suppliers.map(s => (
                                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="col-span-2">
                            <Label>السبب *</Label>
                            <Textarea
                                value={formData.reason}
                                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                rows={3}
                                placeholder="اشرح سبب المرتجع بالتفصيل"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 mt-4">
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>إلغ اء</Button>
                        <Button onClick={handleCreateReturn}>حفظ</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ReturnsManagementPage;
