import React, { useState, useRef, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface PullToRefreshProps {
    children: ReactNode;
    onRefresh: () => Promise<void>;
    className?: string;
    threshold?: number;
}

/**
 * PullToRefresh - Pull-to-refresh functionality for mobile
 * Shows a loading indicator when pulled down
 */
export const PullToRefresh: React.FC<PullToRefreshProps> = ({
    children,
    onRefresh,
    className,
    threshold = 80,
}) => {
    const [pullDistance, setPullDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const startY = useRef(0);
    const isPulling = useRef(false);

    const handleTouchStart = (e: React.TouchEvent) => {
        if (containerRef.current?.scrollTop === 0) {
            startY.current = e.touches[0].clientY;
            isPulling.current = true;
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isPulling.current || isRefreshing) return;

        const currentY = e.touches[0].clientY;
        const diff = currentY - startY.current;

        if (diff > 0 && containerRef.current?.scrollTop === 0) {
            // Apply resistance to the pull
            const resistance = 0.4;
            setPullDistance(diff * resistance);
        }
    };

    const handleTouchEnd = async () => {
        isPulling.current = false;

        if (pullDistance >= threshold && !isRefreshing) {
            setIsRefreshing(true);
            setPullDistance(60); // Keep indicator visible

            try {
                await onRefresh();
            } finally {
                setIsRefreshing(false);
                setPullDistance(0);
            }
        } else {
            setPullDistance(0);
        }
    };

    const progress = Math.min(pullDistance / threshold, 1);

    return (
        <div
            ref={containerRef}
            className={cn('relative overflow-auto', className)}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Pull indicator */}
            <div
                className={cn(
                    'absolute left-1/2 -translate-x-1/2 z-50 transition-all duration-300',
                    pullDistance > 0 || isRefreshing ? 'opacity-100' : 'opacity-0'
                )}
                style={{
                    top: Math.min(pullDistance - 50, 20),
                }}
            >
                <div className={cn(
                    'flex items-center justify-center w-12 h-12 rounded-full',
                    'bg-primary text-primary-foreground shadow-lg',
                    isRefreshing && 'animate-bounce'
                )}>
                    <Loader2
                        className={cn(
                            'h-6 w-6',
                            isRefreshing ? 'animate-spin' : ''
                        )}
                        style={{
                            transform: isRefreshing ? undefined : `rotate(${progress * 360}deg)`,
                        }}
                    />
                </div>
            </div>

            {/* Content wrapper */}
            <div
                style={{
                    transform: `translateY(${pullDistance}px)`,
                    transition: pullDistance === 0 ? 'transform 0.3s ease-out' : 'none',
                }}
            >
                {children}
            </div>
        </div>
    );
};

export default PullToRefresh;
