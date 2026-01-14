import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/components/ui/use-toast';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { useMediaQuery } from '@/hooks/use-mobile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Star, AlertCircle, CheckCircle, Plus, TrendingUp, TrendingDown } from 'lucide-react';
import {
    getSupplierPerformanceSummary,
    getSupplierIssues,
    addSupplierIssue,
    resolveSupplierIssue,
    SupplierPerformanceSummary,
    SupplierIssue
} from '@/data/operations/supplierPerformanceOperations';
import { getSuppliers } from '@/data/operations/supplierOperations';
import { Supplier } from '@/types';

const SupplierPerformancePage = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const isMobile = useMediaQuery('(max-width: 768px)');
    const { t, direction } = useLanguage();
    const { toast } = useToast();

    const [performance, setPerformance] = useState<SupplierPerformanceSummary[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [issues, setIssues] = useState<SupplierIssue[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isIssueDialogOpen, setIsIssueDialogOpen] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState<string>('');

    // Issue form
    const [issueForm, setIssueForm] = useState({
        supplier_id: '',
        issue_type: 'quality' as const,
        description: '',
        severity: 3,
        resolved: false
    });

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
    const closeSidebar = () => { if (isMobile) setIsSidebarOpen(false); };

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [perfData, suppliersData, issuesData] = await Promise.all([
                getSupplierPerformanceSummary(),
                getSuppliers(),
                getSupplierIssues()
            ]);
            setPerformance(perfData);
            setSuppliers(suppliersData);
            setIssues(issuesData);
        } catch (error) {
            toast({ title: t('error'), description: String(error), variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddIssue = async () => {
        if (!issueForm.supplier_id || !issueForm.description) {
            toast({ title: t('error'), description: 'الرجاء ملء الحقول المطلوبة', variant: 'destructive' });
            return;
        }

        try {
            await addSupplierIssue(issueForm);
            toast({ title: t('success'), description: 'تم تسجيل المشكلة بنجاح' });
            setIsIssueDialogOpen(false);
            setIssueForm({ supplier_id: '', issue_type: 'quality', description: '', severity: 3, resolved: false });
            loadData();
        } catch (error) {
            toast({ title: t('error'), description: String(error), variant: 'destructive' });
        }
    };

    const handleResolveIssue = async (issueId: string) => {
        try {
            await resolveSupplierIssue(issueId);
            toast({ title: t('success'), description: 'تم حل المشكلة' });
            loadData();
        } catch (error) {
            toast({ title: t('error'), description: String(error), variant: 'destructive' });
        }
    };

    const getRatingColor = (rating: number | null) => {
        if (!rating) return 'text-gray-400';
        if (rating >= 4.5) return 'text-green-600';
        if (rating >= 3.5) return 'text-yellow-600';
        return 'text-red-600';
    };

    const getRatingStars = (rating: number | null) => {
        const stars = rating || 0;
        return Array.from({ length: 5 }, (_, i) => (
            <Star
                key={i}
                className={`h-4 w-4 ${i < stars ? 'fill-current' : ''} ${getRatingColor(rating)}`}
            />
        ));
    };

    const issueTypeLabels = {
        late_delivery: 'تأخير في التوصيل',
        quality: 'مشكلة جودة',
        wrong_items: 'أصناف خاطئة',
        damaged: 'منتجات تالفة',
        other: 'أخرى'
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-10" dir={direction}>
            <Header toggleSidebar={toggleSidebar} />
            <Sidebar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} closeSidebar={closeSidebar} />

            <main className={`pt-20 ${isMobile ? 'px-4' : direction === 'rtl' ? 'pr-72 pl-8' : 'pl-72 pr-8'}`}>
                <div className="max-w-6xl mx-auto">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold">تقييم أداء الموردين</h1>
                            <p className="text-muted-foreground">مقارنة الموردين واختيار الأفضل</p>
                        </div>
                        <Button onClick={() => setIsIssueDialogOpen(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            تسجيل مشكلة
                        </Button>
                    </div>

                    {isLoading ? (
                        <div className="text-center py-12">جاري التحميل...</div>
                    ) : (
                        <>
                            {/* Performance Table/Cards */}
                            <Card className="mb-6">
                                <CardHeader>
                                    <CardTitle>ترتيب الموردين</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {isMobile ? (
                                        /* Mobile Card View */
                                        <div className="space-y-3">
                                            {performance.map((perf, index) => (
                                                <Card key={perf.id} className="border-2">
                                                    <CardContent className="p-4">
                                                        <div className="flex justify-between items-start mb-3">
                                                            <div>
                                                                <span className="text-2xl font-bold text-muted-foreground">#{index + 1}</span>
                                                                <h3 className="font-bold text-lg">{perf.name}</h3>
                                                            </div>
                                                            {perf.open_issues > 0 ? (
                                                                <Badge variant="destructive">{perf.open_issues} مشاكل</Badge>
                                                            ) : (
                                                                <Badge variant="outline" className="bg-green-50">✓</Badge>
                                                            )}
                                                        </div>

                                                        <div className="flex items-center gap-2 mb-3">
                                                            <div className="flex">{getRatingStars(perf.overall_rating)}</div>
                                                            <span className={`font-bold ${getRatingColor(perf.overall_rating)}`}>
                                                                {perf.overall_rating?.toFixed(1) || '-'}
                                                            </span>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-muted-foreground">الجودة:</span>
                                                                <span className={`font-semibold ${getRatingColor(perf.quality_rating)}`}>
                                                                    {perf.quality_rating?.toFixed(1) || '-'}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-muted-foreground">التوصيل:</span>
                                                                <span className={`font-semibold ${getRatingColor(perf.delivery_rating)}`}>
                                                                    {perf.delivery_rating?.toFixed(1) || '-'}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-muted-foreground">السعر:</span>
                                                                <span className={`font-semibold ${getRatingColor(perf.price_rating)}`}>
                                                                    {perf.price_rating?.toFixed(1) || '-'}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-muted-foreground">الطلبات:</span>
                                                                <span className="font-semibold">{perf.total_orders || 0}</span>
                                                            </div>
                                                            <div className="col-span-2 flex items-center gap-2">
                                                                <span className="text-muted-foreground">بالموعد:</span>
                                                                <span className="font-semibold">
                                                                    {perf.total_orders > 0
                                                                        ? `${Math.round((perf.on_time_deliveries / perf.total_orders) * 100)}%`
                                                                        : '-'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    ) : (
                                        /* Desktop Table View */
                                        <div className="overflow-x-auto">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>#</TableHead>
                                                        <TableHead>المورد</TableHead>
                                                        <TableHead>التقييم الإجمالي</TableHead>
                                                        <TableHead>الجودة</TableHead>
                                                        <TableHead>التوصيل</TableHead>
                                                        <TableHead>السعر</TableHead>
                                                        <TableHead>عدد الطلبات</TableHead>
                                                        <TableHead>توصيل بالموعد</TableHead>
                                                        <TableHead>مشاكل مفتوحة</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {performance.map((perf, index) => (
                                                        <TableRow key={perf.id}>
                                                            <TableCell className="font-medium">{index + 1}</TableCell>
                                                            <TableCell className="font-semibold">{perf.name}</TableCell>
                                                            <TableCell>
                                                                <div className="flex items-center gap-2">
                                                                    <div className="flex">{getRatingStars(perf.overall_rating)}</div>
                                                                    <span className={getRatingColor(perf.overall_rating)}>
                                                                        {perf.overall_rating?.toFixed(1) || '-'}
                                                                    </span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <span className={getRatingColor(perf.quality_rating)}>
                                                                    {perf.quality_rating?.toFixed(1) || '-'}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell>
                                                                <span className={getRatingColor(perf.delivery_rating)}>
                                                                    {perf.delivery_rating?.toFixed(1) || '-'}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell>
                                                                <span className={getRatingColor(perf.price_rating)}>
                                                                    {perf.price_rating?.toFixed(1) || '-'}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell>{perf.total_orders || 0}</TableCell>
                                                            <TableCell>
                                                                {perf.total_orders > 0
                                                                    ? `${Math.round((perf.on_time_deliveries / perf.total_orders) * 100)}%`
                                                                    : '-'}
                                                            </TableCell>
                                                            <TableCell>
                                                                {perf.open_issues > 0 ? (
                                                                    <Badge variant="destructive">{perf.open_issues}</Badge>
                                                                ) : (
                                                                    <Badge variant="outline">0</Badge>
                                                                )}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Issues List */}
                            <Card>
                                <CardHeader>
                                    <div className="flex justify-between items-center">
                                        <CardTitle>المشاكل المسجلة</CardTitle>
                                        <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                                            <SelectTrigger className="w-64">
                                                <SelectValue placeholder="جميع الموردين" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="">جميع الموردين</SelectItem>
                                                {suppliers.map(s => (
                                                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {issues
                                            .filter(issue => !selectedSupplier || issue.supplier_id === selectedSupplier)
                                            .map(issue => {
                                                const supplier = suppliers.find(s => s.id === issue.supplier_id);
                                                return (
                                                    <div key={issue.id} className={`p-4 border rounded-lg ${issue.resolved ? 'bg-green-50' : 'bg-red-50'}`}>
                                                        <div className="flex justify-between items-start">
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2 mb-2">
                                                                    <span className="font-semibold">{supplier?.name}</span>
                                                                    <Badge variant={issue.resolved ? 'default' : 'destructive'}>
                                                                        {issueTypeLabels[issue.issue_type]}
                                                                    </Badge>
                                                                    <Badge variant="outline">شدة: {issue.severity}/5</Badge>
                                                                </div>
                                                                <p className="text-sm text-muted-foreground">{issue.description}</p>
                                                                <p className="text-xs text-muted-foreground mt-2">
                                                                    {new Date(issue.created_at).toLocaleDateString('ar-EG')}
                                                                </p>
                                                            </div>
                                                            {!issue.resolved && (
                                                                <Button size="sm" onClick={() => handleResolveIssue(issue.id)}>
                                                                    <CheckCircle className="h-4 w-4 mr-2" />
                                                                    حل المشكلة
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                </CardContent>
                            </Card>
                        </>
                    )}
                </div>
            </main>

            {/* Add Issue Dialog */}
            <Dialog open={isIssueDialogOpen} onOpenChange={setIsIssueDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>تسجيل مشكلة مع مورد</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div>
                            <Label>المورد *</Label>
                            <Select value={issueForm.supplier_id} onValueChange={(val) => setIssueForm({ ...issueForm, supplier_id: val })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="اختر المورد" />
                                </SelectTrigger>
                                <SelectContent>
                                    {suppliers.map(s => (
                                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label>نوع المشكلة *</Label>
                            <Select value={issueForm.issue_type} onValueChange={(val: any) => setIssueForm({ ...issueForm, issue_type: val })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(issueTypeLabels).map(([key, label]) => (
                                        <SelectItem key={key} value={key}>{label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label>الشدة (1-5)</Label>
                            <Select value={String(issueForm.severity)} onValueChange={(val) => setIssueForm({ ...issueForm, severity: parseInt(val) })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {[1, 2, 3, 4, 5].map(n => (
                                        <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label>التفاصيل *</Label>
                            <Textarea
                                value={issueForm.description}
                                onChange={(e) => setIssueForm({ ...issueForm, description: e.target.value })}
                                rows={4}
                            />
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setIsIssueDialogOpen(false)}>إلغاء</Button>
                            <Button onClick={handleAddIssue}>حفظ</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default SupplierPerformancePage;
