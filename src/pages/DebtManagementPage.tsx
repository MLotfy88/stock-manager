import React, { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { useMediaQuery } from '@/hooks/use-mobile';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { SupplyVoucher, VoucherInstallment } from '@/types';
import { format } from 'date-fns';
import { DollarSign, Calendar, AlertTriangle, Eye, ArrowUpRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const DebtManagementPage = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const isMobile = useMediaQuery('(max-width: 1024px)');
    const { t, direction } = useLanguage();
    const { toast } = useToast();

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
    const closeSidebar = () => isMobile && setIsSidebarOpen(false);

    // Data State
    const [debts, setDebts] = useState<SupplyVoucher[]>([]);
    const [stats, setStats] = useState({ totalPending: 0, overdue: 0, dueThisMonth: 0 });
    const [isLoading, setIsLoading] = useState(true);

    const [selectedVoucher, setSelectedVoucher] = useState<SupplyVoucher | null>(null);

    // Fetch Data
    useEffect(() => {
        fetchDebts();
    }, []);

    const fetchDebts = async () => {
        setIsLoading(true);
        const supabase = getSupabaseClient();
        if (!supabase) return;

        // Fetch vouchers where payment_status != paid
        // And join installments to calc remaining
        const { data, error } = await supabase
            .from('supply_vouchers')
            .select(`
                *,
                supplier:suppliers(name),
                installments:voucher_installments(*)
            `)
            .neq('payment_status', 'paid')
            .order('date', { ascending: false });

        if (error) {
            console.error(error);
            toast({ title: t('error'), description: 'Failed to fetch debts', variant: 'destructive' });
        } else {
            setDebts(data as any);
            calculateStats(data as any);
        }
        setIsLoading(false);
    };

    const calculateStats = (vouchers: SupplyVoucher[]) => {
        let total = 0;
        // Logic to calc stats...
        // For now simple sum of (total_amount - paid_amount)
        vouchers.forEach(v => {
            total += (v.total_amount || 0) - (v.paid_amount || 0);
        });
        setStats({ totalPending: total, overdue: 0, dueThisMonth: 0 }); // Todo: refine logic
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background dark:from-slate-900 dark:to-slate-950 pb-20" dir={direction}>
            <Header toggleSidebar={toggleSidebar} />
            <Sidebar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} closeSidebar={closeSidebar} />
            <main className={`pt-20 ${isMobile ? 'px-4' : direction === 'rtl' ? 'pr-72 pl-8' : 'pl-72 pr-8'} transition-all`}>
                <div className="max-w-7xl mx-auto space-y-6">
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <DollarSign className="h-6 w-6 text-primary" />
                        {t('debt_management') || 'Debt Management'}
                    </h1>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Pending Debt</CardTitle>
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.totalPending.toFixed(2)}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Due This Month</CardTitle>
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.dueThisMonth.toFixed(2)}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Overdue</CardTitle>
                                <AlertTriangle className="h-4 w-4 text-destructive" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-destructive">{stats.overdue.toFixed(2)}</div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Vouchers Table */}
                    <Card>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Voucher #</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Supplier</TableHead>
                                        <TableHead>Total Amount</TableHead>
                                        <TableHead>Paid</TableHead>
                                        <TableHead>Remaining</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {debts.map(v => {
                                        const remaining = (v.total_amount || 0) - (v.paid_amount || 0);
                                        return (
                                            <TableRow key={v.id}>
                                                <TableCell>{v.voucher_number || '-'}</TableCell>
                                                <TableCell>{format(new Date(v.date), 'dd/MM/yyyy')}</TableCell>
                                                <TableCell>{(v as any).supplier?.name}</TableCell>
                                                <TableCell>{v.total_amount?.toFixed(2)}</TableCell>
                                                <TableCell>{v.paid_amount?.toFixed(2)}</TableCell>
                                                <TableCell className="font-bold text-red-600">{remaining.toFixed(2)}</TableCell>
                                                <TableCell>
                                                    <Badge variant={v.payment_status === 'overdue' ? "destructive" : "secondary"}>
                                                        {v.payment_status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Button variant="ghost" size="sm" onClick={() => setSelectedVoucher(v)}>
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                    {debts.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-center h-24 text-muted-foreground">
                                                No pending debts found.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* Details Dialog */}
                    <Dialog open={!!selectedVoucher} onOpenChange={(open) => !open && setSelectedVoucher(null)}>
                        <DialogContent className="max-w-2xl">
                            <DialogHeader>
                                <DialogTitle>Debt Details: {selectedVoucher?.voucher_number}</DialogTitle>
                            </DialogHeader>
                            {/* Detailed Installments View here */}
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <span className="text-sm font-muted-foreground">Supplier:</span>
                                        <p className="font-semibold">{(selectedVoucher as any)?.supplier?.name}</p>
                                    </div>
                                    <div>
                                        <span className="text-sm font-muted-foreground">Date:</span>
                                        <p>{selectedVoucher?.date}</p>
                                    </div>
                                </div>
                                <h3 className="font-semibold border-b pb-2">Installments</h3>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Due Date</TableHead>
                                            <TableHead>Amount</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {selectedVoucher?.installments?.map(i => (
                                            <TableRow key={i.id}>
                                                <TableCell>{i.due_date}</TableCell>
                                                <TableCell>{i.amount}</TableCell>
                                                <TableCell>{i.status}</TableCell>
                                                <TableCell>
                                                    {i.status !== 'paid' && (
                                                        <Button size="sm" variant="outline">Mark Paid</Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                {/* Images */}
                                {selectedVoucher?.invoice_image_urls && selectedVoucher.invoice_image_urls.length > 0 && (
                                    <div className="mt-4">
                                        <h3 className="font-semibold mb-2">Invoice Images</h3>
                                        <div className="flex gap-2 overflow-x-auto pb-2">
                                            {selectedVoucher.invoice_image_urls.map((url, i) => (
                                                <a href={url} target="_blank" key={i} className="block w-24 h-32 border rounded overflow-hidden">
                                                    <img src={url} className="w-full h-full object-cover" />
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </main>
        </div>
    );
};

export default DebtManagementPage;
