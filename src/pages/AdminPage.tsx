
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
import { Factory, Truck, Warehouse, Tag, Shapes } from 'lucide-react';
import { ManufacturersPageContent } from './ManufacturersPage';
import { SuppliersPageContent } from './SuppliersPage';
import { StoresPageContent } from './StoresPage';
import { ProductDefinitionsPageContent } from './SupplyTypesPage';
import { SupplyTypesManagementPageContent } from './SupplyTypesManagementPage';

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
          <h1 className="text-2xl font-bold mb-6">{t('data_settings_nav')}</h1>
          
          <Tabs defaultValue="definitions" className="w-full">
            <div className="md:flex md:space-x-4">
              <TabsList className="grid w-full md:w-auto md:grid-cols-1 md:h-full">
                <TabsTrigger value="definitions"><Tag className="mr-2 h-4 w-4" />{t('product_definitions_nav')}</TabsTrigger>
                <TabsTrigger value="supplyTypes"><Shapes className="mr-2 h-4 w-4" />{t('supply_types_nav')}</TabsTrigger>
                <TabsTrigger value="manufacturers"><Factory className="mr-2 h-4 w-4" />{t('manufacturers_nav')}</TabsTrigger>
                <TabsTrigger value="suppliers"><Truck className="mr-2 h-4 w-4" />{t('suppliers_nav')}</TabsTrigger>
                <TabsTrigger value="stores"><Warehouse className="mr-2 h-4 w-4" />{t('stores_nav')}</TabsTrigger>
              </TabsList>
              
              <div className="flex-1 mt-4 md:mt-0">
                <TabsContent value="definitions">
                  <ProductDefinitionsPageContent />
                </TabsContent>
                <TabsContent value="supplyTypes">
                  <SupplyTypesManagementPageContent />
                </TabsContent>
                <TabsContent value="manufacturers">
                  <ManufacturersPageContent />
                </TabsContent>
                <TabsContent value="suppliers">
                  <SuppliersPageContent />
                </TabsContent>
                <TabsContent value="stores">
                  <StoresPageContent />
                </TabsContent>
              </div>
            </div>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default AdminPage;
