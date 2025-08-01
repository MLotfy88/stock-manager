import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { SupplyTypeItem } from '@/types';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import { getSupplyTypes, addSupplyType, updateSupplyType, deleteSupplyType } from '@/data/operations/supplyTypeOperations';
import { Textarea } from '@/components/ui/textarea';

export const SupplyTypesManagementPageContent = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  
  const [supplyTypes, setSupplyTypes] = useState<SupplyTypeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<SupplyTypeItem | null>(null);
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await getSupplyTypes();
      setSupplyTypes(data);
    } catch (error) {
      toast({ title: t('error'), description: t('error_fetching_data'), variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    loadData();
  }, []);

  const resetForm = () => {
    setName('');
    setDescription('');
    setCurrentItem(null);
  };

  const openDialog = (item: SupplyTypeItem | null = null) => {
    if (item) {
      setCurrentItem(item);
      setName(item.name);
      setDescription(item.description || '');
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };
  
  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({ title: t('error'), description: "Name is required.", variant: 'destructive' });
      return;
    }
    
    try {
      const data = { name, description };
      if (currentItem) {
        await updateSupplyType(currentItem.id, data);
        toast({ title: t('success'), description: t('item_updated') });
      } else {
        await addSupplyType(data as any);
        toast({ title: t('success'), description: t('item_added') });
      }
      loadData();
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      toast({ title: t('error'), description: t('error_processing_item'), variant: 'destructive' });
    }
  };
  
  const openDeleteDialog = (item: SupplyTypeItem) => {
    setCurrentItem(item);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!currentItem) return;
    try {
      const result = await deleteSupplyType(currentItem.id);
      if (result.success) {
        loadData();
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
        <Button onClick={() => openDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          {t('add_supply_type')}
        </Button>
      </div>
      
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('name')}</TableHead>
                  <TableHead>{t('description')}</TableHead>
                  <TableHead className="text-right">{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={3} className="text-center h-24">{t('loading')}</TableCell></TableRow>
                ) : supplyTypes.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openDialog(item)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(item)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                }
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentItem ? t('edit_supply_type') : t('add_supply_type')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('name')}</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">{t('description')}</Label>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">{t('cancel')}</Button></DialogClose>
            <Button onClick={handleSubmit}>{t('save')}</Button>
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
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              {t('yes_delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
