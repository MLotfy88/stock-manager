import React, { useState, useEffect, useRef } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { useMediaQuery } from '@/hooks/use-mobile';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Trash2, X, FileDown, FileUp } from 'lucide-react';
import { ProductDefinition, SupplyTypeItem, ProductVariant } from '@/types';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { getSupplyTypes } from '@/data/mockData'; 
import Papa from 'papaparse';

// MOCK DATA
const MOCK_PRODUCT_DEFINITIONS: ProductDefinition[] = [
  { id: '1', name: 'Diagnostic Catheter', typeId: 'catheter', variantLabel: 'Curve', variants: [{name: 'L3.5', reorderPoint: 5}, {name: 'L4', reorderPoint: 5}], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '2', name: 'Balloons', typeId: 'consumable', variantLabel: 'Size', variants: [{name: '2.5x10', reorderPoint: 10}, {name: '3.0x15', reorderPoint: 8}], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];
// END MOCK DATA

const ProductDefinitionsPage = () => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { t, direction } = useLanguage();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [definitions, setDefinitions] = useState<ProductDefinition[]>(MOCK_PRODUCT_DEFINITIONS);
  const [supplyTypes, setSupplyTypes] = useState<SupplyTypeItem[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentDefinition, setCurrentDefinition] = useState<ProductDefinition | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [typeId, setTypeId] = useState('');
  const [variantLabel, setVariantLabel] = useState('');
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [variantNameInput, setVariantNameInput] = useState('');
  const [variantReorderPointInput, setVariantReorderPointInput] = useState('5');

  useEffect(() => {
    setSupplyTypes(getSupplyTypes());
  }, []);

  // ... (existing functions: handleAddVariant, handleRemoveVariant, resetForm, openDialog, handleSubmit, openDeleteDialog, handleDelete)

  const handleAddVariant = (e: React.FormEvent) => {
    e.preventDefault();
    if (variantNameInput.trim() && !variants.some(v => v.name === variantNameInput.trim())) {
      setVariants([...variants, { name: variantNameInput.trim(), reorderPoint: parseInt(variantReorderPointInput) || 0 }]);
      setVariantNameInput('');
      setVariantReorderPointInput('5');
    }
  };

  const handleRemoveVariant = (variantToRemove: string) => {
    setVariants(variants.filter(v => v.name !== variantToRemove));
  };

  const resetForm = () => {
    setName('');
    setTypeId('');
    setVariantLabel('');
    setVariants([]);
    setVariantNameInput('');
    setVariantReorderPointInput('5');
    setCurrentDefinition(null);
  };

  const openDialog = (definition: ProductDefinition | null = null) => {
    if (definition) {
      setCurrentDefinition(definition);
      setName(definition.name);
      setTypeId(definition.typeId);
      setVariantLabel(definition.variantLabel);
      setVariants(definition.variants);
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!name || !typeId || !variantLabel || variants.length === 0) {
      toast({ title: t('error'), description: "Please fill all fields and add at least one variant.", variant: 'destructive' });
      return;
    }

    if (currentDefinition) {
      const updatedDefinition: ProductDefinition = { ...currentDefinition, name, typeId, variantLabel, variants, updatedAt: new Date().toISOString() };
      setDefinitions(definitions.map(d => d.id === updatedDefinition.id ? updatedDefinition : d));
      toast({ title: t('success'), description: "Product definition updated." });
    } else {
      const newDefinition: ProductDefinition = { id: `def_${Date.now()}`, name, typeId, variantLabel, variants, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      setDefinitions([...definitions, newDefinition]);
      toast({ title: t('success'), description: "Product definition added." });
    }
    
    setIsDialogOpen(false);
    resetForm();
  };

  const openDeleteDialog = (definition: ProductDefinition) => {
    setCurrentDefinition(definition);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = () => {
    if (!currentDefinition) return;
    setDefinitions(definitions.filter(d => d.id !== currentDefinition.id));
    setIsDeleteDialogOpen(false);
    setCurrentDefinition(null);
    toast({ title: t('success'), description: "Product definition deleted." });
  };

  const handleExport = () => {
    const dataToExport = definitions.map(def => ({
      product_name: def.name,
      product_type_id: def.typeId,
      barcode: def.barcode || '',
      variant_label: def.variantLabel,
      variants: def.variants.map(v => `${v.name}:${v.reorderPoint}`).join('|') // Format: name1:point1|name2:point2
    }));
    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'product_definitions.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: t('success'), description: "Data exported successfully." });
  };

  const handleDownloadTemplate = () => {
    const templateData = [{
      product_name: 'Example Product',
      product_type_id: 'consumable',
      barcode: '123456789',
      variant_label: 'Size',
      variants: 'Small:5|Medium:10|Large:5'
    }];
    const csv = Papa.unparse(templateData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'product_definitions_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const newDefinitions: ProductDefinition[] = results.data.map((row: any) => {
          const variants: ProductVariant[] = (row.variants || '').split('|').map((v: string) => {
            const [name, reorderPoint] = v.split(':');
            return { name, reorderPoint: parseInt(reorderPoint) || 0 };
          }).filter((v: ProductVariant) => v.name);

          return {
            id: `def_${Date.now()}_${Math.random()}`,
            name: row.product_name,
            typeId: row.product_type_id,
            barcode: row.barcode,
            variantLabel: row.variant_label,
            variants,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        }).filter(def => def.name && def.typeId && def.variantLabel && def.variants.length > 0);

        setDefinitions(prev => [...prev, ...newDefinitions]);
        toast({ title: t('success'), description: `${newDefinitions.length} products imported successfully.` });
      },
      error: (error) => {
        toast({ title: t('error'), description: `CSV parsing error: ${error.message}`, variant: 'destructive' });
      }
    });
  };

  return (
    <div className="page-container bg-background" dir={direction}>
      <Header />
      <Sidebar />
      
      <main className={`${isMobile ? 'px-4' : direction === 'rtl' ? 'pr-72 pl-8' : 'pl-72 pr-8'} transition-all`}>
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">{t('product_definitions')}</h1>
            <div className="flex gap-2">
              <Button onClick={() => openDialog()}>{t('add_definition')}</Button>
              <Button variant="outline" onClick={handleExport}><FileDown className="mr-2 h-4 w-4" />{t('export')}</Button>
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}><FileUp className="mr-2 h-4 w-4" />{t('import')}</Button>
              <Input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileImport} />
            </div>
          </div>
          <div className="text-right mb-4">
            <Button variant="link" onClick={handleDownloadTemplate}>{t('download_template')}</Button>
          </div>
          
          <Card>
            {/* ... existing table ... */}
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-4 text-left">{t('product_name')}</th>
                      <th className="p-4 text-left">{t('product_type')}</th>
                      <th className="p-4 text-left">{t('variant_label')}</th>
                      <th className="p-4 text-center">{t('variants_count')}</th>
                      <th className="p-4 text-right">{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {definitions.map((def) => (
                      <tr key={def.id} className="border-b">
                        <td className="p-4 font-medium">{def.name}</td>
                        <td className="p-4">{supplyTypes.find(st => st.id === def.typeId)?.name || def.typeId}</td>
                        <td className="p-4">{def.variantLabel}</td>
                        <td className="p-4 text-center">{def.variants.length}</td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end space-x-2">
                            <Button variant="outline" size="sm" onClick={() => openDialog(def)}><Edit className="h-4 w-4" /></Button>
                            <Button variant="destructive" size="sm" onClick={() => openDeleteDialog(def)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      
      {/* ... existing dialogs ... */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader><DialogTitle>{currentDefinition ? t('edit_definition') : t('add_definition')}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">{t('product_name')}</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-right">{t('product_type')}</Label>
              <Select value={typeId} onValueChange={setTypeId}>
                <SelectTrigger className="col-span-3"><SelectValue placeholder={t('select_type')} /></SelectTrigger>
                <SelectContent>{supplyTypes.map(st => <SelectItem key={st.id} value={st.id}>{st.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="variantLabel" className="text-right">{t('variant_label')}</Label>
              <Input id="variantLabel" value={variantLabel} onChange={(e) => setVariantLabel(e.target.value)} className="col-span-3" placeholder="e.g., Size, Curve" />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">{t('variants')}</Label>
              <div className="col-span-3">
                <form onSubmit={handleAddVariant} className="flex items-center gap-2">
                  <Input placeholder={t('variant_name')} value={variantNameInput} onChange={(e) => setVariantNameInput(e.target.value)} />
                  <Input type="number" placeholder={t('reorder_point')} value={variantReorderPointInput} onChange={(e) => setVariantReorderPointInput(e.target.value)} className="w-24" />
                  <Button type="submit" size="sm">{t('add')}</Button>
                </form>
                <div className="flex flex-wrap gap-2 mt-2">
                  {variants.map(v => (
                    <Badge key={v.name} variant="secondary" className="flex items-center gap-2">
                      <span>{v.name} ({t('reorder_point')}: {v.reorderPoint})</span>
                      <button onClick={() => handleRemoveVariant(v.name)}><X className="h-3 w-3" /></button>
                    </Badge>
                  ))}
                </div>
              </div>
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
            <AlertDialogDescription>{t('confirm_delete_product_def_desc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">{t('yes_delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProductDefinitionsPage;
