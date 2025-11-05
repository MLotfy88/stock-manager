import React, { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { useMediaQuery } from '@/hooks/use-mobile';
import { useLanguage } from '@/contexts/LanguageContext';
import { getOnShelfReportData } from '@/data/operations/reportOperations';
import { OnShelfItemStatus, InvoicingStatus } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

const OnShelfReportPage = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { t, direction } = useLanguage();
  const [reportData, setReportData] = useState<OnShelfItemStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const data = await getOnShelfReportData();
        setReportData(data);
      } catch (error) {
        console.error("Failed to fetch on-shelf report data", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => {
    if (isMobile) setIsSidebarOpen(false);
  };

  const getStatusBadge = (status: InvoicingStatus) => {
    switch (status) {
      case 'not_consumed':
        return <Badge variant="secondary">{t('not_consumed')}</Badge>;
      case 'consumed_not_invoiced':
        return <Badge variant="destructive">{t('consumed_not_invoiced')}</Badge>;
      case 'partially_invoiced':
        return <Badge className="bg-yellow-500 text-white">{t('partially_invoiced')}</Badge>;
      case 'fully_invoiced':
        return <Badge className="bg-green-500 text-white">{t('fully_invoiced')}</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="page-container bg-background" dir={direction}>
      <Header toggleSidebar={toggleSidebar} />
      <Sidebar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} closeSidebar={closeSidebar} />
      
      <main className={`${isMobile ? 'px-4' : direction === 'rtl' ? 'pr-72 pl-8' : 'pl-72 pr-8'} transition-all`}>
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">{t('on_shelf_report_nav')}</h1>
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              {t('export_as_csv')}
            </Button>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>{t('on_shelf_items_status')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('product_name')}</TableHead>
                    <TableHead>{t('variant')}</TableHead>
                    <TableHead>{t('batch_number')}</TableHead>
                    <TableHead>{t('supplier')}</TableHead>
                    <TableHead>{t('initial_quantity')}</TableHead>
                    <TableHead>{t('consumed_quantity')}</TableHead>
                    <TableHead>{t('remaining_quantity')}</TableHead>
                    <TableHead>{t('invoicing_status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={8} className="text-center">{t('loading')}...</TableCell></TableRow>
                  ) : reportData.length > 0 ? (
                    reportData.map((item) => (
                      <TableRow key={item.inventory_item_id}>
                        <TableCell>{item.product_name}</TableCell>
                        <TableCell>{item.variant}</TableCell>
                        <TableCell>{item.batch_number}</TableCell>
                        <TableCell>{item.supplier_name}</TableCell>
                        <TableCell>{item.initial_quantity}</TableCell>
                        <TableCell>{item.consumed_quantity}</TableCell>
                        <TableCell>{item.remaining_quantity}</TableCell>
                        <TableCell>{getStatusBadge(item.invoicing_status)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={8} className="text-center">{t('no_data_found')}</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default OnShelfReportPage;
