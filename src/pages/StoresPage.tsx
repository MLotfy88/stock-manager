import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Store } from '@/types';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import { getStores, addStore, updateStore, deleteStore } from '@/data/operations/storesOperations';

export const StoresPageContent = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentStore, setCurrentStore] = useState<Store | null>(null);
  
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');

  const loadStores = async () => {
    setIsLoading(true);
    try {
      const data = await getStores();
      setStores(data);
    } catch (error) {
      toast({ title: t('error'), description: t('error_fetching_stores'), variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStores();
  }, []);

  const resetForm = () => {
    setName('');
    setLocation('');
    setCurrentStore(null);
  };

  const openDialog = (store: Store | null = null) => {
    if (store) {
      setCurrentStore(store);
      setName(store.name);
      setLocation(store.location || '');
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({ title: t('error'), description: "Store name cannot be empty.", variant: 'destructive' });
      return;
    }

    try {
      if (currentStore) {
        await updateStore(currentStore.id, { name, location });
        toast({ title: t('success'), description: "Store updated." });
      } else {
        await addStore({ name, location });
        toast({ title: t('success'), description: "Store added." });
      }
      loadStores();
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      toast({ title: t('error'), description: "An error occurred.", variant: 'destructive' });
    }
  };

  const openDeleteDialog = (store: Store) => {
    setCurrentStore(store);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!currentStore) return;
    try {
      await deleteStore(currentStore.id);
      toast({ title: t('success'), description: "Store deleted." });
      loadStores();
      setIsDeleteDialogOpen(false);
      setCurrentStore(null);
    } catch (error) {
      toast({ title: t('error'), description: "Failed to delete store.", variant: 'destructive' });
    }
  };

  return (
    <div>
      <div className="flex justify-end items-center mb-6">
        <Button onClick={() => openDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          {t('add_store')}
        </Button>
      </div>
      
      {isLoading ? (
        <p>Loading stores...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stores.map((store) => (
            <Card key={store.id}>
              <CardHeader>
                <CardTitle>{store.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4 h-10">{store.location}</p>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" size="sm" onClick={() => openDialog(store)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => openDeleteDialog(store)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentStore ? t('edit_store') : t('add_store')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('store_name')}</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">{t('location')}</Label>
              <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} />
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
            <AlertDialogDescription>{t('confirm_delete_store_desc')}</AlertDialogDescription>
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
