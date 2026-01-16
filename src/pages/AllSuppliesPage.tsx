import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import DetailedSupplyCard from '@/components/supplies/DetailedSupplyCard';
import { useMediaQuery } from '@/hooks/use-mobile';
import { useLanguage } from '@/contexts/LanguageContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { getInventoryItems } from '@/data/operations/suppliesOperations';
import { getProductDefinitions } from '@/data/operations/productDefinitionOperations';
import { getSupplyTypes } from '@/data/operations/supplyTypeOperations';
import { getStores } from '@/data/operations/storesOperations';
import { getSuppliers } from '@/data/operations/supplierOperations';
import { InventoryItem, ProductDefinition, SupplyTypeItem, Store, Supplier } from '@/types';

const AllSuppliesPage = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 1024px)');
  const { t, direction } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [productDefinitions, setProductDefinitions] = useState<ProductDefinition[]>([]);
  const [supplyTypes, setSupplyTypes] = useState<SupplyTypeItem[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [
          inventoryData,
          defsData,
          typesData,
          storesData,
          suppliersData,
        ] = await Promise.all([
          getInventoryItems(),
          getProductDefinitions(),
          getSupplyTypes(),
          getStores(),
          getSuppliers(),
        ]);
        setInventoryItems(inventoryData);
        setProductDefinitions(defsData);
        setSupplyTypes(typesData);
        setStores(storesData);
        setSuppliers(suppliersData);
      } catch (error) {
        console.error("Failed to fetch data for all supplies page", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const enrichedAndFilteredItems = useMemo(() => {
    const enriched = inventoryItems.map(item => {
      const definition = productDefinitions.find(def => def.id === item.product_definition_id);
      const type = supplyTypes.find(t => t.id === definition?.type_id);
      const store = stores.find(s => s.id === item.store_id);
      const supplier = suppliers.find(s => s.id === item.supplier_id);
      return {
        ...item,
        name: definition?.name || 'Unknown',
        typeName: type?.name || 'N/A',
        storeName: store?.name || 'N/A',
        supplierName: supplier?.name,
      };
    });

    if (!searchTerm) {
      return enriched;
    }

    return enriched.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.variant.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.batch_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.manufacturer_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [inventoryItems, productDefinitions, supplyTypes, stores, suppliers, searchTerm]);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => isMobile && setIsSidebarOpen(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background dark:from-slate-900 dark:to-slate-950 pb-20" dir={direction}>
      <Header toggleSidebar={toggleSidebar} />
      <Sidebar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} closeSidebar={closeSidebar} />

      <main className={`pt-20 transition-all duration-300 ${isMobile ? 'px-4' : direction === 'rtl' ? 'pr-72 pl-8' : 'pl-72 pr-8'}`}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <Button asChild variant="outline" size="sm">
              <Link to="/supplies">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('back_to_supplies')}
              </Link>
            </Button>
            <h1 className="text-2xl md:text-3xl font-bold">{t('all_supplies')}</h1>
          </div>

          <div className="mb-6">
            <Input
              placeholder={t('search_supplies_placeholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-lg mx-auto"
            />
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 gap-6">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {enrichedAndFilteredItems.length > 0 ? (
                enrichedAndFilteredItems.map(item => (
                  <DetailedSupplyCard key={item.id} supply={item} />
                ))
              ) : (
                <div className="text-center py-16">
                  <p className="text-lg text-muted-foreground">{t('no_supplies_found')}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AllSuppliesPage;
