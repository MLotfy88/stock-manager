import React, { useState, useMemo } from 'react';
import Header from '../components/layout/Header';
import Sidebar from '../components/layout/Sidebar';
import { useMediaQuery } from '../hooks/use-mobile';
import { useLanguage } from '../contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ConsumptionRecord, ConsumptionItem } from '../types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { DateRange } from 'react-day-picker';
import { DatePickerWithRange } from '../components/ui/DatePickerWithRange';

// MOCK DATA
const MOCK_CONSUMPTION_RECORDS: ConsumptionRecord[] = [
    { id: 'cr1', date: '2025-07-20', department: 'Cardiology', requestedBy: 'Dr. Ali', status: 'completed', items: [
        { id: 'ci1', inventoryItemId: 'inv1', itemName: 'Diagnostic Catheter - L3.5', quantity: 2 },
        { id: 'ci2', inventoryItemId: 'inv2', itemName: 'Balloons - 2.5x10', quantity: 1 },
    ], createdAt: '' },
    { id: 'cr2', date: '2025-07-21', department: 'Surgery', requestedBy: 'Dr. Omar', status: 'completed', items: [
        { id: 'ci3', inventoryItemId: 'inv4', itemName: 'Balloons - 3.0x15', quantity: 3 },
    ], createdAt: '' },
    { id: 'cr3', date: '2025-06-15', department: 'Cardiology', requestedBy: 'Dr. Mona', status: 'completed', items: [
        { id: 'ci4', inventoryItemId: 'inv1', itemName: 'Diagnostic Catheter - L3.5', quantity: 1 },
    ], createdAt: '' },
];
// END MOCK DATA

type GroupBy = 'product' | 'department';

const ConsumptionReportPage = () => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { t, direction } = useLanguage();

  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [groupBy, setGroupBy] = useState<GroupBy>('product');

  const filteredData = useMemo(() => {
    let records = MOCK_CONSUMPTION_RECORDS;
    if (dateRange?.from) {
        records = records.filter(r => new Date(r.date) >= dateRange.from!);
    }
    if (dateRange?.to) {
        records = records.filter(r => new Date(r.date) <= dateRange.to!);
    }
    return records;
  }, [dateRange]);

  const groupedData = useMemo(() => {
    const groups: { [key: string]: { name: string; totalQuantity: number } } = {};

    filteredData.forEach(record => {
        record.items.forEach(item => {
            let key = '';
            let groupName = '';

            if (groupBy === 'product') {
                key = item.itemName;
                groupName = item.itemName;
            } else if (groupBy === 'department') {
                key = record.department;
                groupName = record.department;
            }

            if (!groups[key]) {
                groups[key] = { name: groupName, totalQuantity: 0 };
            }
            groups[key].totalQuantity += item.quantity;
        });
    });

    return Object.values(groups).sort((a, b) => b.totalQuantity - a.totalQuantity);
  }, [filteredData, groupBy]);

  return (
    <div className="page-container bg-background" dir={direction}>
      <Header />
      <Sidebar />
      <main className={`${isMobile ? 'px-4' : direction === 'rtl' ? 'pr-72 pl-8' : 'pl-72 pr-8'} transition-all`}>
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">{t('consumption_rate_report')}</h1>
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <CardTitle>{t('consumption_analysis')}</CardTitle>
                <div className="flex flex-col sm:flex-row gap-4">
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
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default ConsumptionReportPage;
