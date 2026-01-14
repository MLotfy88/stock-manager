import React, { useState, useMemo, useEffect } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { useMediaQuery } from '@/hooks/use-mobile';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConsumptionRecord, ProductDefinition, InventoryItem } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DateRange } from 'react-day-picker';
import { DatePickerWithRange } from '@/components/ui/DatePickerWithRange';
import { getConsumptionRecords } from '@/data/operations/consumptionOperations';
import { getProductDefinitions } from '@/data/operations/productDefinitionOperations';

const ConsumptionReportPage = () => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { t, direction } = useLanguage();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [records, setRecords] = useState<ConsumptionRecord[]>([]);
  const [productDefs, setProductDefs] = useState<ProductDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedProductDefId, setSelectedProductDefId] = useState<string>('all');

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
        // Filter by product definition if one is selected
        if (selectedProductDefId !== 'all' && item.inventory_item?.product_definition_id !== selectedProductDefId) {
          return;
        }

        const key = item.inventory_item ? `${item.inventory_item.product_definition?.name} - ${item.inventory_item.variant}` : 'Unknown Product';
        const groupName = key;

        if (!groups[key]) {
          groups[key] = { name: groupName, totalQuantity: 0 };
        }
        groups[key].totalQuantity += item.quantity;
      });
    });

    return Object.values(groups).sort((a, b) => b.totalQuantity - a.totalQuantity);
  }, [dateRange, records, selectedProductDefId]);

  return (
    <div className="page-container bg-background" dir={direction}>
      <Header toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
      <Sidebar
        isSidebarOpen={isSidebarOpen}
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        closeSidebar={() => setIsSidebarOpen(false)}
      />
      <main className={`${isMobile ? 'px-4' : direction === 'rtl' ? 'pr-72 pl-8' : 'pl-72 pr-8'} transition-all`}>
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">{t('consumption_report_nav')}</h1>
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <CardTitle>{t('consumption_analysis')}</CardTitle>
                <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                  <DatePickerWithRange date={dateRange} setDate={setDateRange} />
                  <Select value={selectedProductDefId} onValueChange={setSelectedProductDefId}>
                    <SelectTrigger className="w-full sm:w-[220px]">
                      <SelectValue placeholder={t('filter_by_product_type')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('all_product_types')}</SelectItem>
                      {productDefs.map(def => (
                        <SelectItem key={def.id} value={def.id}>{def.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                        <TableHead>{t('product_variant')}</TableHead>
                        <TableHead className="text-right">{t('total_consumed_quantity')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groupedData.map((group, index) => (
                        <TableRow key={index}>
                          <TableCell>{group.name}</TableCell>
                          <TableCell className="text-right font-medium">{group.totalQuantity}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
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
