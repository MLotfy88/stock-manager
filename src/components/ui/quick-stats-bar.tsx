import React from 'react';
import { cn } from '@/lib/utils';
import { AlertTriangle, CheckCircle, Clock, Package, TrendingUp, TrendingDown } from 'lucide-react';

interface QuickStatsBarProps {
    stats: {
        totalItems: number;
        expiringItems: number;
        lowStock: number;
        thisMonth: {
            consumption: number;
            trend: 'up' | 'down' | 'stable';
            percentage: number;
        };
    };
    className?: string;
}

/**
 * QuickStatsBar - Floating stats bar at the top of pages
 * Shows key metrics at a glance
 */
export const QuickStatsBar: React.FC<QuickStatsBarProps> = ({ stats, className }) => {
    return (
        <div className={cn(
            'flex items-center gap-3 md:gap-6 overflow-x-auto scrollbar-hide py-3 px-4',
            'bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg',
            'border-b border-border/50',
            '-mx-4 md:mx-0 md:rounded-2xl md:border',
            className
        )}>
            {/* Total Items */}
            <div className="flex items-center gap-2 shrink-0">
                <div className="p-1.5 bg-primary/10 rounded-lg">
                    <Package className="h-4 w-4 text-primary" />
                </div>
                <div className="text-sm">
                    <span className="font-bold">{stats.totalItems.toLocaleString()}</span>
                    <span className="text-muted-foreground ml-1 text-xs">عنصر</span>
                </div>
            </div>

            <div className="w-px h-8 bg-border/50 shrink-0" />

            {/* Expiring Soon */}
            <div className="flex items-center gap-2 shrink-0">
                <div className="p-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                    <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="text-sm">
                    <span className="font-bold text-amber-600 dark:text-amber-400">{stats.expiringItems}</span>
                    <span className="text-muted-foreground ml-1 text-xs">قريب الانتهاء</span>
                </div>
            </div>

            <div className="w-px h-8 bg-border/50 shrink-0" />

            {/* Low Stock */}
            <div className="flex items-center gap-2 shrink-0">
                <div className="p-1.5 bg-red-100 dark:bg-red-900/30 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                </div>
                <div className="text-sm">
                    <span className="font-bold text-red-600 dark:text-red-400">{stats.lowStock}</span>
                    <span className="text-muted-foreground ml-1 text-xs">تحت حد الطلب</span>
                </div>
            </div>

            <div className="w-px h-8 bg-border/50 shrink-0" />

            {/* Monthly Consumption */}
            <div className="flex items-center gap-2 shrink-0">
                <div className={cn(
                    'p-1.5 rounded-lg',
                    stats.thisMonth.trend === 'up'
                        ? 'bg-green-100 dark:bg-green-900/30'
                        : stats.thisMonth.trend === 'down'
                            ? 'bg-blue-100 dark:bg-blue-900/30'
                            : 'bg-gray-100 dark:bg-gray-800'
                )}>
                    {stats.thisMonth.trend === 'up' ? (
                        <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                    ) : stats.thisMonth.trend === 'down' ? (
                        <TrendingDown className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    ) : (
                        <CheckCircle className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    )}
                </div>
                <div className="text-sm">
                    <span className="font-bold">{stats.thisMonth.consumption}</span>
                    <span className="text-muted-foreground ml-1 text-xs">هذا الشهر</span>
                    {stats.thisMonth.trend !== 'stable' && (
                        <span className={cn(
                            'ml-1 text-xs',
                            stats.thisMonth.trend === 'up' ? 'text-green-600' : 'text-blue-600'
                        )}>
                            ({stats.thisMonth.trend === 'up' ? '+' : '-'}{stats.thisMonth.percentage}%)
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default QuickStatsBar;
