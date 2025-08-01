import React, { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import DashboardStats from '@/components/dashboard/DashboardStats';
import ExpiryCalendar from '@/components/dashboard/ExpiryCalendar';
import SupplyList from '@/components/supplies/SupplyList';
import Notification from '@/components/ui/Notification';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, ChevronRight, PlusCircle, MinusCircle } from 'lucide-react';
import { useMediaQuery } from '@/hooks/use-mobile';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate, Link } from 'react-router-dom';
import { calculateDashboardStats } from '@/data/operations/statsOperations';
import { UrgentActionsBox } from '@/components/dashboard/UrgentActionsBox';
import { DashboardStats as StatsType } from '@/types';

const Index = () => {
  const [stats, setStats] = useState<Partial<StatsType>>({ expiringSupplies: 0, reorderPointItems: 0 });
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
    const timer = setTimeout(() => {
      if (stats.expiringSupplies && stats.expiringSupplies > 0) {
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
            {/* Quick Action Buttons */}
            <div className="flex w-full md:w-auto gap-2">
              <Button asChild className="flex-1 gap-2">
                <Link to="/add-supply">
                  <PlusCircle className="h-4 w-4" /> {t('add_invoice')}
                </Link>
              </Button>
              <Button asChild variant="secondary" className="flex-1 gap-2">
                <Link to="/consumption">
                  <MinusCircle className="h-4 w-4" /> {t('new_consumption')}
                </Link>
              </Button>
            </div>
          </div>

          {/* Urgent Actions Box */}
          <UrgentActionsBox 
            expiringSoonCount={stats.expiringSupplies || 0}
            reorderPointCount={stats.reorderPointItems || 0}
          />
          
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
