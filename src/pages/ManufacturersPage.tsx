import React, { useState, useEffect } from 'react';
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
} from '@/data/operations/manufacturerOperations';

export const ManufacturersPageContent = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  
  const [manufacturersList, setManufacturersList] = useState<Manufacturer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentManufacturer, setCurrentManufacturer] = useState<Manufacturer | null>(null);
  
  const [name, setName] = useState('');
  const [alertPeriod, setAlertPeriod] = useState('30');

  const loadManufacturers = async () => {
    setIsLoading(true);
    try {
      const manufacturers = await getManufacturers();
      setManufacturersList(manufacturers);
    } catch (error) {
      toast({ title: t('error'), description: t('error_fetching_data'), variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    loadManufacturers();
  }, []);

  const resetForm = () => {
    setName('');
    setAlertPeriod('30');
    setCurrentManufacturer(null);
  };

  const openDialog = (manufacturer: Manufacturer | null = null) => {
    if (manufacturer) {
      setCurrentManufacturer(manufacturer);
      setName(manufacturer.name);
      setAlertPeriod(String(manufacturer.alert_period));
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };
  
  const handleSubmit = async () => {
    if (!name.trim()) return;
    
    try {
      const manufacturerData = {
        name,
        alert_period: parseInt(alertPeriod) || 30,
      };

      if (currentManufacturer) {
        await updateManufacturer(currentManufacturer.id, manufacturerData);
        toast({ title: t('success'), description: t('item_updated') });
      } else {
        await addManufacturer(manufacturerData as any);
        toast({ title: t('success'), description: t('item_added') });
      }
      
      loadManufacturers();
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      toast({ title: t('error'), description: t('error_processing_item'), variant: 'destructive' });
    }
  };
  
  const openDeleteDialog = (manufacturer: Manufacturer) => {
    setCurrentManufacturer(manufacturer);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!currentManufacturer) return;
    
    try {
      const result = await deleteManufacturer(currentManufacturer.id);
      if (result.success) {
        loadManufacturers();
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
              {t('add_manufacturer')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{currentManufacturer ? t('edit_manufacturer') : t('add_manufacturer')}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('manufacturer_name')}</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="alertPeriod">{t('manufacturer_alert_period')}</Label>
                <Input id="alertPeriod" type="number" min="1" max="365" value={alertPeriod} onChange={(e) => setAlertPeriod(e.target.value)} />
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
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('manufacturer_name')}</TableHead>
                  <TableHead>{t('manufacturer_alert_period')}</TableHead>
                  <TableHead className="text-right">{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={3} className="text-center h-24">{t('loading')}</TableCell></TableRow>
                ) : manufacturersList.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center h-24">{t('no_data')}</TableCell></TableRow>
                ) : (
                  manufacturersList.map((manufacturer) => (
                    <TableRow key={manufacturer.id}>
                      <TableCell className="font-medium">{manufacturer.name}</TableCell>
                      <TableCell>{manufacturer.alert_period} {t('days')}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openDialog(manufacturer)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(manufacturer)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
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
