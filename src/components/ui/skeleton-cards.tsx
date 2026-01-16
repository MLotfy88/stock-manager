import React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonCardProps {
    variant?: 'default' | 'stat' | 'list-item' | 'table-row';
    className?: string;
    animate?: boolean;
}

/**
 * Premium Skeleton Loading Cards
 * Different variants for different use cases
 */
export const SkeletonCard: React.FC<SkeletonCardProps> = ({
    variant = 'default',
    className,
    animate = true,
}) => {
    const baseClasses = cn(
        'bg-gradient-to-r from-muted via-muted/80 to-muted',
        animate && 'animate-pulse',
        'rounded-2xl'
    );

    if (variant === 'stat') {
        return (
            <div className={cn(baseClasses, 'p-5 space-y-3', className)}>
                <div className="flex justify-between items-start">
                    <div className="space-y-2">
                        <div className="h-3 w-20 bg-muted-foreground/20 rounded" />
                        <div className="h-8 w-16 bg-muted-foreground/20 rounded" />
                    </div>
                    <div className="h-12 w-12 bg-muted-foreground/20 rounded-xl" />
                </div>
            </div>
        );
    }

    if (variant === 'list-item') {
        return (
            <div className={cn('flex items-center gap-4 p-4', className)}>
                <div className="h-12 w-12 bg-muted rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 bg-muted rounded" />
                    <div className="h-3 w-1/2 bg-muted rounded" />
                </div>
                <div className="h-6 w-16 bg-muted rounded-full" />
            </div>
        );
    }

    if (variant === 'table-row') {
        return (
            <div className={cn('flex items-center gap-4 p-4 border-b border-border/50', className)}>
                <div className="h-4 w-24 bg-muted rounded" />
                <div className="h-4 w-32 bg-muted rounded" />
                <div className="h-4 w-20 bg-muted rounded" />
                <div className="h-4 w-16 bg-muted rounded" />
                <div className="h-4 w-8 bg-muted rounded ml-auto" />
            </div>
        );
    }

    // Default card skeleton
    return (
        <div className={cn(baseClasses, 'p-5 space-y-4', className)}>
            <div className="flex items-start gap-4">
                <div className="h-14 w-14 bg-muted-foreground/20 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 bg-muted-foreground/20 rounded" />
                    <div className="h-3 w-1/2 bg-muted-foreground/20 rounded" />
                </div>
            </div>
            <div className="space-y-2">
                <div className="h-3 w-full bg-muted-foreground/20 rounded" />
                <div className="h-3 w-4/5 bg-muted-foreground/20 rounded" />
            </div>
            <div className="flex gap-2">
                <div className="h-8 w-20 bg-muted-foreground/20 rounded-full" />
                <div className="h-8 w-16 bg-muted-foreground/20 rounded-full" />
            </div>
        </div>
    );
};

/**
 * Skeleton Loading Grid - For dashboard stats
 */
export const SkeletonStatsGrid: React.FC<{ count?: number }> = ({ count = 4 }) => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: count }).map((_, i) => (
            <SkeletonCard key={i} variant="stat" />
        ))}
    </div>
);

/**
 * Skeleton Loading List
 */
export const SkeletonList: React.FC<{ count?: number }> = ({ count = 5 }) => (
    <div className="space-y-1 bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
        {Array.from({ length: count }).map((_, i) => (
            <SkeletonCard key={i} variant="list-item" />
        ))}
    </div>
);

export default SkeletonCard;
