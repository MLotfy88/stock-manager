
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
import { Plus, Edit, Trash2, Building2 } from 'lucide-react';
import { Manufacturer } from '@/types';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import { 
  getManufacturers, 
  addManufacturer, 
  updateManufacturer, 
  deleteManufacturer 
} from '@/data/mockData';

const ManufacturersPage = () => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { t, direction } = useLanguage();
  const { toast } = useToast();
  
  const [manufacturersList, setManufacturersList] = useState<Manufacturer[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentManufacturer, setCurrentManufacturer] = useState<Manufacturer | null>(null);
  const [newManufacturerName, setNewManufacturerName] = useState('');
  const [newAlertPeriod, setNewAlertPeriod] = useState<string>('30');
  
  // تحميل بيانات الشركات المصنعة
  const loadManufacturers = () => {
    const manufacturers = getManufacturers();
    console.log('تحميل الشركات المصنعة:', manufacturers);
    setManufacturersList(manufacturers);
  };
  
  useEffect(() => {
    loadManufacturers();
  }, []);
  
  const handleAddManufacturer = () => {
    if (!newManufacturerName.trim()) return;
    
    const newManufacturer: Manufacturer = {
      id: Date.now().toString(),
      name: newManufacturerName,
      alertPeriod: parseInt(newAlertPeriod) || 30,
      logo: '/placeholder.svg'
    };
    
    const result = addManufacturer(newManufacturer);
    
    if (result) {
      loadManufacturers();
      setNewManufacturerName('');
      setNewAlertPeriod('30');
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
  
  const handleEditManufacturer = () => {
    if (!currentManufacturer || !newManufacturerName.trim()) return;
    
    const result = updateManufacturer(currentManufacturer.id, {
      name: newManufacturerName,
      alertPeriod: parseInt(newAlertPeriod) || 30
    });
    
    if (result) {
      loadManufacturers();
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
  
  const handleDeleteManufacturer = () => {
    if (!currentManufacturer) return;
    
    const result = deleteManufacturer(currentManufacturer.id);
    
    if (result.success) {
      loadManufacturers();
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
  
  const openEditDialog = (manufacturer: Manufacturer) => {
    setCurrentManufacturer(manufacturer);
    setNewManufacturerName(manufacturer.name);
    setNewAlertPeriod(manufacturer.alertPeriod.toString());
    setIsEditDialogOpen(true);
  };
  
  const openDeleteDialog = (manufacturer: Manufacturer) => {
    setCurrentManufacturer(manufacturer);
    setIsDeleteDialogOpen(true);
  };
  
  return (
    <div className="min-h-screen bg-gray-50 pb-10" dir={direction}>
      <Header />
      <Sidebar />
      
      <main className={`pt-20 ${isMobile ? 'px-4' : direction === 'rtl' ? 'pr-72 pl-8' : 'pl-72 pr-8'}`}>
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">{t('manufacturers_nav')}</h1>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  {t('add_manufacturer')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('add_manufacturer')}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">{t('manufacturer_name')}</Label>
                    <Input 
                      id="name" 
                      value={newManufacturerName} 
                      onChange={(e) => setNewManufacturerName(e.target.value)} 
                      className="col-span-3" 
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="alertPeriod" className="text-right">{t('manufacturer_alert_period')}</Label>
                    <Input 
                      id="alertPeriod" 
                      type="number"
                      min="1"
                      max="365"
                      value={newAlertPeriod} 
                      onChange={(e) => setNewAlertPeriod(e.target.value)} 
                      className="col-span-3" 
                    />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">{t('cancel')}</Button>
                  </DialogClose>
                  <Button onClick={handleAddManufacturer}>{t('save')}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('manufacturer_name')}</TableHead>
                    <TableHead>{t('manufacturer_alert_period')}</TableHead>
                    <TableHead className="text-right">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {manufacturersList.map((manufacturer) => (
                    <TableRow key={manufacturer.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
                          {manufacturer.name}
                        </div>
                      </TableCell>
                      <TableCell>{manufacturer.alertPeriod} {t('days')}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => openEditDialog(manufacturer)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openDeleteDialog(manufacturer)}>
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
            <DialogTitle>{t('edit_manufacturer')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">{t('manufacturer_name')}</Label>
              <Input 
                id="edit-name" 
                value={newManufacturerName} 
                onChange={(e) => setNewManufacturerName(e.target.value)} 
                className="col-span-3" 
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-alertPeriod" className="text-right">{t('manufacturer_alert_period')}</Label>
              <Input 
                id="edit-alertPeriod" 
                type="number"
                min="1"
                max="365"
                value={newAlertPeriod} 
                onChange={(e) => setNewAlertPeriod(e.target.value)} 
                className="col-span-3" 
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t('cancel')}</Button>
            </DialogClose>
            <Button onClick={handleEditManufacturer}>{t('save')}</Button>
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
            <AlertDialogAction onClick={handleDeleteManufacturer} className="bg-destructive text-destructive-foreground">
              {t('yes_delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ManufacturersPage;
