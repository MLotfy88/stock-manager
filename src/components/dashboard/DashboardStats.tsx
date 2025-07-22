
import React from 'react';
import { AlertTriangle, Package, Clock, CheckCircle2 } from 'lucide-react';
import { calculateDashboardStats } from '@/data/mockData';
import { Card, CardContent } from "@/components/ui/card";
import { supplyTypeTranslations } from '@/data/mockData';
import { useLanguage } from '@/contexts/LanguageContext';

const DashboardStats = () => {
  const stats = calculateDashboardStats();
  const { t, getLocalizedName } = useLanguage();
  
  const statCards = [
    {
      title: t('total_supplies'),
      value: stats.totalSupplies,
      icon: <Package className="w-5 h-5 text-primary" />,
      color: 'bg-primary/10 text-primary'
    },
    {
      title: t('expiring_soon'),
      value: stats.expiringSupplies,
      icon: <Clock className="w-5 h-5 text-amber-500" />,
      color: 'bg-amber-100 text-amber-500'
    },
    {
      title: t('expired'),
      value: stats.expiredSupplies,
      icon: <AlertTriangle className="w-5 h-5 text-destructive" />,
      color: 'bg-destructive/10 text-destructive'
    },
    {
      title: t('valid_supplies'),
      value: stats.validSupplies,
      icon: <CheckCircle2 className="w-5 h-5 text-green-500" />,
      color: 'bg-green-100 text-green-500'
    }
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, index) => (
          <Card key={index} className="hover-lift overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">{card.title}</p>
                  <h3 className="text-3xl font-bold mt-1">{card.value}</h3>
                </div>
                <div className={`p-3 rounded-full ${card.color}`}>
                  {card.icon}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="hover-lift">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-primary rounded-full"></span>
              {t('by_type')}
            </h3>
            <div className="space-y-3">
              {Object.entries(stats.typeCounts || {}).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-sm font-medium">{getLocalizedName(supplyTypeTranslations[type] || type)}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm font-bold">{count as number}</span>
                    <div className="w-16 h-2 bg-gray-100 rounded-full ml-2">
                      <div 
                        className="h-full bg-primary rounded-full" 
                        style={{ width: `${((count as number) / stats.totalSupplies) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover-lift">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-secondary rounded-full"></span>
              {t('recent_activities')}
            </h3>
            <div className="space-y-4">
              {[1, 2, 3].map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0">
                    <Package className="w-4 h-4 text-secondary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t('new_supplies_added')}</p>
                    <p className="text-xs text-muted-foreground">{t('hours_ago').replace('{0}', String(5 - i))}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardStats;
