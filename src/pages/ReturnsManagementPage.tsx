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
    const isMobile = useMediaQuery('(max-width: 1024px)');
    const { t, direction, language } = useLanguage();
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
            toast({ title: t('error'), description: t('fill_all_fields'), variant: 'destructive' });
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
            toast({ title: t('success'), description: t('return_registered_successfully') });
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
            toast({ title: t('success'), description: t('status_updated') });
            loadData();
        } catch (error) {
            toast({ title: t('error'), description: String(error), variant: 'destructive' });
        }
    };

    const returnTypeLabels = {
        defective: t('defective'),
        expired: t('expired'),
        damaged: t('damaged'),
        wrong_item: t('wrong_item'),
        other: t('other')
    };

    const statusLabels = {
        pending: t('pending'),
        approved: t('approved'),
        replaced: t('replaced'),
        refunded: t('refunded'),
        rejected: t('rejected')
    };

    const filterReturns = () => {
        if (selectedTab === 'all') return returns;
        return returns.filter(r => r.status === selectedTab);
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background dark:from-slate-900 dark:to-slate-950 pb-20" dir={direction}>
            <Header toggleSidebar={toggleSidebar} />
            <Sidebar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} closeSidebar={closeSidebar} />

            <main className={`pt-20 ${isMobile ? 'px-4' : direction === 'rtl' ? 'pr-72 pl-8' : 'pl-72 pr-8'} transition-all`}>
                <div className="max-w-6xl mx-auto">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold">{t('returns_management')}</h1>
                            <p className="text-muted-foreground">{t('returns_management_desc')}</p>
                        </div>
                        <Button onClick={() => setIsDialogOpen(true)} className="shadow-lg">
                            <Plus className="h-4 w-4 mr-2" />
                            {t('register_return')}
                        </Button>
                    </div>

                    {/* Stats */}
                    {stats && (
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                            <Card className="col-span-1 border-red-100 dark:border-red-900/30">
                                <CardContent className="p-3 md:p-6 flex flex-col items-center justify-center h-full">
                                    <PackageX className="h-5 w-5 md:h-8 md:w-8 mb-2 text-red-600" />
                                    <p className="text-xl md:text-2xl font-bold">{stats.total}</p>
                                    <p className="text-[10px] md:text-sm text-muted-foreground text-center">{t('total_returns')}</p>
                                </CardContent>
                            </Card>

                            <Card className="col-span-1">
                                <CardContent className="p-3 md:p-6 flex flex-col items-center justify-center h-full">
                                    <p className="text-xl md:text-2xl font-bold text-yellow-600">{stats.pending}</p>
                                    <p className="text-[10px] md:text-sm text-muted-foreground text-center">{t('pending')}</p>
                                </CardContent>
                            </Card>

                            <Card className="col-span-1">
                                <CardContent className="p-3 md:p-6 flex flex-col items-center justify-center h-full">
                                    <RefreshCw className="h-5 w-5 md:h-8 md:w-8 mb-2 text-blue-600" />
                                    <p className="text-xl md:text-2xl font-bold">{stats.replaced}</p>
                                    <p className="text-[10px] md:text-sm text-muted-foreground text-center">{t('replaced')}</p>
                                </CardContent>
                            </Card>

                            <Card className="col-span-1">
                                <CardContent className="p-3 md:p-6 flex flex-col items-center justify-center h-full">
                                    <DollarSign className="h-5 w-5 md:h-8 md:w-8 mb-2 text-green-600" />
                                    <p className="text-xl md:text-2xl font-bold">{stats.totalRefundValue.toFixed(0)}</p>
                                    <p className="text-[10px] md:text-sm text-muted-foreground text-center">{t('refund_value')}</p>
                                </CardContent>
                            </Card>

                            <Card className="col-span-2 md:col-span-1">
                                <CardContent className="p-3 md:p-6 flex flex-col items-center justify-center h-full">
                                    <p className="text-xl md:text-2xl font-bold text-red-600">{stats.totalQuantity}</p>
                                    <p className="text-[10px] md:text-sm text-muted-foreground text-center">{t('total_quantity')}</p>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Returns List */}
                    <Card>
                        <CardHeader className="px-4 py-3 border-b mb-3">
                            <CardTitle className="text-lg">{t('returns_list')}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 md:p-6">
                            <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
                                <div className="px-4 md:px-0 overflow-x-auto pb-2 scrollbar-hide">
                                    <TabsList className="mb-2 h-auto flex flex-nowrap justify-start gap-1 bg-transparent p-0 w-max md:w-auto">
                                        <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border bg-background shrink-0">{t('all')} ({stats?.total || 0})</TabsTrigger>
                                        <TabsTrigger value="pending" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-white border bg-background shrink-0">{t('pending')} ({stats?.pending || 0})</TabsTrigger>
                                        <TabsTrigger value="approved" className="data-[state=active]:bg-green-600 data-[state=active]:text-white border bg-background shrink-0">{t('approved')} ({stats?.approved || 0})</TabsTrigger>
                                        <TabsTrigger value="replaced" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white border bg-background shrink-0">{t('replaced')} ({stats?.replaced || 0})</TabsTrigger>
                                    </TabsList>
                                </div>

                                {isLoading ? (
                                    <div className="text-center py-12">{t('loading')}...</div>
                                ) : (
                                    <div className="space-y-3 px-3 md:px-0 pb-3">
                                        {filterReturns().map(returnItem => (
                                            <div key={returnItem.id} className="p-3 md:p-4 border rounded-lg bg-card shadow-sm hover:shadow-md transition-shadow">
                                                <div className="flex flex-col gap-3">
                                                    <div className="w-full">
                                                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2 justify-between">
                                                            <div className="flex flex-col">
                                                                <span className="font-bold text-base md:text-lg break-words">{returnItem.product_name}</span>
                                                                <span className="text-xs text-muted-foreground">{new Date(returnItem.created_at).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}</span>
                                                            </div>
                                                            <div className="flex flex-wrap gap-2">
                                                                <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/20 whitespace-nowrap h-6">{returnItem.variant}</Badge>
                                                                <Badge variant="secondary" className="whitespace-nowrap h-6">{returnTypeLabels[returnItem.return_type]}</Badge>
                                                                <Badge variant={
                                                                    returnItem.status === 'pending' ? 'outline' :
                                                                        returnItem.status === 'approved' ? 'default' :
                                                                            returnItem.status === 'replaced' || returnItem.status === 'refunded' ? 'default' :
                                                                                'destructive'
                                                                } className={returnItem.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800 whitespace-nowrap h-6' : 'whitespace-nowrap h-6'}>
                                                                    {statusLabels[returnItem.status]}
                                                                </Badge>
                                                            </div>
                                                        </div>

                                                        <div className="text-sm text-muted-foreground space-y-2 mt-2">
                                                            <div className="flex justify-between items-center border-b pb-2 border-dashed">
                                                                <span>{t('quantity')}: <strong className="text-foreground">{returnItem.quantity}</strong></span>
                                                                {returnItem.supplier_name && (
                                                                    <span className="truncate max-w-[150px]">{t('supplier')}: {returnItem.supplier_name}</span>
                                                                )}
                                                            </div>
                                                            <div className="bg-muted/50 p-2 rounded text-xs leading-relaxed text-foreground">
                                                                <span className="font-semibold text-muted-foreground block mb-1">{t('reason')}:</span>
                                                                {returnItem.reason}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {returnItem.status === 'pending' && (
                                                        <div className="flex flex-col sm:flex-row gap-2 w-full pt-2 border-t mt-1">
                                                            <Button size="sm" onClick={() => handleUpdateStatus(returnItem.id, 'approved')} className="flex-1 bg-green-600 hover:bg-green-700">
                                                                {t('approve')}
                                                            </Button>
                                                            <div className="flex gap-2 flex-1">
                                                                <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(returnItem.id, 'replaced')} className="flex-1">
                                                                    {t('replace')}
                                                                </Button>
                                                                <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(returnItem.id, 'refunded')} className="flex-1">
                                                                    {t('refund')}
                                                                </Button>
                                                            </div>
                                                            <Button size="sm" variant="destructive" onClick={() => handleUpdateStatus(returnItem.id, 'rejected')} className="flex-1">
                                                                {t('reject')}
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
                <DialogContent className="max-w-[95vw] md:max-w-2xl max-h-[90vh] overflow-y-auto p-4 md:p-6">
                    <DialogHeader>
                        <DialogTitle>{t('register_new_return')}</DialogTitle>
                    </DialogHeader>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
                        <div>
                            <Label className="mb-1 block">{t('product')} *</Label>
                            <Select value={formData.product_definition_id} onValueChange={(val) => setFormData({ ...formData, product_definition_id: val, variant: '' })}>
                                <SelectTrigger className="h-11">
                                    <SelectValue placeholder={t('select_product')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {products.map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label className="mb-1 block">{t('variant')} *</Label>
                            <Select value={formData.variant} onValueChange={(val) => setFormData({ ...formData, variant: val })} disabled={!formData.product_definition_id}>
                                <SelectTrigger className="h-11">
                                    <SelectValue placeholder={t('select_variant')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {products.find(p => p.id === formData.product_definition_id)?.variants.map(v => (
                                        <SelectItem key={v.name} value={v.name}>{v.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label className="mb-1 block">{t('return_type')} *</Label>
                            <Select value={formData.return_type} onValueChange={(val: any) => setFormData({ ...formData, return_type: val })}>
                                <SelectTrigger className="h-11">
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
                            <Label className="mb-1 block">{t('quantity')} *</Label>
                            <Input className="h-11" type="number" min="1" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })} />
                        </div>

                        <div className="md:col-span-2">
                            <Label className="mb-1 block">{t('supplier')}</Label>
                            <Select value={formData.supplier_id} onValueChange={(val) => setFormData({ ...formData, supplier_id: val })}>
                                <SelectTrigger className="h-11">
                                    <SelectValue placeholder={t('select_supplier')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">-- {t('no_supplier')} --</SelectItem>
                                    {suppliers.map(s => (
                                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="md:col-span-2">
                            <Label className="mb-1 block">{t('reason')} *</Label>
                            <Textarea
                                value={formData.reason}
                                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                rows={3}
                                placeholder={t('return_reason_placeholder')}
                                className="min-h-[80px]"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col-reverse md:flex-row justify-end gap-2 mt-2">
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="h-11 md:h-10">{t('cancel')}</Button>
                        <Button onClick={handleCreateReturn} className="h-11 md:h-10">{t('save_return')}</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ReturnsManagementPage;
