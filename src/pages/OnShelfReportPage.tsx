import React, { useState, useEffect, useMemo } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { useMediaQuery } from '@/hooks/use-mobile';
import { useLanguage } from '@/contexts/LanguageContext';
import { getOnShelfReportData } from '@/data/operations/reportOperations';
import { getSuppliers } from '@/data/operations/supplierOperations';
import { OnShelfItemStatus, InvoicingStatus, Supplier } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const OnShelfReportPage = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 1024px)');
  const { t, direction } = useLanguage();
  const [reportData, setReportData] = useState<OnShelfItemStatus[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSupplier, setSelectedSupplier] = useState('all');

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [data, suppliersData] = await Promise.all([
          getOnShelfReportData(),
          getSuppliers(),
        ]);
        setReportData(data);
        setSuppliers(suppliersData);
      } catch (error) {
        console.error("Failed to fetch on-shelf report data", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredData = useMemo(() => {
    if (selectedSupplier === 'all') {
      return reportData;
    }
    return reportData.filter(item => item.supplier_name === suppliers.find(s => s.id === selectedSupplier)?.name);
  }, [reportData, selectedSupplier, suppliers]);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => {
    if (isMobile) setIsSidebarOpen(false);
  };

  const handleExportCSV = () => {
    const headers = [
      t('product_name'), t('variant'), t('batch_number'), t('supplier'),
      t('initial_quantity'), t('consumed_quantity'), t('remaining_quantity'), t('invoicing_status')
    ];

    const rows = filteredData.map(item => [
      `"${item.product_name.replace(/"/g, '""')}"`,
      `"${item.variant.replace(/"/g, '""')}"`,
      `"${item.batch_number.replace(/"/g, '""')}"`,
      `"${item.supplier_name.replace(/"/g, '""')}"`,
      item.initial_quantity,
      item.consumed_quantity,
      item.remaining_quantity,
      `"${t(item.invoicing_status).replace(/"/g, '""')}"`
    ].join(','));

    const csvContent = "data:text/csv;charset=utf-8,"
      + headers.join(',') + "\n"
      + rows.join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "on_shelf_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <CardTitle>{t('on_shelf_items_status')}</CardTitle>
                <div className="flex items-center gap-4">
                  <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                    <SelectTrigger className="w-full sm:w-[200px]">
                      <SelectValue placeholder={t('filter_by_supplier')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('all_suppliers')}</SelectItem>
                      {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" className="gap-2" onClick={handleExportCSV} disabled={filteredData.length === 0}>
                    <Download className="h-4 w-4" />
                    {t('export_as_csv')}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                </div>
              ) : isMobile ? (
                <div className="space-y-4">
                  {filteredData.length > 0 ? (
                    filteredData.map((item) => (
                      <Card key={item.inventory_item_id} className="p-4 border shadow-sm">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <h3 className="font-bold text-lg leading-tight">{item.product_name}</h3>
                            <p className="text-sm text-muted-foreground">{item.variant}</p>
                          </div>
                          {getStatusBadge(item.invoicing_status)}
                        </div>

                        <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                          <div>
                            <p className="text-muted-foreground text-xs uppercase tracking-wider mb-0.5">{t('batch_number')}</p>
                            <p className="font-medium truncate">{item.batch_number}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs uppercase tracking-wider mb-0.5">{t('supplier')}</p>
                            <p className="font-medium truncate">{item.supplier_name}</p>
                          </div>

                          <div className="bg-gray-50 p-2 rounded border text-center">
                            <p className="text-muted-foreground text-[10px] uppercase tracking-wider mb-0.5">{t('initial_quantity')}</p>
                            <p className="font-bold">{item.initial_quantity}</p>
                          </div>
                          <div className="bg-gray-50 p-2 rounded border text-center">
                            <p className="text-muted-foreground text-[10px] uppercase tracking-wider mb-0.5">{t('consumed_quantity')}</p>
                            <p className="font-bold text-blue-600">{item.consumed_quantity}</p>
                          </div>
                          <div className="col-span-2 bg-primary/5 p-2 rounded border text-center">
                            <p className="text-primary text-[10px] uppercase tracking-wider mb-0.5">{t('remaining_quantity')}</p>
                            <p className="font-black text-lg">{item.remaining_quantity}</p>
                          </div>
                        </div>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-10 text-muted-foreground border rounded-lg bg-gray-50">
                      {t('no_data_found')}
                    </div>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="min-w-[1000px]">
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
                      {filteredData.map((item) => (
                        <TableRow key={item.inventory_item_id}>
                          <TableCell className="font-medium">{item.product_name}</TableCell>
                          <TableCell>{item.variant}</TableCell>
                          <TableCell>{item.batch_number}</TableCell>
                          <TableCell>{item.supplier_name}</TableCell>
                          <TableCell>{item.initial_quantity}</TableCell>
                          <TableCell>{item.consumed_quantity}</TableCell>
                          <TableCell className="font-bold">{item.remaining_quantity}</TableCell>
                          <TableCell>{getStatusBadge(item.invoicing_status)}</TableCell>
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

export default OnShelfReportPage;
