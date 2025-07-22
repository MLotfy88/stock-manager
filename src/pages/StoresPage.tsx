import React, { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { useMediaQuery } from '@/hooks/use-mobile';
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

// MOCK DATA - REMOVE WHEN SUPABASE IS INTEGRATED
const MOCK_STORES: Store[] = [
    { id: '1', name: 'Main Store', location: 'First Floor' },
    { id: '2', name: 'Cath Lab 1', location: 'Second Floor, Wing A' },
];
// END MOCK DATA

const StoresPage = () => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { t, direction } = useLanguage();
  const { toast } = useToast();
  
  const [stores, setStores] = useState<Store[]>(MOCK_STORES);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentStore, setCurrentStore] = useState<Store | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');

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

  const handleSubmit = () => {
    if (!name.trim()) {
      toast({ title: t('error'), description: "Store name cannot be empty.", variant: 'destructive' });
      return;
    }

    if (currentStore) {
      // Update logic
      const updatedStore: Store = { ...currentStore, name, location };
      setStores(stores.map(s => s.id === updatedStore.id ? updatedStore : s));
      toast({ title: t('success'), description: "Store updated." });
    } else {
      // Add logic
      const newStore: Store = { id: `store_${Date.now()}`, name, location };
      setStores([...stores, newStore]);
      toast({ title: t('success'), description: "Store added." });
    }
    
    setIsDialogOpen(false);
    resetForm();
  };

  const openDeleteDialog = (store: Store) => {
    setCurrentStore(store);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = () => {
    if (!currentStore) return;
    setStores(stores.filter(s => s.id !== currentStore.id));
    setIsDeleteDialogOpen(false);
    setCurrentStore(null);
    toast({ title: t('success'), description: "Store deleted." });
  };

  return (
    <div className="page-container bg-background" dir={direction}>
      <Header />
      <Sidebar />
      
      <main className={`${isMobile ? 'px-4' : direction === 'rtl' ? 'pr-72 pl-8' : 'pl-72 pr-8'} transition-all`}>
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">{t('stores')}</h1>
            <Button onClick={() => openDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              {t('add_store')}
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stores.map((store) => (
              <Card key={store.id}>
                <CardHeader>
                  <CardTitle>{store.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">{store.location}</p>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" size="sm" onClick={() => openDialog(store)}>
                      <Edit className="h-4 w-4 mr-1" />
                      {t('edit')}
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => openDeleteDialog(store)}>
                      <Trash2 className="h-4 w-4 mr-1" />
                      {t('delete')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
      
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

export default StoresPage;
