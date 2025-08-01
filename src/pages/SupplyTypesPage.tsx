import React, { useState, useEffect, useRef } from 'react';
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
import { getSupplyTypes } from '@/data/operations/supplyTypeOperations';
import {
  getProductDefinitions,
  addProductDefinition,
  updateProductDefinition,
  deleteProductDefinition
} from '@/data/operations/productDefinitionOperations';
import Papa from 'papaparse';

export const ProductDefinitionsPageContent = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [definitions, setDefinitions] = useState<ProductDefinition[]>([]);
  const [supplyTypes, setSupplyTypes] = useState<SupplyTypeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [defs, types] = await Promise.all([
        getProductDefinitions(),
        getSupplyTypes()
      ]);
      setDefinitions(defs);
      setSupplyTypes(types);
    } catch (error) {
      toast({ title: t('error'), description: t('error_fetching_data'), variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddVariant = (e: React.FormEvent) => {
    e.preventDefault();
    if (variantNameInput.trim() && !variants.some(v => v.name === variantNameInput.trim())) {
      setVariants([...variants, { name: variantNameInput.trim(), reorder_point: parseInt(variantReorderPointInput) || 0 }]);
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
      setTypeId(definition.type_id);
      setVariantLabel(definition.variant_label);
      setVariants(definition.variants);
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!name || !typeId || !variantLabel || variants.length === 0) {
      toast({ title: t('error'), description: "Please fill all fields and add at least one variant.", variant: 'destructive' });
      return;
    }

    try {
      if (currentDefinition) {
        await updateProductDefinition(currentDefinition.id, { name, type_id: typeId, variant_label: variantLabel, variants });
        toast({ title: t('success'), description: "Product definition updated." });
      } else {
        await addProductDefinition({ name, type_id: typeId, variant_label: variantLabel, variants });
        toast({ title: t('success'), description: "Product definition added." });
      }
      
      loadData();
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      toast({ title: t('error'), description: "Error saving definition.", variant: 'destructive' });
    }
  };

  const openDeleteDialog = (definition: ProductDefinition) => {
    setCurrentDefinition(definition);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!currentDefinition) return;
    try {
      await deleteProductDefinition(currentDefinition.id);
      loadData();
      setIsDeleteDialogOpen(false);
      setCurrentDefinition(null);
      toast({ title: t('success'), description: "Product definition deleted." });
    } catch (error) {
      toast({ title: t('error'), description: "Error deleting definition.", variant: 'destructive' });
    }
  };

  const handleExport = () => {
    const dataToExport = definitions.map(def => ({
      product_name: def.name,
      product_type_id: def.type_id,
      variant_label: def.variant_label,
      variants: def.variants.map(v => `${v.name}:${v.reorder_point}`).join('|')
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
      encoding: "UTF-8", // Explicitly set encoding for Arabic characters
      complete: async (results) => {
        const definitionsToCreate = results.data.map((row: any) => {
          const variants: ProductVariant[] = (row.variants || '').split('|').map((v: string) => {
            const [name, reorderPoint] = v.split(':');
            return { name, reorder_point: parseInt(reorderPoint) || 0 };
          }).filter((v: ProductVariant) => v.name);

          if (row.product_name && row.product_type_id && row.variant_label && variants.length > 0) {
            return {
              name: row.product_name,
              type_id: row.product_type_id,
              variant_label: row.variant_label,
              variants,
            };
          }
          return null;
        }).filter(Boolean);

        if (definitionsToCreate.length === 0) {
          toast({ title: t('error'), description: "No valid product definitions found in the file.", variant: 'destructive' });
          return;
        }

        try {
          // Save each new definition to the database
          await Promise.all(definitionsToCreate.map(def => addProductDefinition(def as any)));
          
          toast({ title: t('success'), description: `${definitionsToCreate.length} products imported and saved successfully.` });
          
          // Reload data from the database to show the new items
          loadData();

        } catch (dbError) {
          console.error("Database save error:", dbError);
          toast({ title: t('error'), description: "An error occurred while saving the imported products to the database.", variant: 'destructive' });
        }
      },
      error: (error) => {
        toast({ title: t('error'), description: `CSV parsing error: ${error.message}`, variant: 'destructive' });
      }
    });
  };

  if (isLoading) {
    return <div>{t('loading')}...</div>;
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">{t('product_definitions')}</h2>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => openDialog()}><Plus className="mr-2 h-4 w-4" />{t('add_definition')}</Button>
          <Button variant="outline" onClick={handleExport}><FileDown className="mr-2 h-4 w-4" />{t('export')}</Button>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}><FileUp className="mr-2 h-4 w-4" />{t('import')}</Button>
          <Input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileImport} />
        </div>
      </div>
      <div className="text-right mb-4">
        <Button variant="link" onClick={handleDownloadTemplate}>{t('download_template')}</Button>
      </div>
      
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
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
                    <td className="p-4">{supplyTypes.find(st => st.id === def.type_id)?.name || def.type_id}</td>
                    <td className="p-4">{def.variant_label}</td>
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
                      <span>{v.name} ({t('reorder_point')}: {v.reorder_point})</span>
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
    </>
  );
};
