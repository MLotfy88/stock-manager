import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { useMediaQuery } from '@/hooks/use-mobile';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FileText, AlertTriangle, Package, ArrowRight, ShoppingCart } from 'lucide-react';

const ReportsPage = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 1024px)');
  const { t, direction } = useLanguage();

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => isMobile && setIsSidebarOpen(false);

  const reportCards = [
    {
      title: t('inventory_report'),
      description: t('inventory_report_desc'),
      icon: <FileText className="h-8 w-8 text-blue-500" />,
      link: '/inventory-report',
    },
    {
      title: t('reorder_point_report'),
      description: t('reorder_point_report_desc'),
      icon: <AlertTriangle className="h-8 w-8 text-yellow-500" />,
      link: '/reorder-point-report',
    },
    {
      title: t('consumption_report'),
      description: t('consumption_report_desc'),
      icon: <ShoppingCart className="h-8 w-8 text-green-500" />,
      link: '/consumption-report',
    },
    {
      title: t('expiry_report'),
      description: t('expiry_report_desc'),
      icon: <Package className="h-8 w-8 text-red-500" />,
      link: '/alerts', // Alerts page already serves as an expiry report
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background dark:from-slate-900 dark:to-slate-950 pb-20" dir={direction}>
      <Header toggleSidebar={toggleSidebar} />
      <Sidebar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} closeSidebar={closeSidebar} />

      <main className={`pt-20 transition-all duration-300 ${isMobile ? 'px-4' : direction === 'rtl' ? 'pr-72 pl-8' : 'pl-72 pr-8'}`}>
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t('reports_nav')}</h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">{t('reports_hub_description')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {reportCards.map((card, index) => (
              <Link to={card.link} key={index} className="group block">
                <Card className="mobile-card-interactive h-full group-hover:border-primary/50">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-semibold">{card.title}</CardTitle>
                      <div className="p-2 rounded-xl bg-muted/50 group-hover:bg-primary/10 transition-colors">
                        {card.icon}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{card.description}</CardDescription>
                    <div className="mt-4 flex items-center text-sm font-medium text-primary group-hover:text-primary/80">
                      {t('view_report')}
                      <ArrowRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-1" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ReportsPage;
