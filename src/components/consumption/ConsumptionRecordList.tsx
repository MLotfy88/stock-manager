
import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { getConsumptionRecords, deleteConsumptionRecord } from '@/data/operations/consumptionOperations';
import { ConsumptionRecord } from '@/types';
import { Search, Trash2, FileSpreadsheet, Calendar, Package, User, Warehouse } from 'lucide-react';
import { useEffect } from 'react';
import { format } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const ConsumptionRecordList = () => {
  const { t, direction, language } = useLanguage();
  const { toast } = useToast();

  const [records, setRecords] = useState<ConsumptionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stockTypeFilter, setStockTypeFilter] = useState('all');
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);

  const loadRecords = async () => {
    setIsLoading(true);
    try {
      const data = await getConsumptionRecords();
      setRecords(data);
    } catch (error) {
      console.error("Failed to fetch consumption records", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, []);

  // تصفية السجلات
  const filteredRecords = records.filter(record => {
    const matchesSearch = searchQuery === '' ||
      record.requested_by.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (record.approved_by && record.approved_by.toLowerCase().includes(searchQuery.toLowerCase()));

    // بما أن كل سجل يمكن أن يحتوي على أصناف من أنواع مخزون مختلفة،
    // سنقوم بالتحقق مما إذا كان أي صنف في السجل يطابق الفلتر
    const matchesStockType = stockTypeFilter === 'all' ||
      record.items.some(item => item.inventory_item?.stock_type === stockTypeFilter);

    return matchesSearch && matchesStockType;
  });

  // ترتيب السجلات (الأحدث أولاً)
  const sortedRecords = [...filteredRecords].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  // توسيع/طي تفاصيل السجل
  const toggleRecord = (recordId: string) => {
    if (expandedRecordId === recordId) {
      setExpandedRecordId(null);
    } else {
      setExpandedRecordId(recordId);
    }
  };

  // حذف سجل
  const handleDelete = async (recordId: string) => {
    try {
      await deleteConsumptionRecord(recordId);
      toast({
        title: t('success'),
        description: t('record_deleted'),
      });
      loadRecords(); // Reload records after deletion
    } catch (error) {
      toast({
        title: t('error'),
        description: t('delete_failed'),
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>{t('consumption_records')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* المرشحات */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder={t('search_records')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={stockTypeFilter} onValueChange={setStockTypeFilter}>
              <SelectTrigger>
                <div className="flex items-center gap-2">
                  <Warehouse className="h-4 w-4" />
                  <SelectValue placeholder={t('filter_by_stock_type')} />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('all_stock_types')}</SelectItem>
                <SelectItem value="purchased">{t('purchased')}</SelectItem>
                <SelectItem value="on_shelf">{t('on_shelf')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* قائمة السجلات */}
          {sortedRecords.length === 0 ? (
            <div className="text-center py-10 bg-muted/20 border border-dashed rounded-md">
              <FileSpreadsheet className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground font-medium mb-2">{t('no_consumption_records')}</p>
              <p className="text-muted-foreground text-sm">{t('create_first_consumption_record')}</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block border rounded-md overflow-hidden overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('date')}</TableHead>
                      <TableHead>{t('requested_by')}</TableHead>
                      <TableHead>{t('items_count')}</TableHead>
                      <TableHead>{t('notes')}</TableHead>
                      <TableHead>{t('actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedRecords.map(record => (
                      <React.Fragment key={record.id}>
                        <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => toggleRecord(record.id)}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span>{format(new Date(record.date), 'yyyy-MM-dd')}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span>{record.requested_by}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge>
                              {record.items.length} {t('items')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
                              {record.notes || '-'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive hover:text-destructive"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>{t('confirm_delete')}</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      {t('delete_consumption_confirm')}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel onClick={(e) => e.stopPropagation()}>{t('cancel')}</AlertDialogCancel>
                                    <AlertDialogAction
                                      className="bg-destructive text-destructive-foreground"
                                      onClick={(e) => { e.stopPropagation(); handleDelete(record.id); }}
                                    >
                                      {t('delete')}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>

                        {expandedRecordId === record.id && (
                          <TableRow>
                            <TableCell colSpan={5} className="bg-muted/30 p-0">
                              <div className="p-4">
                                <div className="mb-4">
                                  <h4 className="font-medium mb-2">{t('record_details')}</h4>
                                  {record.notes && (
                                    <p className="text-sm text-muted-foreground mb-2">{record.notes}</p>
                                  )}
                                </div>

                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>{t('supply')}</TableHead>
                                      <TableHead>{t('quantity')}</TableHead>
                                      <TableHead>{t('stock_type')}</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {record.items.map((item, index) => (
                                      <TableRow key={index}>
                                        <TableCell>
                                          <div className="flex items-center gap-2">
                                            <Package className="h-4 w-4 text-muted-foreground" />
                                            <span>{item.inventory_item?.product_definition?.name || item.inventory_item_id}</span>
                                          </div>
                                        </TableCell>
                                        <TableCell>
                                          <Badge variant="secondary">
                                            {item.quantity} {t('units')}
                                          </Badge>
                                        </TableCell>
                                        <TableCell>
                                          <Badge variant={item.inventory_item?.stock_type === 'on_shelf' ? 'default' : 'outline'}>
                                            {t(item.inventory_item?.stock_type || 'unknown')}
                                          </Badge>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {sortedRecords.map(record => (
                  <div key={record.id} className="bg-card border rounded-lg shadow-sm overflow-hidden">
                    <div className="p-4 cursor-pointer" onClick={() => toggleRecord(record.id)}>
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{format(new Date(record.date), 'yyyy-MM-dd')}</span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {record.items.length} {t('items')}
                        </Badge>
                      </div>

                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2 font-medium">
                          <User className="h-4 w-4 text-primary" />
                          <span>{record.requested_by}</span>
                        </div>
                      </div>

                      {record.notes && (
                        <div className="text-sm text-muted-foreground bg-muted/20 p-2 rounded mt-2">
                          {record.notes}
                        </div>
                      )}
                    </div>

                    <div className="px-4 pb-4 flex justify-end border-t pt-3 bg-muted/10">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 px-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t('delete')}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t('confirm_delete')}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t('delete_consumption_confirm')}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={(e) => e.stopPropagation()}>{t('cancel')}</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground"
                              onClick={(e) => { e.stopPropagation(); handleDelete(record.id); }}
                            >
                              {t('delete')}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>

                    {/* Expanded Content for Mobile */}
                    {expandedRecordId === record.id && (
                      <div className="bg-muted/30 border-t p-3 space-y-3 animation-slide-down">
                        <h4 className="text-xs font-semibold uppercase text-muted-foreground">{t('record_details')}</h4>
                        <div className="space-y-2">
                          {record.items.map((item, idx) => (
                            <div key={idx} className="bg-background p-2 rounded border flex flex-col gap-1">
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-medium">{item.inventory_item?.product_definition?.name || item.inventory_item_id}</span>
                                <Badge variant="secondary" className="h-5">{item.quantity}</Badge>
                              </div>
                              <div className="flex justify-between items-center text-xs text-muted-foreground">
                                <span>{t('type')}: {t(item.inventory_item?.stock_type || 'unknown')}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ConsumptionRecordList;
