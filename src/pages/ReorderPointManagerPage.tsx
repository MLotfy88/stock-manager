import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Search, Save, Filter } from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { ProductDefinition, ProductVariant } from '@/types';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

export default function ReorderPointManagerPage() {
    const { t, language } = useLanguage();
    const { toast } = useToast();
    const [products, setProducts] = useState<ProductDefinition[]>([]);
    const [loading, setLoading] = useState(true);
    const [supplyTypes, setSupplyTypes] = useState<{ id: string, name: string, name_en?: string }[]>([]);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedType, setSelectedType] = useState<string>('all');

    useEffect(() => {
        fetchData();
    }, [language]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const supabase = getSupabaseClient();
            if (!supabase) return;

            // Fetch Types
            const { data: types } = await supabase.from('supply_types').select('*');
            if (types) setSupplyTypes(types);

            // Fetch Products (with supply_type just in case we need nested data, but we filter client side for responsiveness or server side?)
            // We'll fetch all ~100 products, it's cheap.
            const { data: prodData, error } = await supabase
                .from('product_definitions')
                .select(`
            *,
            supply_type:supply_types(id, name)
        `)
                .order('name');

            if (error) throw error;
            setProducts(prodData || []);

        } catch (error: any) {
            console.error('Error fetching data:', error);
            toast({
                title: t('error'),
                description: t('fetch_error'),
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateReorderPoint = async (productId: string, variantName: string | null, newValue: number) => {
        try {
            const supabase = getSupabaseClient();
            if (!supabase) return;

            const product = products.find(p => p.id === productId);
            if (!product) return;

            let updatedVariants = [...(product.variants || [])];
            let updatedBaseReorderPoint = product.reorder_point;

            if (variantName) {
                // Update specific variant in the JSON array
                updatedVariants = updatedVariants.map(v =>
                    v.name === variantName ? { ...v, reorder_point: newValue } : v
                );
            } else {
                // Update base reorder point
                updatedBaseReorderPoint = newValue;
            }

            // Optimistic UI Update
            setProducts(prev => prev.map(p =>
                p.id === productId ? { ...p, variants: updatedVariants, reorder_point: updatedBaseReorderPoint } : p
            ));

            // DB Update
            const { error } = await supabase
                .from('product_definitions')
                .update({
                    variants: updatedVariants,
                    reorder_point: updatedBaseReorderPoint
                })
                .eq('id', productId);

            if (error) throw error;

            toast({
                title: t('success'),
                description: t('saved_successfully'),
            });

        } catch (error) {
            console.error('Update error:', error);
            toast({
                title: t('error'),
                description: t('update_failed'),
                variant: 'destructive'
            });
            fetchData(); // Revert on error
        }
    };

    // Flattened list for the table: { product, variantName, currentReorderPoint }
    const rows = products.flatMap(p => {
        const typeLabel = p.supply_type?.name;

        // Filter by Type
        if (selectedType !== 'all' && p.type_id !== selectedType) {
            return [];
        }

        // Filter by Search (Product Name or Variant Name)
        const matchesSearch = (str: string) => str.toLowerCase().includes(searchQuery.toLowerCase());

        if (p.variants && p.variants.length > 0) {
            return p.variants
                .filter(v => matchesSearch(p.name) || matchesSearch(v.name))
                .map(v => ({
                    id: `${p.id}-${v.name}`,
                    productId: p.id,
                    productName: p.name,
                    variantName: v.name,
                    reorderPoint: v.reorder_point,
                    type: typeLabel
                }));
        } else {
            if (!matchesSearch(p.name)) return [];
            return [{
                id: p.id,
                productId: p.id,
                productName: p.name,
                variantName: null, // No specific variant
                reorderPoint: p.reorder_point,
                type: typeLabel
            }];
        }
    });

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t('reorder_point_manager_nav') || 'إدارة نقاط إعادة الطلب'}</h1>
                    <p className="text-muted-foreground">
                        {t('reorder_point_manager_desc') || 'إدارة مستويات المخزون الأدنى لجميع الإمدادات'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={fetchData} disabled={loading}>
                        {loading ? t('loading') : t('refresh')}
                    </Button>
                </div>
            </div>

            {/* Filters - Always visible */}
            <Card className="border-none shadow-sm bg-muted/30">
                <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={t('search_supplies')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 bg-background"
                            />
                        </div>
                        <Select value={selectedType} onValueChange={setSelectedType}>
                            <SelectTrigger className="w-full sm:w-[200px] bg-background">
                                <SelectValue placeholder={t('filter_by_type')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('all_types')}</SelectItem>
                                {supplyTypes.map(type => (
                                    <SelectItem key={type.id} value={type.id}>
                                        {language === 'ar' ? type.name : type.name_en || type.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Mobile Card Layout */}
            <div className="md:hidden space-y-4">
                {rows.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        {t('no_results_found')}
                    </div>
                ) : (
                    rows.map((row) => (
                        <Card key={row.id} className="overflow-hidden">
                            <CardContent className="p-4 space-y-3">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <h4 className="font-bold text-base">{row.productName}</h4>
                                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                                            {row.variantName ? (
                                                <Badge variant="secondary" className="text-xs">{row.variantName}</Badge>
                                            ) : (
                                                <span className="text-xs text-muted-foreground italic">{t('base_item') || 'أساسي'}</span>
                                            )}
                                            {row.type && (
                                                <span className="text-xs text-muted-foreground border-s ps-2 ms-2">{row.type}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4 border-t mt-2">
                                    <ReorderPointRow
                                        row={row}
                                        onUpdate={handleUpdateReorderPoint}
                                        t={t}
                                        mobile={true}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* Desktop Table Layout */}
            <Card className="hidden md:block">
                <CardHeader className="pb-3 border-b mb-2">
                    <CardTitle>{t('supplies_list') || 'قائمة الإمدادات'}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('class')}</TableHead>
                                    <TableHead>{t('product_name')}</TableHead>
                                    <TableHead>{t('variant')}</TableHead>
                                    <TableHead className="w-[150px]">{t('reorder_point')}</TableHead>
                                    <TableHead className="w-[100px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rows.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                            {t('no_results_found')}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    rows.map((row) => (
                                        <ReorderPointRow
                                            key={row.id}
                                            row={row}
                                            onUpdate={handleUpdateReorderPoint}
                                            t={t}
                                            mobile={false}
                                        />
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    <div className="mt-4 text-sm text-muted-foreground text-center">
                        {t('showing_items')}: {rows.length}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// Sub-component for interaction performance
const ReorderPointRow = ({ row, onUpdate, t, mobile = false }: { row: any, onUpdate: any, t: any, mobile?: boolean }) => {
    const [value, setValue] = useState(row.reorderPoint.toString());
    const [isDirty, setIsDirty] = useState(false);

    // Sync if external update happens
    useEffect(() => {
        setValue(row.reorderPoint.toString());
        setIsDirty(false);
    }, [row.reorderPoint]);

    const handleSave = () => {
        const num = parseInt(value);
        if (!isNaN(num) && num >= 0) {
            onUpdate(row.productId, row.variantName, num);
            setIsDirty(false);
        }
    };

    if (mobile) {
        return (
            <div className="flex items-end gap-3">
                <div className="flex-1">
                    <Label className="mb-2 block text-xs font-medium text-muted-foreground">{t('reorder_point')}</Label>
                    <Input
                        type="number"
                        min="0"
                        value={value}
                        onChange={(e) => {
                            setValue(e.target.value);
                            setIsDirty(true);
                        }}
                        className={`h-10 ${isDirty ? "border-amber-500 bg-amber-50 dark:bg-amber-950/20" : ""}`}
                    />
                </div>
                <Button
                    onClick={handleSave}
                    disabled={!isDirty}
                    size="icon"
                    variant={isDirty ? "default" : "secondary"}
                    className={!isDirty ? "opacity-50" : ""}
                >
                    <Save className="h-4 w-4" />
                </Button>
            </div>
        );
    }

    return (
        <TableRow>
            <TableCell className="font-medium text-muted-foreground text-xs">{row.type}</TableCell>
            <TableCell className="font-semibold">{row.productName}</TableCell>
            <TableCell>
                {row.variantName ? (
                    <span className="px-2 py-1 bg-secondary rounded-md text-sm font-medium">
                        {row.variantName}
                    </span>
                ) : (
                    <span className="text-muted-foreground italic text-xs">{t('base_item') || 'أساسي'}</span>
                )}
            </TableCell>
            <TableCell>
                <Input
                    type="number"
                    min="0"
                    value={value}
                    onChange={(e) => {
                        setValue(e.target.value);
                        setIsDirty(true);
                    }}
                    className={isDirty ? "border-amber-500 bg-amber-50 dark:bg-amber-950/20" : ""}
                />
            </TableCell>
            <TableCell>
                {isDirty && (
                    <Button size="sm" onClick={handleSave} variant="ghost" className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-100 dark:hover:bg-green-900/50">
                        <Save className="h-4 w-4" />
                    </Button>
                )}
            </TableCell>
        </TableRow>
    );
};
