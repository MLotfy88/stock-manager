import React, { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { useMediaQuery } from '@/hooks/use-mobile';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { format, parseISO, getMonth, getYear, setYear, startOfYear, endOfYear, eachMonthOfInterval } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, FileText, Check, X, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const DebtCalendarPage = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const isMobile = useMediaQuery('(max-width: 1024px)');
    const { t, direction, language } = useLanguage();
    const { toast } = useToast();

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
    const closeSidebar = () => isMobile && setIsSidebarOpen(false);

    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [installments, setInstallments] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedVoucher, setSelectedVoucher] = useState<any | null>(null);

    const fetchInstallments = async () => {
        setIsLoading(true);
        const supabase = getSupabaseClient();
        if (!supabase) return;

        const { data, error } = await supabase
            .from('voucher_installments')
            .select(`
                *,
                voucher:supply_vouchers (
                    id,
                    voucher_number,
                    date,
                    total_amount,
                    paid_amount,
                    invoice_image_urls,
                    payment_status,
                    supplier:suppliers (name)
                )
            `)
            .order('due_date', { ascending: true });

        if (error) {
            console.error(error);
            toast({ title: t('error'), description: "Failed to load schedule", variant: "destructive" });
        } else {
            setInstallments(data || []);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchInstallments();
    }, []);

    // Generate Month Grid for Current Year
    const months = eachMonthOfInterval({
        start: startOfYear(new Date(currentYear, 0, 1)),
        end: endOfYear(new Date(currentYear, 0, 1))
    });

    const getInstallmentsForMonth = (monthDate: Date) => {
        return installments.filter(i => {
            const d = parseISO(i.due_date);
            return getMonth(d) === getMonth(monthDate) && getYear(d) === getYear(monthDate);
        });
    };

    const handleOpenVoucher = (voucher: any) => {
        setSelectedVoucher(voucher);
    }

    const getInstallmentColor = (inst: any) => {
        if (inst.status === 'paid') return 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800';
        if (new Date(inst.due_date) < new Date()) return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 animate-pulse-slow';
        return 'bg-card border-border';
    };

    const getInstallmentTextColor = (inst: any) => {
        if (inst.status === 'paid') return 'text-green-700 dark:text-green-400';
        if (new Date(inst.due_date) < new Date()) return 'text-red-700 dark:text-red-400';
        return 'text-foreground';
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background dark:from-slate-900 dark:to-slate-950 pb-20" dir={direction}>
            <Header toggleSidebar={toggleSidebar} />
            <Sidebar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} closeSidebar={closeSidebar} />
            <main className={`pt-20 ${isMobile ? 'px-4' : direction === 'rtl' ? 'pr-72 pl-8' : 'pl-72 pr-8'} transition-all`}>
                <div className="max-w-8xl mx-auto space-y-6">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <CalendarIcon className="h-6 w-6 text-primary" />
                            {t('debt_calendar') || 'Debt Calendar'}
                        </h1>

                        <div className="flex items-center gap-4">
                            <div className="flex gap-3 text-xs md:text-sm bg-card p-2 rounded-lg border shadow-sm">
                                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-500 rounded-full"></div> {t('paid') || 'Paid'}</div>
                                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-500 rounded-full"></div> {t('overdue') || 'Overdue'}</div>
                                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-gray-400 rounded-full"></div> {t('upcoming') || 'Future'}</div>
                            </div>

                            <div className="flex items-center gap-4 bg-card p-1 rounded-lg border shadow-sm">
                                <Button variant="ghost" size="icon" onClick={() => setCurrentYear(y => y - 1)}>
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="font-bold text-xl min-w-[80px] text-center">{currentYear}</span>
                                <Button variant="ghost" size="icon" onClick={() => setCurrentYear(y => y + 1)}>
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="text-center py-20">Loading schedule...</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {months.map((month, idx) => {
                                const monthlyItems = getInstallmentsForMonth(month);
                                const totalDue = monthlyItems.reduce((sum, item) => sum + (item.amount || 0), 0);

                                const isPastMonth = month < new Date() && getMonth(month) !== getMonth(new Date());
                                const isCurrentMonth = getMonth(month) === getMonth(new Date()) && getYear(month) === getYear(new Date());

                                return (
                                    <Card
                                        key={idx}
                                        className={`flex flex-col h-full transition-all duration-300
                                            ${isCurrentMonth ? 'border-2 border-primary ring-4 ring-primary/10 shadow-xl scale-[1.02] z-10' : ''} 
                                            ${isPastMonth ? 'opacity-80 bg-muted/30 grayscale-[0.3]' : 'bg-card'}
                                        `}
                                    >
                                        <CardHeader className={`py-3 px-4 flex flex-row items-center justify-between space-y-0 border-b ${isCurrentMonth ? 'bg-primary/5' : 'bg-muted/10'}`}>
                                            <CardTitle className={`text-base font-bold capitalize ${isCurrentMonth ? 'text-primary' : ''}`}>
                                                {format(month, 'MMMM', { locale: language === 'ar' ? ar : undefined })}
                                            </CardTitle>
                                            <Badge variant={isPastMonth && totalDue > 0 ? "destructive" : "secondary"} className="text-xs">
                                                {totalDue > 0 ? totalDue.toLocaleString() : '-'}
                                            </Badge>
                                        </CardHeader>
                                        <CardContent className="flex-1 p-2 overflow-y-auto max-h-[300px] scrollbar-thin">
                                            {monthlyItems.length > 0 ? (
                                                <div className="space-y-2">
                                                    {monthlyItems.map((item, i) => (
                                                        <div
                                                            key={i}
                                                            onClick={(e) => { e.stopPropagation(); handleOpenVoucher(item.voucher); }}
                                                            className={`
                                                                group flex flex-col p-2.5 rounded-lg border cursor-pointer transition-all hover:shadow-md
                                                                ${getInstallmentColor(item)}
                                                            `}
                                                        >
                                                            <div className="flex justify-between items-start">
                                                                <span className="font-semibold text-sm truncate pr-2 w-2/3">
                                                                    {item.voucher?.supplier?.name || "Unknown"}
                                                                </span>
                                                                <span className={`font-bold text-sm whitespace-nowrap ${getInstallmentTextColor(item)}`}>
                                                                    {item.amount?.toLocaleString()}
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between items-end mt-1.5">
                                                                <div className="text-xs text-muted-foreground flex flex-col gap-0.5">
                                                                    <span className="font-medium">{format(parseISO(item.due_date), 'dd MMM')}</span>
                                                                    {item.voucher?.voucher_number && (
                                                                        <span className="text-[10px] opacity-70">#{item.voucher.voucher_number}</span>
                                                                    )}
                                                                </div>
                                                                {item.status === 'paid' ? (
                                                                    <Badge className="bg-green-500 hover:bg-green-600 h-5 px-1.5 text-[10px]">Paid</Badge>
                                                                ) : (
                                                                    <FileText className="h-4 w-4 text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity" />
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="h-full flex flex-col items-center justify-center text-muted-foreground/30 text-xs py-8">
                                                    <span>- No installments -</span>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}

                    {/* Voucher Details & Edit Dialog */}
                    <Dialog open={!!selectedVoucher} onOpenChange={(open) => { if (!open) setSelectedVoucher(null); }}>
                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>{t('voucher_details')}: {selectedVoucher?.voucher_number}</DialogTitle>
                            </DialogHeader>

                            {selectedVoucher && (
                                <InstallmentEditor
                                    voucher={selectedVoucher}
                                    allInstallments={installments}
                                    onUpdate={fetchInstallments}
                                    onClose={() => setSelectedVoucher(null)}
                                />
                            )}
                        </DialogContent>
                    </Dialog>
                </div>
            </main>
        </div>
    );
};

// Sub-component for Editor to handle complex state
const InstallmentEditor = ({ voucher, allInstallments, onUpdate, onClose }: { voucher: any, allInstallments: any[], onUpdate: () => void, onClose: () => void }) => {
    const { t } = useLanguage();
    const { toast } = useToast();
    const supabase = getSupabaseClient();

    // Filter installments for this voucher
    // We must ensure we have ALL installments for this voucher, even if some were not in the main calendar fetch (if any filtering applied)
    // But since calendar fetches all, we just filter by ID.
    const [localInstallments, setLocalInstallments] = useState<any[]>([]);

    useEffect(() => {
        const related = allInstallments
            .filter(i => i.voucher_id === voucher.id)
            .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

        // If deep clone needed:
        setLocalInstallments(JSON.parse(JSON.stringify(related)));
    }, [voucher, allInstallments]);

    // Calculate totals
    const voucherTotal = voucher.total_amount || 0;
    const currentAllocated = localInstallments.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);
    const diff = voucherTotal - currentAllocated;

    // Valid if diff is very small (avoid floating point issues)
    const isValid = Math.abs(diff) < 0.1;

    const handleChange = (index: number, field: string, value: any) => {
        const updated = [...localInstallments];
        updated[index] = { ...updated[index], [field]: value };
        setLocalInstallments(updated);
    };

    const handleAddInstallment = () => {
        if (diff <= 0.1) {
            toast({ title: "No remaining amount", description: "Total is already allocated.", variant: "destructive" });
            return;
        }

        const newInst = {
            id: `new_${Date.now()}`, // Temporary ID
            voucher_id: voucher.id,
            amount: parseFloat(diff.toFixed(2)), // Suggest remaining amount
            due_date: format(new Date(), 'yyyy-MM-dd'),
            status: 'pending',
            notes: '',
            isNew: true
        };
        setLocalInstallments([...localInstallments, newInst]);
    };

    const handleRemoveInstallment = (index: number) => {
        const inst = localInstallments[index];
        if (inst.status === 'paid') return;

        // Mark for deletion if it has a real ID? Or just filter out?
        // Simpler to just filter out for now, and handle deletion in save logic via diff or delete call
        // Actually for existing DB items, we need to explicitly delete them.
        // Let's add a `_deleted` flag if it's existing, or just remove if new.

        const updated = [...localInstallments];
        if (inst.isNew) {
            updated.splice(index, 1);
        } else {
            updated[index] = { ...updated[index], _deleted: true };
        }
        setLocalInstallments(updated);
    };

    const handleSave = async () => {
        if (!isValid) {
            toast({ title: "Validation Error", description: `Total mismatch. Difference: ${diff.toFixed(2)}`, variant: "destructive" });
            return;
        }
        if (!supabase) return;

        try {
            // 1. Handle Deletions
            const toDelete = localInstallments.filter(i => i._deleted && !i.isNew).map(i => i.id);
            if (toDelete.length > 0) {
                await supabase.from('voucher_installments').delete().in('id', toDelete);
            }

            // 2. Handle Upserts (Updates + Inserts)
            const toUpsert = localInstallments
                .filter(i => !i._deleted) // Skip deleted
                .map(inst => {
                    const payload: any = {
                        voucher_id: voucher.id,
                        amount: inst.amount,
                        due_date: inst.due_date,
                        status: inst.status,
                        notes: inst.notes
                    };
                    // Include id if it's not new (if new, leave undefined to let DB generate UUID)
                    if (!inst.isNew) payload.id = inst.id;
                    return payload;
                });

            if (toUpsert.length > 0) {
                const { error } = await supabase.from('voucher_installments').upsert(toUpsert);
                if (error) throw error;
            }

            toast({ title: t('success'), description: "Installments updated successfully" });
            onUpdate(); // Trigger refresh in parent
            onClose();
        } catch (e) {
            console.error(e);
            toast({ title: t('error'), description: "Failed to update", variant: "destructive" });
        }
    };

    // Filter out deleted for display
    const visibleInstallments = localInstallments.filter(i => !i._deleted);

    return (
        <div className="space-y-6">
            {/* Summary Header */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-muted/20 p-4 rounded-lg">
                <div>
                    <Label className="text-xs text-muted-foreground">{t('supplier')}</Label>
                    <p className="font-semibold">{voucher.supplier?.name}</p>
                </div>
                <div>
                    <Label className="text-xs text-muted-foreground">{t('date')}</Label>
                    <p>{format(new Date(voucher.date), 'dd/MM/yyyy')}</p>
                </div>
                <div>
                    <Label className="text-xs text-muted-foreground">{t('total_amount')}</Label>
                    <p className="font-bold text-lg">{voucherTotal.toFixed(2)}</p>
                </div>
                <div>
                    <Label className="text-xs text-muted-foreground">{t('allocated')}</Label>
                    <div className={`font-bold text-lg flex items-center gap-2 ${isValid ? 'text-green-600' : 'text-red-500'}`}>
                        {currentAllocated.toFixed(2)}
                        {!isValid && <AlertCircle className="h-4 w-4" />}
                    </div>
                    {!isValid && <span className="text-xs text-red-500">({diff > 0 ? `Missing ${diff.toFixed(2)}` : `Excess ${Math.abs(diff).toFixed(2)}`})</span>}
                </div>
            </div>

            {/* Editing Table */}
            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[40px]">#</TableHead>
                            <TableHead>{t('due_date')}</TableHead>
                            <TableHead>{t('amount')}</TableHead>
                            <TableHead>{t('status')}</TableHead>
                            <TableHead>{t('notes')}</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {visibleInstallments.map((inst, idx) => (
                            <TableRow key={inst.id || idx} className={inst.status === 'paid' ? 'bg-muted/30' : ''}>
                                <TableCell>{idx + 1}</TableCell>
                                <TableCell>
                                    <Input
                                        type="date"
                                        value={inst.due_date}
                                        onChange={(e) => handleChange(idx, 'due_date', e.target.value)}
                                        disabled={inst.status === 'paid'}
                                        className="h-8 w-[140px]"
                                    />
                                </TableCell>
                                <TableCell>
                                    <Input
                                        type="number"
                                        value={inst.amount}
                                        onChange={(e) => handleChange(idx, 'amount', parseFloat(e.target.value))}
                                        disabled={inst.status === 'paid'}
                                        className={`h-8 w-[120px] ${inst.status === 'paid' ? 'opacity-70' : 'font-bold'}`}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Badge variant={inst.status === 'paid' ? 'default' : 'secondary'}>
                                        {inst.status}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <Input
                                        value={inst.notes || ''}
                                        onChange={(e) => handleChange(idx, 'notes', e.target.value)}
                                        disabled={inst.status === 'paid'}
                                        placeholder="Add notes..."
                                        className="h-8 max-w-[200px]"
                                    />
                                </TableCell>
                                <TableCell>
                                    {inst.status !== 'paid' && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                            onClick={() => handleRemoveInstallment(localInstallments.indexOf(inst))}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {diff > 0.1 && (
                <div className="flex justify-center">
                    <Button type="button" variant="outline" onClick={handleAddInstallment} className="border-dashed border-2">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Remaining ({diff.toFixed(2)})
                    </Button>
                </div>
            )}

            {/* Images Gallery */}
            {voucher.invoice_image_urls && (
                <div className="mt-4">
                    <Label className="mb-2 block">{t('invoice_images')}</Label>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                        {voucher.invoice_image_urls.map((url: string, i: number) => (
                            <a href={url} target="_blank" rel="noopener noreferrer" key={i} className="block w-24 h-32 border rounded overflow-hidden shrink-0 hover:ring-2 ring-primary">
                                <img src={url} className="w-full h-full object-cover" alt="Invoice" />
                            </a>
                        ))}
                    </div>
                </div>
            )}

            <DialogFooter className="gap-2 sm:justify-between">
                <div className="text-xs text-muted-foreground flex items-center">
                    {isValid ? (
                        <span className="text-green-600 flex items-center"><Check className="h-3 w-3 mr-1" /> Amounts match</span>
                    ) : (
                        <span className="text-red-500 flex items-center"><X className="h-3 w-3 mr-1" /> Check Amounts</span>
                    )}
                </div>
                <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={onClose}>{t('cancel')}</Button>
                    <Button type="button" onClick={handleSave} disabled={!isValid}>{t('save_changes')}</Button>
                </div>
            </DialogFooter>
        </div>
    );
};

export default DebtCalendarPage;
