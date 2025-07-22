
import React, { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { useMediaQuery } from '@/hooks/use-mobile';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
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

const SuppliersPage = () => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { t, direction } = useLanguage();
  const { toast } = useToast();
  
  const [suppliersList, setSuppliersList] = useState<Supplier[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentSupplier, setCurrentSupplier] = useState<Supplier | null>(null);
  const [newName, setNewName] = useState('');
  const [newContact, setNewContact] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  
  // Reload suppliers list when needed
  const loadSuppliers = () => {
    setSuppliersList(getSuppliers());
  };
  
  useEffect(() => {
    loadSuppliers();
  }, []);
  
  const handleAddSupplier = () => {
    if (!newName.trim()) return;
    
    const newSupplier: Supplier = {
      id: `supplier_${Date.now()}`,
      name: newName,
      contact: newContact,
      phone: newPhone,
      email: newEmail
    };
    
    const result = addSupplier(newSupplier);
    
    if (result) {
      loadSuppliers();
      resetFormFields();
      setIsAddDialogOpen(false);
      
      toast({
        title: t('success'),
        description: t('item_added'),
      });
    } else {
      toast({
        title: t('error'),
        description: t('error_adding_item'),
        variant: 'destructive'
      });
    }
  };
  
  const handleEditSupplier = () => {
    if (!currentSupplier || !newName.trim()) return;
    
    const updatedData: Partial<Supplier> = {
      name: newName,
      contact: newContact,
      phone: newPhone,
      email: newEmail
    };
    
    const result = updateSupplier(currentSupplier.id, updatedData);
    
    if (result) {
      loadSuppliers();
      setIsEditDialogOpen(false);
      
      toast({
        title: t('success'),
        description: t('item_updated'),
      });
    } else {
      toast({
        title: t('error'),
        description: t('error_updating_item'),
        variant: 'destructive'
      });
    }
  };
  
  const handleDeleteSupplier = () => {
    if (!currentSupplier) return;
    
    const result = deleteSupplier(currentSupplier.id);
    
    if (result.success) {
      loadSuppliers();
      setIsDeleteDialogOpen(false);
      
      toast({
        title: t('success'),
        description: t('item_deleted'),
      });
    } else {
      toast({
        title: t('error'),
        description: t(result.error || 'error_deleting_item'),
        variant: 'destructive'
      });
    }
  };
  
  const openEditDialog = (supplier: Supplier) => {
    setCurrentSupplier(supplier);
    setNewName(supplier.name);
    setNewContact(supplier.contact || '');
    setNewPhone(supplier.phone || '');
    setNewEmail(supplier.email || '');
    setIsEditDialogOpen(true);
  };
  
  const openDeleteDialog = (supplier: Supplier) => {
    setCurrentSupplier(supplier);
    setIsDeleteDialogOpen(true);
  };
  
  const resetFormFields = () => {
    setNewName('');
    setNewContact('');
    setNewPhone('');
    setNewEmail('');
  };
  
  return (
    <div className="min-h-screen bg-gray-50 pb-10" dir={direction}>
      <Header />
      <Sidebar />
      
      <main className={`pt-20 ${isMobile ? 'px-4' : direction === 'rtl' ? 'pr-72 pl-8' : 'pl-72 pr-8'}`}>
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">{t('suppliers_nav')}</h1>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  {t('add_supplier')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('add_supplier')}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">{t('supplier_name')}</Label>
                    <Input 
                      id="name" 
                      value={newName} 
                      onChange={(e) => setNewName(e.target.value)} 
                      className="col-span-3" 
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="contact" className="text-right">{t('contact_person')}</Label>
                    <Input 
                      id="contact" 
                      value={newContact} 
                      onChange={(e) => setNewContact(e.target.value)} 
                      className="col-span-3" 
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="phone" className="text-right">{t('phone')}</Label>
                    <Input 
                      id="phone" 
                      value={newPhone} 
                      onChange={(e) => setNewPhone(e.target.value)} 
                      className="col-span-3" 
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="email" className="text-right">{t('email')}</Label>
                    <Input 
                      id="email" 
                      type="email"
                      value={newEmail} 
                      onChange={(e) => setNewEmail(e.target.value)} 
                      className="col-span-3" 
                    />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">{t('cancel')}</Button>
                  </DialogClose>
                  <Button onClick={handleAddSupplier}>{t('save')}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('supplier_name')}</TableHead>
                    <TableHead>{t('contact_person')}</TableHead>
                    <TableHead>{t('contact_info')}</TableHead>
                    <TableHead className="text-right">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliersList.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          <Truck className="h-4 w-4 mr-2 text-muted-foreground" />
                          {supplier.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        {supplier.contact && (
                          <div className="flex items-center">
                            <User className="h-4 w-4 mr-2 text-muted-foreground" />
                            {supplier.contact}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col space-y-1">
                          {supplier.phone && (
                            <div className="flex items-center">
                              <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                              {supplier.phone}
                            </div>
                          )}
                          {supplier.email && (
                            <div className="flex items-center">
                              <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                              {supplier.email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => openEditDialog(supplier)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openDeleteDialog(supplier)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>
      
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('edit_supplier')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">{t('supplier_name')}</Label>
              <Input 
                id="edit-name" 
                value={newName} 
                onChange={(e) => setNewName(e.target.value)} 
                className="col-span-3" 
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-contact" className="text-right">{t('contact_person')}</Label>
              <Input 
                id="edit-contact" 
                value={newContact} 
                onChange={(e) => setNewContact(e.target.value)} 
                className="col-span-3" 
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-phone" className="text-right">{t('phone')}</Label>
              <Input 
                id="edit-phone" 
                value={newPhone} 
                onChange={(e) => setNewPhone(e.target.value)} 
                className="col-span-3" 
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-email" className="text-right">{t('email')}</Label>
              <Input 
                id="edit-email" 
                type="email"
                value={newEmail} 
                onChange={(e) => setNewEmail(e.target.value)} 
                className="col-span-3" 
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t('cancel')}</Button>
            </DialogClose>
            <Button onClick={handleEditSupplier}>{t('save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirm_delete')}</AlertDialogTitle>
            <AlertDialogDescription>{t('confirm_delete_desc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSupplier} className="bg-destructive text-destructive-foreground">
              {t('yes_delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SuppliersPage;
