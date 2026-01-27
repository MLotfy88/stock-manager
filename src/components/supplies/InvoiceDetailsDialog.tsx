import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLanguage } from '@/contexts/LanguageContext';
import { SupplyVoucher } from '@/types';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

interface InvoiceDetailsDialogProps {
    isOpen: boolean;
    onClose: () => void;
    voucher: SupplyVoucher | null;
}

export const InvoiceDetailsDialog: React.FC<InvoiceDetailsDialogProps> = ({
    isOpen,
    onClose,
    voucher
}) => {
    const { t } = useLanguage();

    if (!voucher) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{t('invoice_details') || 'Invoice Details'}</DialogTitle>
                    <DialogDescription>
                        {voucher.voucher_number || 'Draft/No Number'} - {format(new Date(voucher.date), 'dd/MM/yyyy')}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
                    <div>
                        <h4 className="font-semibold text-sm text-muted-foreground">{t('supplier')}</h4>
                        <p>{(voucher as any).supplier?.name || '-'}</p>
                    </div>
                    <div>
                        <h4 className="font-semibold text-sm text-muted-foreground">{t('status')}</h4>
                        <Badge variant="outline">{voucher.payment_status}</Badge>
                    </div>
                    <div>
                        <h4 className="font-semibold text-sm text-muted-foreground">{t('total_amount')}</h4>
                        <p>{voucher.total_amount?.toFixed(2)}</p>
                    </div>
                    <div>
                        <h4 className="font-semibold text-sm text-muted-foreground">{t('paid_amount')}</h4>
                        <p>{voucher.paid_amount?.toFixed(2)}</p>
                    </div>
                </div>

                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('product')}</TableHead>
                                <TableHead>{t('variant')}</TableHead>
                                <TableHead>{t('quantity')}</TableHead>
                                <TableHead>{t('price')}</TableHead>
                                <TableHead>{t('total')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {/* Note: We need to fetch items or if they are included in voucher object. 
                                Usually fetchVouchers doesn't include items by default unless requested. 
                                We might need to fetch them here or ensure parent fetches them.
                                For now assuming they might be missing, showing placeholder if so. */}
                            {(voucher as any).items && (voucher as any).items.length > 0 ? (
                                (voucher as any).items.map((item: any, idx: number) => (
                                    <TableRow key={idx}>
                                        <TableCell>{item.product?.name || item.product_name || '-'}</TableCell>
                                        <TableCell>{item.variant || '-'}</TableCell>
                                        <TableCell>{item.quantity}</TableCell>
                                        <TableCell>{item.purchase_price?.toFixed(2)}</TableCell>
                                        <TableCell>{(item.quantity * item.purchase_price).toFixed(2)}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                                        {t('no_items_details') || 'No item details available or not loaded.'}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                <DialogFooter className="gap-2">
                    <Button onClick={onClose}>{t('close')}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
