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
import { getInventoryItems } from '@/data/operations/suppliesOperations';

type GroupBy = 'product' | 'department';

const ConsumptionReportPage = () => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { t, direction } = useLanguage();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [records, setRecords] = useState<ConsumptionRecord[]>([]);
  const [productDefs, setProductDefs] = useState<ProductDefinition[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [groupBy, setGroupBy] = useState<GroupBy>('product');

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [recordsData, defsData, inventoryData] = await Promise.all([
          getConsumptionRecords(),
          getProductDefinitions(),
          getInventoryItems(),
        ]);
        setRecords(recordsData);
        setProductDefs(defsData);
        setInventory(inventoryData);
      } catch (error) {
        console.error("Failed to fetch report data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredData = useMemo(() => {
    let filteredRecords = records;
    if (dateRange?.from) {
      filteredRecords = filteredRecords.filter(r => new Date(r.date) >= dateRange.from!);
    }
    if (dateRange?.to) {
      filteredRecords = filteredRecords.filter(r => new Date(r.date) <= dateRange.to!);
    }
    return filteredRecords;
  }, [dateRange, records]);

  const groupedData = useMemo(() => {
    const groups: { [key: string]: { name: string; totalQuantity: number } } = {};

    filteredData.forEach(record => {
        (record.items || []).forEach(item => {
            let key = '';
            let groupName = '';

            if (groupBy === 'product') {
                const inventoryItem = inventory.find(inv => inv.id === item.inventory_item_id);
                const productDef = productDefs.find(def => def.id === inventoryItem?.product_definition_id);
                key = productDef ? `${productDef.name} - ${inventoryItem?.variant}` : 'Unknown Product';
                groupName = key;
            } else if (groupBy === 'department') {
                key = record.department;
                groupName = record.department || 'Unknown Department';
            }

            if (!groups[key]) {
                groups[key] = { name: groupName, totalQuantity: 0 };
            }
            groups[key].totalQuantity += item.quantity;
        });
    });

    return Object.values(groups).sort((a, b) => b.totalQuantity - a.totalQuantity);
  }, [filteredData, groupBy, inventory, productDefs]);

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
                  <Select value={groupBy} onValueChange={(value) => setGroupBy(value as GroupBy)}>
                    <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder={t('group_by')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="product">{t('group_by_product')}</SelectItem>
                      <SelectItem value="department">{t('group_by_department')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p>Loading...</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{groupBy === 'product' ? t('product') : t('department')}</TableHead>
                        <TableHead className="text-right">{t('total_consumed_quantity')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groupedData.map((group, index) => (
                        <TableRow key={index}>
                          <TableCell>{group.name}</TableCell>
                          <TableCell className="text-right">{group.totalQuantity}</TableCell>
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
