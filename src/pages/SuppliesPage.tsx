import React, { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { useMediaQuery } from '@/hooks/use-mobile';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/components/ui/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { SupplyVoucher } from '@/types';
import { format } from 'date-fns';
import { Plus, Search, FileEdit, Trash2, Eye, MoreHorizontal, FileText, Calendar, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { InvoiceDetailsDialog } from '@/components/supplies/InvoiceDetailsDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const SuppliesPage = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 1024px)');
  const { t, direction } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => isMobile && setIsSidebarOpen(false);

  // Data
  const [vouchers, setVouchers] = useState<SupplyVoucher[]>([]);
  const [drafts, setDrafts] = useState<SupplyVoucher[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Dialog State
  const [selectedVoucher, setSelectedVoucher] = useState<SupplyVoucher | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [voucherToDelete, setVoucherToDelete] = useState<SupplyVoucher | null>(null);

  const fetchVouchers = async () => {
    setIsLoading(true);
    const supabase = getSupabaseClient();
    if (!supabase) return;

    // Completed Vouchers
    const { data: completed, error: err1 } = await supabase
      .from('supply_vouchers')
      .select(`*, supplier:suppliers(name)`)
      .eq('status', 'completed')
      .order('date', { ascending: false });

    // Drafts
    const { data: draftData, error: err2 } = await supabase
      .from('supply_vouchers')
      .select(`*, supplier:suppliers(name)`)
      .eq('status', 'draft')
      .order('created_at', { ascending: false });

    if (err1 || err2) {
      console.error(err1 || err2);
      toast({ title: t('error'), description: t('error_fetching_data'), variant: "destructive" });
    } else {
      setVouchers(completed as any || []);
      setDrafts(draftData as any || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchVouchers();
  }, []);

  const handleViewDetails = async (voucher: SupplyVoucher) => {
    // Fetch items for this voucher
    const supabase = getSupabaseClient();
    if (!supabase) return;

    toast({ title: t('loading'), description: "Fetching details..." });

    const { data: items, error } = await supabase
      .from('inventory_items')
      .select(`*, product:product_definitions(name)`)
      .eq('supply_voucher_id', voucher.id);

    if (error) {
      toast({ title: t('error'), description: "Failed to load items", variant: "destructive" });
      return;
    }

    // Merge items
    const voucherWithItems = { ...voucher, items: items };
    setSelectedVoucher(voucherWithItems as any);
    setIsDetailsOpen(true);
  };

  const confirmDelete = (voucher: SupplyVoucher) => {
    setVoucherToDelete(voucher);
    setIsDeleteAlertOpen(true);
  };

  const handleDelete = async () => {
    if (!voucherToDelete) return;

    setIsDeleteAlertOpen(false); // Close first
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const { error } = await supabase.from('supply_vouchers').delete().eq('id', voucherToDelete.id);

    if (error) {
      console.error(error);
      toast({ title: t('error'), description: t('delete_failed') || "Failed to delete", variant: "destructive" });
    } else {
      toast({ title: t('success'), description: t('deleted_successfully') || "Deleted successfully" });
      fetchVouchers();
    }
    setVoucherToDelete(null);
  };

  const filteredVouchers = vouchers.filter(v =>
    (v.voucher_number?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (v as any).supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredDrafts = drafts.filter(v =>
    ((v as any).supplier?.name?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  const MobileVoucherCard = ({ voucher, isDraft = false }: { voucher: SupplyVoucher, isDraft?: boolean }) => (
    <Card className="mb-4 shadow-sm border-l-4 border-l-primary">
      <CardContent className="p-4 space-y-3">
        <div className="flex justify-between items-start">
          <div>
            <div className="font-bold text-lg">{voucher.voucher_number || '(No Number)'}</div>
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {voucher.date ? format(new Date(voucher.date), 'dd/MM/yyyy') : '-'}
            </div>
          </div>
          <Badge variant={isDraft ? "secondary" : "outline"}>
            {isDraft ? 'Draft' : voucher.payment_status}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground block text-xs">{t('supplier')}</span>
            <span className="font-medium">{(voucher as any).supplier?.name || '-'}</span>
          </div>
          <div className="text-right">
            <span className="text-muted-foreground block text-xs">{t('total')}</span>
            <span className="font-bold text-green-600 dark:text-green-400">
              {voucher.total_amount?.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t mt-2">
          {!isDraft && (
            <Button variant="outline" size="sm" onClick={() => handleViewDetails(voucher)}>
              <Eye className="h-4 w-4 mr-1" /> {t('view')}
            </Button>
          )}
          {isDraft && (
            <Button variant="default" size="sm" onClick={() => navigate(`/add-supply?draft=${voucher.id}`)}>
              <FileEdit className="h-4 w-4 mr-1" /> {t('resume') || 'Resume'}
            </Button>
          )}
          <Button variant="destructive" size="sm" onClick={() => confirmDelete(voucher)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 pb-20" dir={direction}>
      <Header toggleSidebar={toggleSidebar} />
      <Sidebar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} closeSidebar={closeSidebar} />

      <main className={`pt-20 ${isMobile ? 'px-4' : direction === 'rtl' ? 'pr-72 pl-8' : 'pl-72 pr-8'} transition-all`}>
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">{t('supplies_list')}</h1>
            <Button onClick={() => navigate('/add-supply')}>
              <Plus className="h-4 w-4 mr-2" /> {isMobile ? '' : t('add_new_invoice')}
            </Button>
          </div>

          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
              <TabsTrigger value="all">{t('invoices') || 'Processed'} ({vouchers.length})</TabsTrigger>
              <TabsTrigger value="drafts">{t('drafts') || 'Drafts'} ({drafts.length})</TabsTrigger>
            </TabsList>

            <div className="mt-4 mb-4">
              <div className="relative max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder={t('search') || "Search..."} className="pl-8" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
            </div>

            <TabsContent value="all">
              {isMobile ? (
                <div>
                  {filteredVouchers.map(v => <MobileVoucherCard key={v.id} voucher={v} />)}
                  {filteredVouchers.length === 0 && <div className="text-center py-8 text-muted-foreground">{t('no_vouchers') || 'No invoices found.'}</div>}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>#</TableHead>
                          <TableHead>{t('date')}</TableHead>
                          <TableHead>{t('supplier')}</TableHead>
                          <TableHead>{t('total')}</TableHead>
                          <TableHead>{t('status')}</TableHead>
                          <TableHead className="text-right">{t('actions')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredVouchers.map(v => (
                          <TableRow key={v.id}>
                            <TableCell className="font-mono">{v.voucher_number || '-'}</TableCell>
                            <TableCell>{format(new Date(v.date), 'dd/MM/yyyy')}</TableCell>
                            <TableCell>{(v as any).supplier?.name}</TableCell>
                            <TableCell className="font-bold">{v.total_amount?.toFixed(2)}</TableCell>
                            <TableCell><Badge variant="outline">{v.payment_status}</Badge></TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="sm" onClick={() => handleViewDetails(v)}>
                                  <Eye className="h-4 w-4 text-blue-500" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => confirmDelete(v)}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                                {/* Edit Logic: Needs complex specific logic for reversing stock. Disabled for now for completed. */}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        {filteredVouchers.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8">{t('no_vouchers')}</TableCell></TableRow>}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="drafts">
              {isMobile ? (
                <div>
                  {filteredDrafts.map(d => <MobileVoucherCard key={d.id} voucher={d} isDraft />)}
                  {filteredDrafts.length === 0 && <div className="text-center py-8 text-muted-foreground">{t('no_drafts')}</div>}
                </div>
              ) : (
                <Card className="border-dashed border-2">
                  <CardHeader>
                    <CardTitle>{t('saved_drafts') || 'Saved Drafts'}</CardTitle>
                    <CardDescription>Invoices that haven't been finalized yet.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('date')}</TableHead>
                          <TableHead>{t('supplier')}</TableHead>
                          <TableHead>{t('items')}</TableHead>
                          <TableHead>{t('total')}</TableHead>
                          <TableHead className="text-right">{t('actions')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {drafts.map(d => (
                          <TableRow key={d.id}>
                            <TableCell>{d.created_at ? format(new Date(d.created_at), 'dd/MM/yyyy') : '-'}</TableCell>
                            <TableCell>{(d as any).supplier?.name || 'Unknown'}</TableCell>
                            <TableCell>{(d as any).draft_items ? (Array.isArray((d as any).draft_items) ? (d as any).draft_items.length : 0) : '-'}</TableCell>
                            <TableCell>{d.total_amount?.toFixed(2)}</TableCell>
                            <TableCell className="text-right space-x-2">
                              <Button size="sm" onClick={() => navigate(`/add-supply?draft=${d.id}`)}>
                                <FileEdit className="h-4 w-4 mr-1" /> {t('resume')}
                              </Button>
                              <Button variant="destructive" size="sm" onClick={() => confirmDelete(d)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {drafts.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{t('no_drafts')}</TableCell></TableRow>}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>

        </div>
      </main>

      {/* Invoice Details Dialog */}
      <InvoiceDetailsDialog
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        voucher={selectedVoucher}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('are_you_sure') || "Are you sure?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('delete_voucher_warning') || "This action cannot be undone. This will permanently delete the invoice."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
};

export default SuppliesPage;
