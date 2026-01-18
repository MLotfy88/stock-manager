
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
            supply_type:supply_types(id, name, name_en)
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
    // If product has variants, each variant is a row.
    // If product has no variants, the product itself is a row (using base reorder_point).
    const rows = products.flatMap(p => {
        // Determine type label for filter matching
        const typeLabel = language === 'ar' ? p.supply_type?.name : (p.supply_type?.name_en || p.supply_type?.name);

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
                    <h1 className="text-3xl font-bold tracking-tight">{t('reorder_point_manager_nav') || 'Reorder Point Manager'}</h1>
                    <p className="text-muted-foreground">
                        {t('reorder_point_manager_desc') || 'Manage minimum stock levels for all supplies'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={fetchData} disabled={loading}>
                        {loading ? 'Refreshing...' : t('refresh')}
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle>{t('filters')}</CardTitle>
                    <div className="flex flex-col sm:flex-row gap-4 mt-2">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={t('search_supplies')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <Select value={selectedType} onValueChange={setSelectedType}>
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder={t('filter_by_type')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('all_types')}</SelectItem>
                                {supplyTypes.map(type => (
                                    <SelectItem key={type.id} value={type.id}>
                                        {language === 'ar' ? type.name : (type.name_en || type.name)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
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
                                        />
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    <div className="mt-4 text-sm text-muted-foreground text-center">
                        Showing {rows.length} items
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// Sub-component for interaction performance
const ReorderPointRow = ({ row, onUpdate, t }: { row: any, onUpdate: any, t: any }) => {
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
                    <span className="text-muted-foreground italic text-xs">{t('base_item') || 'Base'}</span>
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
