
import React, { useState } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { useMediaQuery } from '@/hooks/use-mobile';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { Factory, Truck, Warehouse, Tag } from 'lucide-react';
import ManufacturersPage from './ManufacturersPage';
import SuppliersPage from './SuppliersPage';
import StoresPage from './StoresPage';
import ProductDefinitionsPage from './SupplyTypesPage';

const AdminPage = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { t, direction } = useLanguage();

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const closeSidebar = () => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50 pb-10" dir={direction}>
      <Header toggleSidebar={toggleSidebar} />
      <Sidebar 
        isSidebarOpen={isSidebarOpen} 
        toggleSidebar={toggleSidebar}
        closeSidebar={closeSidebar}
      />
      
      <main className={`pt-20 ${isMobile ? 'px-4' : direction === 'rtl' ? 'pr-72 pl-8' : 'pl-72 pr-8'}`}>
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">{t('admin_settings')}</h1>
          
          <Tabs defaultValue="definitions" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="definitions"><Tag className="mr-2 h-4 w-4" />{t('product_definitions_nav')}</TabsTrigger>
              <TabsTrigger value="manufacturers"><Factory className="mr-2 h-4 w-4" />{t('manufacturers_nav')}</TabsTrigger>
              <TabsTrigger value="suppliers"><Truck className="mr-2 h-4 w-4" />{t('suppliers_nav')}</TabsTrigger>
              <TabsTrigger value="stores"><Warehouse className="mr-2 h-4 w-4" />{t('stores_nav')}</TabsTrigger>
            </TabsList>
            
            <TabsContent value="definitions" className="mt-4">
              <ProductDefinitionsPage />
            </TabsContent>
            <TabsContent value="manufacturers" className="mt-4">
              <ManufacturersPage />
            </TabsContent>
            <TabsContent value="suppliers" className="mt-4">
              <SuppliersPage />
            </TabsContent>
            <TabsContent value="stores" className="mt-4">
              <StoresPage />
            </TabsContent>
            
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default AdminPage;
