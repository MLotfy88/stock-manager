
import React, { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { useMediaQuery } from '@/hooks/use-mobile';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Plus, Package as PackageIcon, Search, Box, Trash2, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getPackages, deletePackage } from '@/data/operations/packageOperations';
import { Package, PackageItem } from '@/types';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { usePermission } from '@/hooks/usePermission';
import PackageBuilder from '@/components/packages/PackageBuilder';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const PackagesPage = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const isMobile = useMediaQuery('(max-width: 1024px)');
    const { t, direction } = useLanguage();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { canManagePackages } = usePermission();

    const [packages, setPackages] = useState<Package[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'list' | 'create'>('list');

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
    const closeSidebar = () => setIsSidebarOpen(false);

    const loadPackages = async () => {
        try {
            const data = await getPackages();
            setPackages(data);
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        loadPackages();
    }, []);

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm(t('confirm_delete') || 'هل أنت متأكد من الحذف؟')) {
            try {
                await deletePackage(id);
                toast({ title: t('success'), description: t('deleted_successfully') });
                loadPackages();
            } catch (error) {
                toast({ title: t('error'), variant: 'destructive' });
            }
        }
    };

    const handleConsume = (pkg: Package, e: React.MouseEvent) => {
        e.stopPropagation();
        // Transform package items to ConsumptionItemInput format
        const initialItems = pkg.items?.map(item => ({
            id: `pkg_item_${Date.now()}_${Math.random()}`,
            inventory_item_id: '',
            product_definition_id: item.product_definition_id,
            variant: item.variant,
            quantity: item.quantity,
            availableQuantity: 0
        }));

        navigate('/consumption', { state: { initialItems } });
    };

    const filteredPackages = packages.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="page-container" dir={direction}>
            <Header toggleSidebar={toggleSidebar} />
            <Sidebar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} closeSidebar={closeSidebar} />

            <main className={`transition-all duration-300 ${isMobile ? 'px-4' : direction === 'rtl' ? 'pr-72 pl-8' : 'pl-72 pr-8'} pt-6`}>
                <div className="max-w-6xl mx-auto space-y-6">

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="text-3xl font-bold flex items-center gap-3">
                                <PackageIcon className="h-8 w-8 text-primary" />
                                {t('packages_management') || 'إدارة الباقات'}
                            </h1>
                            <p className="text-muted-foreground mt-1">
                                {t('packages_description') || 'إنشاء وتعديل باقات الاستهلاك السريع'}
                            </p>
                        </div>

                        {canManagePackages && viewMode === 'list' && (
                            <Button onClick={() => setViewMode('create')} className="gap-2 shadow-lg hover:shadow-primary/20">
                                <Plus className="h-4 w-4" />
                                {t('create_package') || 'باقة جديدة'}
                            </Button>
                        )}
                        {viewMode === 'create' && (
                            <Button onClick={() => { setViewMode('list'); loadPackages(); }} variant="outline" className="gap-2">
                                {t('back_to_list') || 'عودة للقائمة'}
                            </Button>
                        )}
                    </div>

                    {viewMode === 'create' ? (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <PackageBuilder />
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                                <Input
                                    placeholder={t('search_packages') || 'بحث عن باقة...'}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 h-11 glass-card"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredPackages.map((pkg) => (
                                    <Card key={pkg.id} className="glass-card hover-lift cursor-pointer group">
                                        <CardHeader className="pb-2">
                                            <div className="flex justify-between items-start">
                                                <CardTitle className="text-lg text-primary">{pkg.name}</CardTitle>
                                                <div className="flex gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                                                        title={t('consume_package') || 'استهلاك الباقة'}
                                                        onClick={(e) => handleConsume(pkg, e)}
                                                    >
                                                        <Play className="h-4 w-4" />
                                                    </Button>
                                                    {canManagePackages && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                                            onClick={(e) => handleDelete(pkg.id, e)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="text-sm text-muted-foreground">{pkg.description}</p>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                <Badge variant="secondary" className="gap-1">
                                                    <Box className="h-3 w-3" />
                                                    {pkg.items?.length || 0} {t('items') || 'أصناف'}
                                                </Badge>
                                            </div>
                                            <div className="mt-4 space-y-1">
                                                {pkg.items?.slice(0, 3).map((item, idx) => (
                                                    <div key={idx} className="text-xs text-muted-foreground flex justify-between">
                                                        <span>{item.product_definition?.name}</span>
                                                        <span className="font-mono">x{item.quantity}</span>
                                                    </div>
                                                ))}
                                                {(pkg.items?.length || 0) > 3 && (
                                                    <div className="text-xs text-primary pt-1">
                                                        + {(pkg.items?.length || 0) - 3} {t('more') || 'المزيد'}
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}

                </div>
            </main>
        </div>
    );
};

export default PackagesPage;
