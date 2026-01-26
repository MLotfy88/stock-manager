import React, { useState, useMemo, useEffect } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { useMediaQuery } from '@/hooks/use-mobile';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ConsumptionRecord, ProductDefinition, InventoryItem } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DateRange } from 'react-day-picker';
import { DatePickerWithRange } from '@/components/ui/DatePickerWithRange';
import { getConsumptionRecords } from '@/data/operations/consumptionOperations';
import { getProductDefinitions } from '@/data/operations/productDefinitionOperations';

const ConsumptionReportPage = () => {
  const isMobile = useMediaQuery('(max-width: 1024px)');
  const { t, direction } = useLanguage();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [records, setRecords] = useState<ConsumptionRecord[]>([]);
  const [productDefs, setProductDefs] = useState<ProductDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  // New Filters
  const [filters, setFilters] = useState({
    product: 'all',
    variant: 'all'
  });

  // Grouping
  const [groupBy, setGroupBy] = useState<'product' | 'variant'>('variant');

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [recordsData, defsData] = await Promise.all([
          getConsumptionRecords(),
          getProductDefinitions(),
        ]);
        setRecords(recordsData);
        setProductDefs(defsData);
      } catch (error) {
        console.error("Failed to fetch report data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => {
      const newF = { ...prev, [key]: value };
      if (key === 'product') newF.variant = 'all';
      return newF;
    });
  };

  const availableVariants = useMemo(() => {
    if (filters.product === 'all') return [];
    return productDefs.find(d => d.id === filters.product)?.variants.map(v => v.name) || [];
  }, [productDefs, filters.product]);

  const groupedData = useMemo(() => {
    const groups: { [key: string]: { name: string; totalQuantity: number } } = {};

    let filteredRecords = records;

    // Filter by date range
    if (dateRange?.from) {
      filteredRecords = filteredRecords.filter(r => new Date(r.date) >= dateRange.from!);
    }
    if (dateRange?.to) {
      filteredRecords = filteredRecords.filter(r => new Date(r.date) <= dateRange.to!);
    }

    // Process items
    filteredRecords.forEach(record => {
      (record.items || []).forEach(item => {
        const prodId = item.inventory_item?.product_definition_id;
        const variantName = item.inventory_item?.variant;

        // Filter by product
        if (filters.product !== 'all' && prodId !== filters.product) return;

        // Filter by variant
        if (filters.variant !== 'all' && variantName !== filters.variant) return;

        let key = '';
        let groupName = '';

        if (groupBy === 'product') {
          key = prodId || 'unknown';
          groupName = item.inventory_item?.product_definition?.name || 'Unknown Product';
        } else {
          // Variant grouping (default)
          key = item.inventory_item ? `${prodId}-${variantName}` : 'Unknown';
          groupName = item.inventory_item ? `${item.inventory_item.product_definition?.name} - ${variantName}` : 'Unknown Product';
        }

        if (!groups[key]) {
          groups[key] = { name: groupName, totalQuantity: 0 };
        }
        groups[key].totalQuantity += item.quantity;
      });
    });

    return Object.values(groups).sort((a, b) => b.totalQuantity - a.totalQuantity);
  }, [dateRange, records, filters, groupBy]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background dark:from-slate-900 dark:to-slate-950 pb-20" dir={direction}>
      <Header toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
      <Sidebar
        isSidebarOpen={isSidebarOpen}
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        closeSidebar={() => setIsSidebarOpen(false)}
      />
      <main className={`pt-20 transition-all ${isMobile ? 'px-4' : direction === 'rtl' ? 'pr-72 pl-8' : 'pl-72 pr-8'}`}>
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">{t('consumption_report_nav')}</h1>
          <Card>
            <CardHeader>
              <div className="flex flex-col space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                  <CardTitle>{t('consumption_analysis')}</CardTitle>
                  <DatePickerWithRange date={dateRange} setDate={setDateRange} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/30 p-4 rounded-lg border border-dashed">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{t('filter_by_product')}</Label>
                    <Select value={filters.product} onValueChange={(v) => handleFilterChange('product', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('all_product_types')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('all_product_types')}</SelectItem>
                        {productDefs.map(def => (
                          <SelectItem key={def.id} value={def.id}>{def.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{filters.product === 'all' ? t('select_product_first') : t('filter_by_variant')}</Label>
                    <Select value={filters.variant} onValueChange={(v) => handleFilterChange('variant', v)} disabled={filters.product === 'all'}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('select_variant')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('all_variants')}</SelectItem>
                        {availableVariants.map(v => (
                          <SelectItem key={v} value={v}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{t('group_by')}</Label>
                    <Select value={groupBy} onValueChange={(v: any) => setGroupBy(v)}>
                      <SelectTrigger className="bg-primary/5 border-primary/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="variant">{t('variant')}</SelectItem>
                        <SelectItem value="product">{t('product')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                </div>
              ) : isMobile ? (
                <div className="space-y-3">
                  {groupedData.length > 0 ? (
                    groupedData.map((group, index) => (
                      <Card key={index} className="p-4 border shadow-sm flex justify-between items-center">
                        <div className="flex-1">
                          <h3 className="font-bold text-base leading-tight">{group.name}</h3>
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-muted-foreground text-[10px] uppercase tracking-wider mb-0.5">{t('quantity')}</p>
                          <p className="text-xl font-black text-primary">{group.totalQuantity}</p>
                        </div>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-10 text-muted-foreground border rounded-lg bg-gray-50">
                      {t('no_consumption_records_found')}
                    </div>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="min-w-[800px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>{groupBy === 'product' ? t('product') : t('product_variant')}</TableHead>
                        <TableHead className="text-right">{t('total_consumed_quantity')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groupedData.length > 0 ? (
                        groupedData.map((group, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{group.name}</TableCell>
                            <TableCell className="text-right font-bold text-lg">{group.totalQuantity}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow><TableCell colSpan={2} className="text-center h-24 text-muted-foreground">{t('no_data')}</TableCell></TableRow>
                      )}
                    </TableBody>
                    <tfoot className="bg-gray-50 font-bold">
                      <TableRow>
                        <TableCell>{t('total')}</TableCell>
                        <TableCell className="text-right">{groupedData.reduce((acc, curr) => acc + curr.totalQuantity, 0)}</TableCell>
                      </TableRow>
                    </tfoot>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default ConsumptionReportPage;
