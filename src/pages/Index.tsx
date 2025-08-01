import React, { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import DashboardStats from '@/components/dashboard/DashboardStats';
import ExpiryCalendar from '@/components/dashboard/ExpiryCalendar';
import SupplyList from '@/components/supplies/SupplyList';
import Notification from '@/components/ui/Notification';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, ChevronRight } from 'lucide-react';
import { useMediaQuery } from '@/hooks/use-mobile';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { calculateDashboardStats } from '@/data/operations/statsOperations';

const Index = () => {
  const [stats, setStats] = useState({ expiringSupplies: 0 });
  const [showNotification, setShowNotification] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { t, direction } = useLanguage();
  const navigate = useNavigate();

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const closeSidebar = () => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  };

  useEffect(() => {
    setIsSidebarOpen(!isMobile);
  }, [isMobile]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await calculateDashboardStats();
        setStats(data);
      } catch (error) {
        console.error("Failed to fetch dashboard stats", error);
      }
    };
    fetchStats();
  }, []);
  
  useEffect(() => {
    // Show notification after a short delay for better UX
    const timer = setTimeout(() => {
      if (stats.expiringSupplies > 0) {
        setShowNotification(true);
      }
    }, 1500);
    
    return () => clearTimeout(timer);
  }, [stats.expiringSupplies]);
  
  return (
    <div className="page-container bg-background" dir={direction}>
      <Header toggleSidebar={toggleSidebar} />
      <Sidebar 
        isSidebarOpen={isSidebarOpen} 
        toggleSidebar={toggleSidebar}
        closeSidebar={closeSidebar}
      />
      
      {showNotification && (
        <Notification 
          title={t('expiry_alert')}
          message={t('supplies_expiring_alert')}
          type="warning"
          onClose={() => setShowNotification(false)}
        />
      )}
      
      <main className={`px-4 md:px-8 ${direction === 'rtl' ? 'md:pr-72' : 'md:pl-72'} transition-all`}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 animate-fade-in">
            <div className="w-full">
              <Badge variant="outline" className="mb-2 bg-primary/10 text-primary border-primary/20">
                {t('welcome')}
              </Badge>
              <h1 className="text-2xl md:text-3xl font-bold mb-1 text-foreground">{t('dashboard')}</h1>
              <p className="text-muted-foreground text-sm md:text-base">
                {t('dashboard_overview')}
              </p>
            </div>
            <Button 
              className="gap-2 w-full md:w-auto bg-primary hover:bg-primary/90 group transition-all shadow" 
              onClick={() => navigate('/add-supply')}
            >
              <Plus className="h-4 w-4" />
              {t('add_new_supply')}
              <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all -mr-2 group-hover:mr-0" />
            </Button>
          </div>
          
          <div className="mb-8 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <DashboardStats />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-8 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="lg:col-span-8">
              <div className="content-card">
                <SupplyList 
                  title={t('supplies_expiring_soon')} 
                  status="expiring_soon"
                  limit={6}
                />
              </div>
            </div>
            <div className="lg:col-span-4">
              <div className="content-card h-full p-4">
                <ExpiryCalendar />
              </div>
            </div>
          </div>
          
          <div className="mt-8 animate-fade-in content-card" style={{ animationDelay: '0.3s' }}>
            <SupplyList 
              title={t('latest_supplies')} 
              status="all"
              limit={4}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
