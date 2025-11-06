
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { useMediaQuery } from '@/hooks/use-mobile';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Bell, CheckCircle, Clock } from 'lucide-react';
import { InventoryItem, ProductDefinition, Manufacturer } from '@/types';
import { getInventoryItems } from '@/data/operations/suppliesOperations';
import { getProductDefinitions } from '@/data/operations/productDefinitionOperations';
import { getManufacturers } from '@/data/operations/manufacturerOperations';
import { useEffect } from 'react';

// Helper function to classify alerts by severity
const getAlertSeverity = (daysRemaining: number, alertPeriod: number) => {
  if (daysRemaining <= 0) {
    return 'expired';
  }
  if (daysRemaining <= alertPeriod) {
    return 'critical';
  }
  if (daysRemaining <= alertPeriod + 15) {
    return 'replacement';
  }
  return 'ok';
};

const AlertsPage = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { t, direction } = useLanguage();
  const navigate = useNavigate();

  const handleViewDetails = (supplyId: string) => {
    // Navigate to the supplies page, in the future this could be a specific item details page
    // For now, we can just go to the main supplies list.
    // A more advanced implementation could be: navigate(`/supplies/${supplyId}`);
    navigate('/supplies');
  };

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const closeSidebar = () => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  };

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [productDefs, setProductDefs] = useState<ProductDefinition[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [inventoryData, defsData, manufacturersData] = await Promise.all([
          getInventoryItems(),
          getProductDefinitions(),
          getManufacturers(),
        ]);
        setInventory(inventoryData);
        setProductDefs(defsData);
        setManufacturers(manufacturersData);
      } catch (error) {
        console.error("Failed to fetch alerts data", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filter supplies by their expiration date and calculate days remaining
  const suppliesWithAlerts = inventory
  .filter(item => item.quantity > 0) // Exclude items with zero quantity
  .map((item) => {
    const expiryDate = new Date(item.expiry_date);
    const today = new Date();
    const timeDiff = expiryDate.getTime() - today.getTime();
    const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
    const def = productDefs.find(d => d.id === item.product_definition_id);
    const manufacturer = manufacturers.find(m => m.id === item.manufacturer_id);
    const alertPeriod = item.alert_period || 30; // Default to 30 if not set

    return {
      ...item,
      name: def?.name || 'N/A',
      manufacturerName: manufacturer?.name || 'N/A',
      daysRemaining,
      severity: getAlertSeverity(daysRemaining, alertPeriod)
    };
  });
  
  // Group alerts by severity
  const replacementAlerts = suppliesWithAlerts.filter(s => s.severity === 'replacement');
  const criticalAlerts = suppliesWithAlerts.filter(s => s.severity === 'critical');
  const expiredItems = suppliesWithAlerts.filter(s => s.severity === 'expired');
  
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
              <h1 className="text-2xl md:text-3xl font-bold mb-1">{t('alerts_nav')}</h1>
              <p className="text-muted-foreground text-sm md:text-base">
                {t('alerts_overview')}
              </p>
            </div>
          </div>
          
          {/* Alert Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <Bell className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-600">{t('replacement_action_alerts')}</p>
                    <p className="text-2xl font-bold">{replacementAlerts.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-full">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-red-600">{t('critical_alerts')}</p>
                    <p className="text-2xl font-bold">{criticalAlerts.length}</p>
                  </div>
                </div>
                <Badge variant="destructive" className="mr-2">
                  &lt; 30 {t('days')}
                </Badge>
              </CardContent>
            </Card>
            
            <Card className="bg-gray-50 border-gray-200">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-200 rounded-full">
                    <Bell className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">{t('expired_items')}</p>
                    <p className="text-2xl font-bold">{expiredItems.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Replacement Action Alerts Section */}
          <Card className="mb-8">
            <CardHeader className="bg-blue-50 pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="h-5 w-5 text-blue-600" />
                {t('replacement_action_alerts')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {replacementAlerts.length > 0 ? (
                <div className="divide-y">
                  {replacementAlerts.map((supply) => (
                    <div key={supply.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-medium flex items-center gap-2">
                            {`${supply.name} (${supply.variant})`}
                            <Badge variant="outline" className="ml-2 bg-blue-100 text-blue-800 border-blue-200">
                              {supply.daysRemaining} {t('days_remaining')}
                            </Badge>
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {t('batch')}: {supply.batch_number} | {t('supplier')}: {supply.supplier_name || 'N/A'}
                          </p>
                        </div>
                        <Button size="sm" variant="outline" className="text-xs" onClick={() => handleViewDetails(supply.id)}>
                          {t('view_details')}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="font-medium text-lg mb-1">{t('no_critical_alerts')}</h3>
                  <p className="text-muted-foreground">{t('all_supplies_safe')}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Critical Alerts Section */}
          <Card className="mb-8">
            <CardHeader className="bg-red-50 pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                {t('critical_alerts')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {criticalAlerts.length > 0 ? (
                <div className="divide-y">
                  {criticalAlerts.map((supply) => (
                    <div key={supply.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-center mb-2">
                        <div>
                          <h3 className="font-medium flex items-center gap-2">
                            {`${supply.name} (${supply.variant})`}
                            <Badge variant="destructive" className="ml-2">
                              {supply.daysRemaining <= 0 
                                ? t('expired') 
                                : `${supply.daysRemaining} ${t('days_remaining')}`}
                            </Badge>
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {t('batch')}: {supply.batch_number} | {t('manufacturer')}: {supply.manufacturerName}
                          </p>
                        </div>
                        <Button size="sm" variant="outline" className="text-xs" onClick={() => handleViewDetails(supply.id)}>
                          {t('view_details')}
                        </Button>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                        <div 
                          className="bg-red-600 h-1.5 rounded-full" 
                          style={{ width: `${Math.max(100 - (supply.daysRemaining / 30) * 100, 0)}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="font-medium text-lg mb-1">{t('no_critical_alerts')}</h3>
                  <p className="text-muted-foreground">{t('all_supplies_safe')}</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Expired Items Section */}
          <Card>
            <CardHeader className="bg-gray-100 pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="h-5 w-5 text-gray-600" />
                {t('expired_items')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {expiredItems.length > 0 ? (
                <div className="divide-y">
                  {expiredItems.map((supply) => (
                    <div key={supply.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-medium flex items-center gap-2">
                            {`${supply.name} (${supply.variant})`}
                            <Badge variant="destructive" className="ml-2">
                              {t('expired_status')}
                            </Badge>
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {t('batch')}: {supply.batch_number} | {t('manufacturer')}: {supply.manufacturerName}
                          </p>
                        </div>
                        <Button size="sm" variant="outline" className="text-xs" onClick={() => handleViewDetails(supply.id)}>
                          {t('view_details')}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="font-medium text-lg mb-1">{t('no_expired_items')}</h3>
                  <p className="text-muted-foreground">{t('all_supplies_valid')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default AlertsPage;
