import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface TimelineItem {
    id: string;
    title: string;
    description?: string;
    date: Date;
    type: 'add' | 'consume' | 'transfer' | 'alert' | 'other';
    metadata?: {
        quantity?: number;
        user?: string;
        store?: string;
    };
}

interface ActivityTimelineProps {
    items: TimelineItem[];
    className?: string;
    showDate?: boolean;
}

const typeConfig = {
    add: {
        color: 'bg-green-500',
        bgColor: 'bg-green-50 dark:bg-green-950/30',
        icon: '+',
    },
    consume: {
        color: 'bg-orange-500',
        bgColor: 'bg-orange-50 dark:bg-orange-950/30',
        icon: '-',
    },
    transfer: {
        color: 'bg-blue-500',
        bgColor: 'bg-blue-50 dark:bg-blue-950/30',
        icon: '↔',
    },
    alert: {
        color: 'bg-red-500',
        bgColor: 'bg-red-50 dark:bg-red-950/30',
        icon: '!',
    },
    other: {
        color: 'bg-gray-500',
        bgColor: 'bg-gray-50 dark:bg-gray-900',
        icon: '•',
    },
};

/**
 * ActivityTimeline - Beautiful timeline for showing recent activity
 * With animations and grouping by date
 */
export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({
    items,
    className,
    showDate = true,
}) => {
    return (
        <div className={cn('space-y-4', className)}>
            {items.map((item, index) => {
                const config = typeConfig[item.type];

                return (
                    <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex gap-4"
                    >
                        {/* Timeline line and dot */}
                        <div className="flex flex-col items-center">
                            <div className={cn(
                                'w-8 h-8 rounded-full flex items-center justify-center',
                                'font-bold text-white text-sm',
                                config.color
                            )}>
                                {config.icon}
                            </div>
                            {index < items.length - 1 && (
                                <div className="w-0.5 flex-1 bg-border/50 my-2" />
                            )}
                        </div>

                        {/* Content */}
                        <div className={cn(
                            'flex-1 rounded-xl p-3',
                            config.bgColor
                        )}>
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <h4 className="font-semibold text-sm">{item.title}</h4>
                                    {item.description && (
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {item.description}
                                        </p>
                                    )}
                                </div>
                                {showDate && (
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                                        {format(item.date, 'h:mm a', { locale: ar })}
                                    </span>
                                )}
                            </div>

                            {item.metadata && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {item.metadata.quantity !== undefined && (
                                        <span className="text-xs bg-white dark:bg-slate-800 px-2 py-0.5 rounded-full">
                                            الكمية: <strong>{item.metadata.quantity}</strong>
                                        </span>
                                    )}
                                    {item.metadata.user && (
                                        <span className="text-xs bg-white dark:bg-slate-800 px-2 py-0.5 rounded-full">
                                            {item.metadata.user}
                                        </span>
                                    )}
                                    {item.metadata.store && (
                                        <span className="text-xs bg-white dark:bg-slate-800 px-2 py-0.5 rounded-full">
                                            {item.metadata.store}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
};

export default ActivityTimeline;
