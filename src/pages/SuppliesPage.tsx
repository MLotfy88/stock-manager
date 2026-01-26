import React, { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { useMediaQuery } from '@/hooks/use-mobile';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/components/ui/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'; // Shadcn Tabs
import { getSupabaseClient } from '@/lib/supabaseClient';
import { SupplyVoucher } from '@/types';
import { format } from 'date-fns';
import { Plus, Search, FileEdit, Trash2, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';

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
      toast({ title: "Error", description: "Failed to load vouchers", variant: "destructive" });
    } else {
      setVouchers(completed as any || []);
      setDrafts(draftData as any || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchVouchers();
  }, []);

  const handleDeleteDraft = async (id: string) => {
    if (!confirm("Delete this draft permanently?")) return;

    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.from('supply_vouchers').delete().eq('id', id);
    if (error) {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    } else {
      toast({ title: "Deleted", description: "Draft removed" });
      fetchVouchers();
    }
  };

  const filteredVouchers = vouchers.filter(v =>
    v.voucher_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (v as any).supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase())
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
              <Plus className="h-4 w-4 mr-2" /> {t('add_new_invoice')}
            </Button>
          </div>

          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
              <TabsTrigger value="all">Processed Invoices ({vouchers.length})</TabsTrigger>
              <TabsTrigger value="drafts">Drafts ({drafts.length})</TabsTrigger>
            </TabsList>

            <div className="mt-4 mb-4">
              <div className="relative max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search..." className="pl-8" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
            </div>

            <TabsContent value="all">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Voucher #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredVouchers.map(v => (
                        <TableRow key={v.id}>
                          <TableCell>{v.voucher_number}</TableCell>
                          <TableCell>{format(new Date(v.date), 'dd/MM/yyyy')}</TableCell>
                          <TableCell>{(v as any).supplier?.name}</TableCell>
                          <TableCell>{v.total_amount?.toFixed(2)}</TableCell>
                          <TableCell><Badge variant="outline">{v.payment_status}</Badge></TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm">Details</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredVouchers.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8">No invoices found.</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="drafts">
              <Card className="border-dashed border-2">
                <CardHeader>
                  <CardTitle>Saved Drafts</CardTitle>
                  <CardDescription>Invoices that haven't been finalized yet.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Last Modified</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Items Count</TableHead>
                        <TableHead>Total Value</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {drafts.map(d => (
                        <TableRow key={d.id}>
                          <TableCell>{d.created_at ? format(new Date(d.created_at), 'dd/MM/yyyy HH:mm') : '-'}</TableCell>
                          <TableCell>{(d as any).supplier?.name || 'Unknown'}</TableCell>
                          <TableCell>{Array.isArray(d.draft_items) ? d.draft_items.length : 0}</TableCell>
                          <TableCell>{d.total_amount?.toFixed(2)}</TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button size="sm" onClick={() => navigate(`/add-supply?draft=${d.id}`)}>
                              <FileEdit className="h-4 w-4 mr-1" /> Resume
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => handleDeleteDraft(d.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {drafts.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No drafts saved.</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

        </div>
      </main>
    </div>
  );
};

export default SuppliesPage;
