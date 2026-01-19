import React, { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import DashboardStats from '@/components/dashboard/DashboardStats';
import QuickInsightsCards from '@/components/dashboard/QuickInsightsCards';
import RecentAlertsWidget from '@/components/dashboard/RecentAlertsWidget';
import Notification from '@/components/ui/Notification';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, MinusCircle, Sparkles } from 'lucide-react';
import { useMediaQuery } from '@/hooks/use-mobile';
import { useLanguage } from '@/contexts/LanguageContext';
import { Link } from 'react-router-dom';
import { calculateDashboardStats } from '@/data/operations/statsOperations';
import { UrgentActionsBox } from '@/components/dashboard/UrgentActionsBox';
import { DashboardStats as StatsType } from '@/types';
import { motion } from 'framer-motion';
import { getInventoryItems } from '@/data/operations/suppliesOperations';
import { differenceInDays, parseISO, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';

const Index = () => {
  const [stats, setStats] = useState<Partial<StatsType>>({ expiringSupplies: 0, reorderPointItems: 0 });
  const [showNotification, setShowNotification] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [insightData, setInsightData] = useState({
    expiringThisWeek: 0,
    lowStockCount: 0,
    todayConsumption: 0,
  });
  const isMobile = useMediaQuery('(max-width: 1024px)');
  const { t, direction } = useLanguage();

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => { if (isMobile) setIsSidebarOpen(false); };

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
    const fetchInsights = async () => {
      try {
        const items = await getInventoryItems();
        const today = new Date();
        const weekStart = startOfWeek(today, { weekStartsOn: 0 });
        const weekEnd = endOfWeek(today, { weekStartsOn: 0 });

        let expiringThisWeek = 0;
        let lowStockCount = 0;

        items.forEach((item) => {
          const expiryDate = parseISO(item.expiry_date);
          if (isWithinInterval(expiryDate, { start: today, end: weekEnd })) {
            expiringThisWeek++;
          }
          if (item.quantity <= item.reorder_point) {
            lowStockCount++;
          }
        });

        setInsightData({
          expiringThisWeek,
          lowStockCount,
          todayConsumption: 0, // This would need a separate consumption query
        });
      } catch (error) {
        console.error("Failed to fetch insights", error);
      }
    };
    fetchInsights();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (stats.expiringSupplies && stats.expiringSupplies > 0) {
        setShowNotification(true);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [stats.expiringSupplies]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4 },
    },
  };

  return (
    <div className="min-h-screen bg-background dark:bg-slate-950 pb-20" dir={direction}>
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

      <motion.main
        className={`pt-20 px-4 md:px-8 ${direction === 'rtl' ? 'md:pr-72' : 'md:pl-72'} transition-all`}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header Section */}
          <motion.div
            className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
            variants={itemVariants}
          >
            <div className="w-full">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                  {t('welcome')}
                </Badge>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold mb-1 text-foreground">{t('dashboard')}</h1>
              <p className="text-muted-foreground text-sm md:text-base">
                {t('dashboard_overview')}
              </p>
            </div>
            {/* Quick Action Buttons */}
            <div className="flex w-full md:w-auto gap-2">
              <Button asChild className="flex-1 gap-2 shadow-md hover:shadow-lg transition-shadow">
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
          </motion.div>

          {/* Urgent Actions Box */}
          <motion.div variants={itemVariants}>
            <UrgentActionsBox
              expiringSoonCount={stats.expiringSupplies || 0}
              reorderPointCount={stats.reorderPointItems || 0}
            />
          </motion.div>

          {/* Stats Cards */}
          <motion.div variants={itemVariants}>
            <DashboardStats />
          </motion.div>

          {/* Quick Insights */}
          <motion.div variants={itemVariants}>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              {t('quick_insights')}
            </h2>
            <QuickInsightsCards
              expiringSoonCount={stats.expiringSupplies || 0}
              expiringThisWeek={insightData.expiringThisWeek}
              lowStockCount={insightData.lowStockCount}
              todayConsumption={insightData.todayConsumption}
            />
          </motion.div>

          {/* Alerts Widget */}
          <motion.div variants={itemVariants}>
            <RecentAlertsWidget />
          </motion.div>
        </div>
      </motion.main>
    </div>
  );
};

export default Index;

