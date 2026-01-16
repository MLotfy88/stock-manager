import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface CollapsibleSectionProps {
    title: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
    badge?: string | number;
    className?: string;
    headerClassName?: string;
}

/**
 * CollapsibleSection - Animated collapsible sections
 * Great for mobile to save space
 */
export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
    title,
    children,
    defaultOpen = false,
    badge,
    className,
    headerClassName,
}) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className={cn('rounded-2xl overflow-hidden border border-border/50', className)}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    'w-full flex items-center justify-between p-4',
                    'bg-muted/30 hover:bg-muted/50 transition-colors',
                    'text-left',
                    headerClassName
                )}
            >
                <div className="flex items-center gap-3">
                    <span className="font-semibold">{title}</span>
                    {badge !== undefined && (
                        <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-bold rounded-full">
                            {badge}
                        </span>
                    )}
                </div>
                <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                >
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                </motion.div>
            </button>

            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                    >
                        <div className="p-4 bg-white dark:bg-slate-900">
                            {children}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

/**
 * AccordionGroup - Group multiple collapsible sections
 * Only one can be open at a time
 */
interface AccordionItem {
    id: string;
    title: string;
    content: React.ReactNode;
    badge?: string | number;
}

interface AccordionGroupProps {
    items: AccordionItem[];
    className?: string;
}

export const AccordionGroup: React.FC<AccordionGroupProps> = ({ items, className }) => {
    const [openId, setOpenId] = useState<string | null>(null);

    return (
        <div className={cn('space-y-2', className)}>
            {items.map((item) => (
                <div
                    key={item.id}
                    className="rounded-2xl overflow-hidden border border-border/50 bg-white dark:bg-slate-900"
                >
                    <button
                        onClick={() => setOpenId(openId === item.id ? null : item.id)}
                        className={cn(
                            'w-full flex items-center justify-between p-4',
                            'hover:bg-muted/30 transition-colors',
                            'text-left'
                        )}
                    >
                        <div className="flex items-center gap-3">
                            <span className="font-semibold">{item.title}</span>
                            {item.badge !== undefined && (
                                <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-bold rounded-full">
                                    {item.badge}
                                </span>
                            )}
                        </div>
                        <motion.div
                            animate={{ rotate: openId === item.id ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        </motion.div>
                    </button>

                    <AnimatePresence>
                        {openId === item.id && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3, ease: 'easeInOut' }}
                            >
                                <div className="px-4 pb-4 pt-0">
                                    {item.content}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            ))}
        </div>
    );
};

export default CollapsibleSection;
