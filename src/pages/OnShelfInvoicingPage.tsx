import React, { useState, useEffect, useMemo } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { useMediaQuery } from '@/hooks/use-mobile';
import { useLanguage } from '@/contexts/LanguageContext';
import { getOnShelfInvoiceItems } from '@/data/operations/reportOperations';
import { OnShelfInvoiceItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { groupBy } from 'lodash';
import { createOnShelfInvoice } from '@/data/operations/voucherOperations';
import { useToast } from '@/components/ui/use-toast';

const OnShelfInvoicingPage = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 1024px)');
  const { t, direction } = useLanguage();
  const { toast } = useToast();
  const [invoiceItems, setInvoiceItems] = useState<OnShelfInvoiceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState<Record<string, boolean>>({});

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const data = await getOnShelfInvoiceItems();
      setInvoiceItems(data);
    } catch (error) {
      console.error("Failed to fetch on-shelf invoice items", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const groupedBySupplier = useMemo(() => {
    return groupBy(invoiceItems, 'supplier_name');
  }, [invoiceItems]);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => {
    if (isMobile) setIsSidebarOpen(false);
  };

  const handleSelectItem = (id: string) => {
    setSelectedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSelectAllForSupplier = (supplierName: string, items: OnShelfInvoiceItem[]) => {
    const allSelected = items.every(item => selectedItems[item.consumption_item_id]);
    const newSelectedItems = { ...selectedItems };
    items.forEach(item => {
      newSelectedItems[item.consumption_item_id] = !allSelected;
    });
    setSelectedItems(newSelectedItems);
  };

  const calculateSupplierTotal = (items: OnShelfInvoiceItem[]) => {
    return items.reduce((total, item) => {
      return selectedItems[item.consumption_item_id] ? total + (item.total_cost || 0) : total;
    }, 0).toFixed(2);
  };

  const handleCreateInvoice = async (supplierName: string, items: OnShelfInvoiceItem[]) => {
    const selectedIds = items
      .filter(item => selectedItems[item.consumption_item_id])
      .map(item => item.consumption_item_id);

    if (selectedIds.length === 0) {
      toast({
        title: t('error'),
        description: t('please_select_items_to_invoice'),
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(prev => ({ ...prev, [supplierName]: true }));
    try {
      await createOnShelfInvoice(selectedIds);
      toast({
        title: t('success'),
        description: t('invoice_created_successfully'),
      });
      // Refresh data
      fetchData();
      // Clear selection for this supplier
      const newSelectedItems = { ...selectedItems };
      selectedIds.forEach(id => delete newSelectedItems[id]);
      setSelectedItems(newSelectedItems);
    } catch (error) {
      toast({
        title: t('error'),
        description: t('failed_to_create_invoice'),
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(prev => ({ ...prev, [supplierName]: false }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background dark:from-slate-900 dark:to-slate-950 pb-20" dir={direction}>
      <Header toggleSidebar={toggleSidebar} />
      <Sidebar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} closeSidebar={closeSidebar} />

      <main className={`${isMobile ? 'px-4' : direction === 'rtl' ? 'pr-72 pl-8' : 'pl-72 pr-8'} transition-all`}>
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">{t('on_shelf_invoicing')}</h1>

          {isLoading ? (
            <p>{t('loading')}...</p>
          ) : Object.keys(groupedBySupplier).length === 0 ? (
            <p>{t('no_data_found')}</p>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedBySupplier).map(([supplierName, items]) => (
                <Card key={supplierName}>
                  <CardHeader>
                    <CardTitle>{supplierName}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isMobile ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b">
                          <Checkbox
                            checked={items.every(item => selectedItems[item.consumption_item_id])}
                            onCheckedChange={() => handleSelectAllForSupplier(supplierName, items)}
                            id={`select-all-${supplierName}`}
                          />
                          <label htmlFor={`select-all-${supplierName}`} className="text-sm font-medium cursor-pointer">
                            {t('select_all')}
                          </label>
                        </div>
                        {items.map((item) => (
                          <div
                            key={item.consumption_item_id}
                            className={`p-4 border rounded-lg shadow-sm transition-colors cursor-pointer ${selectedItems[item.consumption_item_id] ? 'bg-primary/5 border-primary/30' : 'bg-white'}`}
                            onClick={() => handleSelectItem(item.consumption_item_id)}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-start gap-3">
                                <Checkbox
                                  checked={!!selectedItems[item.consumption_item_id]}
                                  onCheckedChange={() => handleSelectItem(item.consumption_item_id)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="mt-1"
                                />
                                <div>
                                  <h3 className="font-bold text-base leading-tight">{item.product_name}</h3>
                                  <p className="text-sm text-muted-foreground">{item.variant}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-muted-foreground">{new Date(item.consumption_date).toLocaleDateString()}</p>
                                <p className="text-xs font-medium text-primary-foreground bg-primary px-1.5 py-0.5 rounded mt-1 inline-block">
                                  {t(`${item.department}_dept`)}
                                </p>
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2 pt-3 border-t text-xs">
                              <div>
                                <p className="text-muted-foreground mb-0.5">{t('batch')}</p>
                                <p className="font-medium truncate">{item.batch_number}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-muted-foreground mb-0.5">{t('quantity')}</p>
                                <p className="font-bold">{item.consumed_quantity}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-muted-foreground mb-0.5">{t('total')}</p>
                                <p className="font-bold text-primary">{item.total_cost?.toFixed(2)}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>
                              <Checkbox
                                checked={items.every(item => selectedItems[item.consumption_item_id])}
                                onCheckedChange={() => handleSelectAllForSupplier(supplierName, items)}
                              />
                            </TableHead>
                            <TableHead>{t('consumption_date')}</TableHead>
                            <TableHead>{t('department')}</TableHead>
                            <TableHead>{t('product_name')}</TableHead>
                            <TableHead>{t('variant')}</TableHead>
                            <TableHead>{t('batch_number')}</TableHead>
                            <TableHead>{t('consumed_quantity')}</TableHead>
                            <TableHead>{t('unit_price')}</TableHead>
                            <TableHead>{t('total_cost')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map((item) => (
                            <TableRow key={item.consumption_item_id} className={selectedItems[item.consumption_item_id] ? 'bg-primary/5' : ''}>
                              <TableCell>
                                <Checkbox
                                  checked={!!selectedItems[item.consumption_item_id]}
                                  onCheckedChange={() => handleSelectItem(item.consumption_item_id)}
                                />
                              </TableCell>
                              <TableCell>{new Date(item.consumption_date).toLocaleDateString()}</TableCell>
                              <TableCell>{t(`${item.department}_dept`)}</TableCell>
                              <TableCell className="font-medium">{item.product_name}</TableCell>
                              <TableCell>{item.variant}</TableCell>
                              <TableCell>{item.batch_number}</TableCell>
                              <TableCell>{item.consumed_quantity}</TableCell>
                              <TableCell>{item.purchase_price?.toFixed(2)}</TableCell>
                              <TableCell className="font-bold">{item.total_cost?.toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                  <CardFooter className="flex justify-end items-center gap-4">
                    <span className="font-bold">{t('total')}: {calculateSupplierTotal(items)}</span>
                    <Button
                      disabled={!Object.values(selectedItems).some(v => v) || isSubmitting[supplierName]}
                      onClick={() => handleCreateInvoice(supplierName, items)}
                    >
                      {isSubmitting[supplierName] ? t('creating_invoice') : t('create_invoice')}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default OnShelfInvoicingPage;
