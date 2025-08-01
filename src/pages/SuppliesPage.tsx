import React, { useState, useEffect, useMemo } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { useMediaQuery } from '@/hooks/use-mobile';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Package, Search, Plus, Filter, ArrowUpDown, AlertTriangle, Clock, CheckCircle
} from 'lucide-react';
import SupplyCard from '@/components/supplies/SupplyCard';
import { InventoryItem, ProductDefinition, SupplyTypeItem } from '@/types';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { getInventoryItems } from '@/data/operations/suppliesOperations';
import { getProductDefinitions } from '@/data/operations/productDefinitionOperations';
import { getSupplyTypes } from '@/data/operations/supplyTypeOperations';
import { useToast } from '@/components/ui/use-toast';

const SuppliesPage = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { t, direction } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [productDefinitions, setProductDefinitions] = useState<ProductDefinition[]>([]);
  const [supplyTypes, setSupplyTypes] = useState<SupplyTypeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // States for filtering and sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState('name-asc');

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const closeSidebar = () => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [items, definitions, types] = await Promise.all([
        getInventoryItems(),
        getProductDefinitions(),
        getSupplyTypes()
      ]);
      setInventoryItems(items);
      setProductDefinitions(definitions);
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

  const enrichedItems = useMemo(() => {
    return inventoryItems.map(item => {
      const definition = productDefinitions.find(def => def.id === item.product_definition_id);
      return {
        ...item,
        name: definition?.name || 'Unknown',
        type_id: definition?.type_id || 'other',
      };
    });
  }, [inventoryItems, productDefinitions]);

  const filteredItems = useMemo(() => {
    return enrichedItems.filter(item => {
      const matchesSearch = searchQuery === '' || 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.batch_number.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      const matchesType = typeFilter === 'all' || item.type_id === typeFilter;
      
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [enrichedItems, searchQuery, statusFilter, typeFilter]);

  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'expiry-asc':
          return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
        case 'expiry-desc':
          return new Date(b.expiry_date).getTime() - new Date(a.expiry_date).getTime();
        case 'quantity-asc':
          return a.quantity - b.quantity;
        case 'quantity-desc':
          return b.quantity - a.quantity;
        default:
          return 0;
      }
    });
  }, [filteredItems, sortBy]);

  const statusCounts = useMemo(() => {
    return inventoryItems.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [inventoryItems]);

  return (
    <div className="min-h-screen bg-gray-50 pb-10" dir={direction}>
      <Header toggleSidebar={toggleSidebar} />
      <Sidebar 
        isSidebarOpen={isSidebarOpen} 
        toggleSidebar={toggleSidebar}
        closeSidebar={closeSidebar}
      />
      
      <main className={`pt-20 ${isMobile ? 'px-4' : direction === 'rtl' ? 'pr-72 pl-8' : 'pl-72 pr-8'}`}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-1">{t('supplies_nav')}</h1>
              <p className="text-muted-foreground text-sm md:text-base">{t('supplies_overview')}</p>
            </div>
            <Button className="gap-2 w-full md:w-auto" onClick={() => navigate('/add-supply')}>
              <Plus className="h-4 w-4" />
              {t('add_new_supply')}
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="bg-green-50 border-green-200"><CardContent className="p-4 flex items-center gap-3"><div className="p-2 bg-green-100 rounded-full"><CheckCircle className="h-5 w-5 text-green-600" /></div><div><p className="text-sm font-medium text-green-600">{t('valid_supplies')}</p><p className="text-2xl font-bold">{statusCounts.valid || 0}</p></div></CardContent></Card>
            <Card className="bg-amber-50 border-amber-200"><CardContent className="p-4 flex items-center gap-3"><div className="p-2 bg-amber-100 rounded-full"><Clock className="h-5 w-5 text-amber-600" /></div><div><p className="text-sm font-medium text-amber-600">{t('expiring_soon')}</p><p className="text-2xl font-bold">{statusCounts.expiring_soon || 0}</p></div></CardContent></Card>
            <Card className="bg-red-50 border-red-200"><CardContent className="p-4 flex items-center gap-3"><div className="p-2 bg-red-100 rounded-full"><AlertTriangle className="h-5 w-5 text-red-600" /></div><div><p className="text-sm font-medium text-red-600">{t('expired')}</p><p className="text-2xl font-bold">{statusCounts.expired || 0}</p></div></CardContent></Card>
          </div>
          
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="relative lg:col-span-2">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input placeholder={t('search_supplies')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger><div className="flex items-center gap-2"><Filter className="h-4 w-4" /><SelectValue placeholder={t('filter_by_status')} /></div></SelectTrigger><SelectContent><SelectItem value="all">{t('all_statuses')}</SelectItem><SelectItem value="valid">{t('valid')}</SelectItem><SelectItem value="expiring_soon">{t('expiring_soon_status')}</SelectItem><SelectItem value="expired">{t('expired_status')}</SelectItem></SelectContent></Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger><div className="flex items-center gap-2"><Package className="h-4 w-4" /><SelectValue placeholder={t('filter_by_type')} /></div></SelectTrigger><SelectContent><SelectItem value="all">{t('all_types')}</SelectItem>{supplyTypes.map((type) => (<SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>))}</SelectContent></Select>
              </div>
              <div className="flex justify-between items-center mt-4">
                <p className="text-sm text-muted-foreground">{t('showing')} <span className="font-medium">{sortedItems.length}</span> {t('of')} <span className="font-medium">{inventoryItems.length}</span> {t('supplies')}</p>
                <Select value={sortBy} onValueChange={setSortBy}><SelectTrigger className="w-auto"><div className="flex items-center gap-2"><ArrowUpDown className="h-4 w-4" /><SelectValue placeholder={t('sort_by')} /></div></SelectTrigger><SelectContent align="end"><SelectItem value="name-asc">{t('name')} (A-Z)</SelectItem><SelectItem value="name-desc">{t('name')} (Z-A)</SelectItem><SelectItem value="expiry-asc">{t('expiry_date')} ({t('earliest')})</SelectItem><SelectItem value="expiry-desc">{t('expiry_date')} ({t('latest')})</SelectItem><SelectItem value="quantity-asc">{t('quantity')} ({t('lowest')})</SelectItem><SelectItem value="quantity-desc">{t('quantity')} ({t('highest')})</SelectItem></SelectContent></Select>
              </div>
            </CardContent>
          </Card>
          
          {isLoading ? (
            <p className="text-center">{t('loading')}</p>
          ) : sortedItems.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedItems.map((item) => (
                <SupplyCard key={item.id} supply={item} onDelete={loadData} />
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center"><Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><h3 className="font-medium text-lg mb-1">{t('no_supplies_found')}</h3><p className="text-muted-foreground mb-4">{t('try_different_filters')}</p><Button size="sm" variant="outline" onClick={() => { setSearchQuery(''); setStatusFilter('all'); setTypeFilter('all'); }}>{t('clear_filters')}</Button></Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default SuppliesPage;
