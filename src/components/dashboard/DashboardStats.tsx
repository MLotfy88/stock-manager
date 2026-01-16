
import React, { useState, useEffect } from 'react';
import { AlertTriangle, Package, Clock, CheckCircle2, PlusCircle, MinusCircle } from 'lucide-react';
import { calculateDashboardStats } from '@/data/operations/statsOperations';
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from '@/contexts/LanguageContext';
import { timeSince } from '@/utils/dateUtils';
import { DashboardStats as DashboardStatsType } from '@/types';
import { GlassStatCard } from '@/components/ui/glass-stat-card';
import { motion } from 'framer-motion';
import { staggerContainer, staggerItem } from '@/utils/animations';

const DashboardStats = () => {
  const [stats, setStats] = useState<Partial<DashboardStatsType>>({
    totalSupplies: 0,
    expiringSupplies: 0,
    expiredSupplies: 0,
    validSupplies: 0,
    typeCounts: {},
    recentActivities: []
  });
  const { t, getLocalizedName, language } = useLanguage();

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

  return (
    <div className="space-y-6">
      {/* Stat Cards with GlassStatCard */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4"
      >
        <motion.div variants={staggerItem}>
          <GlassStatCard
            title={t('total_supplies')}
            value={stats.totalSupplies || 0}
            icon={Package}
            color="blue"
          />
        </motion.div>
        <motion.div variants={staggerItem}>
          <GlassStatCard
            title={t('expiring_soon')}
            value={stats.expiringSupplies || 0}
            icon={Clock}
            color="orange"
          />
        </motion.div>
        <motion.div variants={staggerItem}>
          <GlassStatCard
            title={t('expired')}
            value={stats.expiredSupplies || 0}
            icon={AlertTriangle}
            color="red"
          />
        </motion.div>
        <motion.div variants={staggerItem}>
          <GlassStatCard
            title={t('valid_supplies')}
            value={stats.validSupplies || 0}
            icon={CheckCircle2}
            color="green"
          />
        </motion.div>
      </motion.div>

      {/* Type Distribution and Recent Activities */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="hover-lift">
          <CardContent className="p-6">
            <h3 className="text-base font-semibold mb-4">{t('by_type')}</h3>
            <div className="space-y-3">
              {Object.entries(stats.typeCounts || {}).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-muted-foreground">{getLocalizedName(type)}</span>
                  <span className="font-bold">{count as number}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardContent className="p-6">
            <h3 className="text-base font-semibold mb-4">{t('recent_activities')}</h3>
            <div className="space-y-4">
              {stats.recentActivities && stats.recentActivities.length > 0 ? (
                stats.recentActivities.map((activity, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full ${activity.type === 'supply' ? 'bg-green-100' : 'bg-red-100'} flex items-center justify-center flex-shrink-0`}>
                      {activity.type === 'supply' ? (
                        <PlusCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <MinusCircle className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {activity.type === 'supply' ? t('new_supplies_added') : t('new_consumption_recorded')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {timeSince(activity.date, language)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">{t('no_recent_activity')}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardStats;
