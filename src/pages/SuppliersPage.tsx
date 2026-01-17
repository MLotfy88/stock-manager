import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, Truck, Phone, Mail, User } from 'lucide-react';
import { Supplier } from '@/types';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import {
  getSuppliers,
  addSupplier,
  updateSupplier,
  deleteSupplier
} from '@/data/operations/supplierOperations';

export const SuppliersPageContent = () => {
  const { t } = useLanguage();
  const { toast } = useToast();

  const [suppliersList, setSuppliersList] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentSupplier, setCurrentSupplier] = useState<Supplier | null>(null);

  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [alertPeriod, setAlertPeriod] = useState('30');

  const loadSuppliers = async () => {
    setIsLoading(true);
    try {
      const suppliers = await getSuppliers();
      setSuppliersList(suppliers);
    } catch (error) {
      toast({ title: t('error'), description: t('error_fetching_data'), variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const resetForm = () => {
    setName('');
    setContact('');
    setPhone('');
    setEmail('');
    setAlertPeriod('30');
    setCurrentSupplier(null);
  };

  const openDialog = (supplier: Supplier | null = null) => {
    if (supplier) {
      setCurrentSupplier(supplier);
      setName(supplier.name);
      setContact(supplier.contact || '');
      setPhone(supplier.phone || '');
      setEmail(supplier.email || '');
      setAlertPeriod(String(supplier.alert_period || 30));
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;

    try {
      const supplierData = {
        name,
        contact,
        phone,
        email,
        alert_period: parseInt(alertPeriod) || 30
      };
      if (currentSupplier) {
        await updateSupplier(currentSupplier.id, supplierData);
        toast({ title: t('success'), description: t('item_updated') });
      } else {
        await addSupplier(supplierData);
        toast({ title: t('success'), description: t('item_added') });
      }
      loadSuppliers();
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      toast({ title: t('error'), description: t('error_processing_item'), variant: 'destructive' });
    }
  };

  const openDeleteDialog = (supplier: Supplier) => {
    setCurrentSupplier(supplier);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!currentSupplier) return;
    try {
      const result = await deleteSupplier(currentSupplier.id);
      if (result.success) {
        loadSuppliers();
        toast({ title: t('success'), description: t('item_deleted') });
      } else {
        toast({ title: t('error'), description: t(result.error || 'error_deleting_item'), variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: t('error'), description: t('error_deleting_item'), variant: 'destructive' });
    } finally {
      setIsDeleteDialogOpen(false);
    }
  };

  return (
    <div>
      <div className="flex justify-end items-center mb-6">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              {t('add_supplier')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{currentSupplier ? t('edit_supplier') : t('add_supplier')}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('supplier_name')}</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact">{t('supplier_contact')}</Label>
                <Input id="contact" value={contact} onChange={(e) => setContact(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">{t('supplier_phone')}</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">
                  <Mail className="h-4 w-4 inline mr-2" />
                  {t('email') || 'البريد الإلكتروني'}
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="alertPeriod" className="flex items-center gap-2">
                  <span>{t('return_period_days') || 'مدة الاستبدال (بالأيام)'}</span>
                  <span className="text-xs text-muted-foreground">({t('before_expiry') || 'قبل انتهاء الصلاحية'})</span>
                </Label>
                <Input
                  id="alertPeriod"
                  type="number"
                  min="0"
                  value={alertPeriod}
                  onChange={(e) => setAlertPeriod(e.target.value)}
                  placeholder="30"
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  {t('return_period_help') || 'عدد الأيام قبل انتهاء الصلاحية التي يمكن خلالها إرجاع المنتج للمورد'}
                </p>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">{t('cancel')}</Button></DialogClose>
              <Button onClick={handleSubmit}>{t('save')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {/* Desktop Table View */}
          <div className="overflow-x-auto hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('supplier_name')}</TableHead>
                  <TableHead>{t('supplier_contact')}</TableHead>
                  <TableHead>{t('supplier_alert_period')}</TableHead>
                  <TableHead className="text-right">{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={4} className="text-center h-24">{t('loading')}</TableCell></TableRow>
                ) : suppliersList.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center h-24">{t('no_data')}</TableCell></TableRow>
                ) : (
                  suppliersList.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell className="font-medium">{supplier.name}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{supplier.contact}</span>
                          <span className="text-xs text-muted-foreground">{supplier.phone}</span>
                          <span className="text-xs text-muted-foreground">{supplier.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>{supplier.alert_period} {t('days')}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openDialog(supplier)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(supplier)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card List View */}
          <div className="md:hidden space-y-4 p-4">
            {isLoading ? (
              <div className="text-center py-8">{t('loading')}</div>
            ) : suppliersList.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">{t('no_data')}</div>
            ) : (
              suppliersList.map((supplier) => (
                <div key={supplier.id} className="bg-card border rounded-lg shadow-sm p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold text-lg">{supplier.name}</h3>
                    <Badge variant="outline">{supplier.alert_period} {t('days')}</Badge>
                  </div>

                  <div className="space-y-1 text-sm">
                    {supplier.contact && (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{supplier.contact}</span>
                      </div>
                    )}
                    {supplier.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <a href={`tel:${supplier.phone}`} className="text-primary hover:underline">{supplier.phone}</a>
                      </div>
                    )}
                    {supplier.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <a href={`mailto:${supplier.email}`} className="text-primary hover:underline truncate">{supplier.email}</a>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t">
                    <Button variant="outline" size="sm" onClick={() => openDialog(supplier)} className="flex-1">
                      <Edit className="h-4 w-4 mr-2" /> {t('edit')}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openDeleteDialog(supplier)} className="text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirm_delete')}</AlertDialogTitle>
            <AlertDialogDescription>{t('confirm_delete_desc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              {t('yes_delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
