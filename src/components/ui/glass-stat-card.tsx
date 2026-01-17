import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface GlassStatCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    color?: 'blue' | 'green' | 'red' | 'orange' | 'purple' | 'teal';
    className?: string;
    onClick?: () => void;
}

const colorClasses = {
    blue: {
        bg: 'from-blue-500/20 to-blue-600/10 dark:from-blue-500/30 dark:to-blue-600/20',
        icon: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
        glow: 'shadow-blue-500/20',
    },
    green: {
        bg: 'from-green-500/20 to-green-600/10 dark:from-green-500/30 dark:to-green-600/20',
        icon: 'bg-green-500/20 text-green-600 dark:text-green-400',
        glow: 'shadow-green-500/20',
    },
    red: {
        bg: 'from-red-500/20 to-red-600/10 dark:from-red-500/30 dark:to-red-600/20',
        icon: 'bg-red-500/20 text-red-600 dark:text-red-400',
        glow: 'shadow-red-500/20',
    },
    orange: {
        bg: 'from-orange-500/20 to-orange-600/10 dark:from-orange-500/30 dark:to-orange-600/20',
        icon: 'bg-orange-500/20 text-orange-600 dark:text-orange-400',
        glow: 'shadow-orange-500/20',
    },
    purple: {
        bg: 'from-purple-500/20 to-purple-600/10 dark:from-purple-500/30 dark:to-purple-600/20',
        icon: 'bg-purple-500/20 text-purple-600 dark:text-purple-400',
        glow: 'shadow-purple-500/20',
    },
    teal: {
        bg: 'from-teal-500/20 to-teal-600/10 dark:from-teal-500/30 dark:to-teal-600/20',
        icon: 'bg-teal-500/20 text-teal-600 dark:text-teal-400',
        glow: 'shadow-teal-500/20',
    },
};

/**
 * GlassStatCard - Premium glassmorphism statistics card
 * With gradient backgrounds, animated hover effects, and trends
 */
export const GlassStatCard: React.FC<GlassStatCardProps> = ({
    title,
    value,
    icon: Icon,
    trend,
    color = 'blue',
    className,
    onClick,
}) => {
    const colors = colorClasses[color];

    return (
        <div
            onClick={onClick}
            className={cn(
                'relative overflow-hidden rounded-2xl p-4 md:p-5',
                'bg-gradient-to-br backdrop-blur-xl',
                'border border-white/20 dark:border-white/10',
                'transition-all duration-300 ease-out',
                'hover:scale-[1.02] hover:shadow-xl',
                'h-full min-h-[120px]',
                colors.bg,
                colors.glow,
                onClick && 'cursor-pointer',
                className
            )}
        >
            {/* Decorative gradient orb */}
            <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gradient-to-br from-white/10 to-transparent blur-2xl" />

            <div className="relative flex items-start justify-between">
                <div className="space-y-2">
                    <p className="text-xs md:text-sm font-medium text-muted-foreground uppercase tracking-wide">
                        {title}
                    </p>
                    <p className="text-2xl md:text-3xl font-bold tracking-tight">
                        {value}
                    </p>

                    {trend && (
                        <div className={cn(
                            'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full',
                            trend.isPositive
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        )}>
                            <span>{trend.isPositive ? '↑' : '↓'}</span>
                            <span>{Math.abs(trend.value)}%</span>
                        </div>
                    )}
                </div>

                <div className={cn(
                    'p-3 rounded-xl',
                    colors.icon
                )}>
                    <Icon className="h-5 w-5 md:h-6 md:w-6" />
                </div>
            </div>
        </div>
    );
};

export default GlassStatCard;
