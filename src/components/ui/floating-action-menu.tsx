import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface FloatingActionItem {
    icon: LucideIcon;
    label: string;
    onClick: () => void;
    color?: string;
}

interface FloatingActionMenuProps {
    items: FloatingActionItem[];
    mainIcon: LucideIcon;
    isOpen: boolean;
    onToggle: () => void;
    position?: 'bottom-right' | 'bottom-left';
    className?: string;
}

/**
 * FloatingActionMenu - Expandable FAB with multiple actions
 * Beautiful animations and premium feel
 */
export const FloatingActionMenu: React.FC<FloatingActionMenuProps> = ({
    items,
    mainIcon: MainIcon,
    isOpen,
    onToggle,
    position = 'bottom-right',
    className,
}) => {
    const positionClasses = position === 'bottom-right'
        ? 'right-4'
        : 'left-4';

    return (
        <div className={cn(
            'fixed bottom-24 z-40',
            positionClasses,
            className
        )}>
            {/* Action Items */}
            <motion.div
                initial={false}
                animate={isOpen ? 'open' : 'closed'}
                className="flex flex-col-reverse gap-3 mb-3"
            >
                {items.map((item, index) => {
                    const Icon = item.icon;
                    return (
                        <motion.button
                            key={index}
                            variants={{
                                open: {
                                    opacity: 1,
                                    y: 0,
                                    scale: 1,
                                    transition: { delay: index * 0.05 }
                                },
                                closed: {
                                    opacity: 0,
                                    y: 20,
                                    scale: 0.8,
                                    transition: { delay: (items.length - index) * 0.03 }
                                }
                            }}
                            onClick={() => {
                                item.onClick();
                                onToggle();
                            }}
                            className={cn(
                                'flex items-center gap-3 pl-4 pr-5 py-3',
                                'bg-white dark:bg-slate-800 rounded-full shadow-lg',
                                'hover:shadow-xl hover:scale-105 active:scale-95',
                                'transition-transform duration-200',
                                'border border-border/50'
                            )}
                        >
                            <div className={cn(
                                'p-2 rounded-full',
                                item.color || 'bg-primary text-primary-foreground'
                            )}>
                                <Icon className="h-4 w-4" />
                            </div>
                            <span className="font-medium text-sm whitespace-nowrap">{item.label}</span>
                        </motion.button>
                    );
                })}
            </motion.div>

            {/* Main FAB Button */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onToggle}
                className={cn(
                    'h-14 w-14 rounded-full',
                    'bg-primary text-primary-foreground',
                    'shadow-lg shadow-primary/30',
                    'flex items-center justify-center',
                    'hover:shadow-xl transition-shadow'
                )}
            >
                <motion.div
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                >
                    <MainIcon className="h-6 w-6" />
                </motion.div>
            </motion.button>

            {/* Backdrop */}
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onToggle}
                    className="fixed inset-0 bg-black/20 dark:bg-black/40 -z-10"
                />
            )}
        </div>
    );
};

export default FloatingActionMenu;
