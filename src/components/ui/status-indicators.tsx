import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface StatusDotProps {
    status: 'online' | 'offline' | 'busy' | 'away';
    size?: 'sm' | 'md' | 'lg';
    pulse?: boolean;
}

const statusColors = {
    online: 'bg-green-500',
    offline: 'bg-gray-400',
    busy: 'bg-red-500',
    away: 'bg-amber-500',
};

const sizes = {
    sm: 'h-2 w-2',
    md: 'h-3 w-3',
    lg: 'h-4 w-4',
};

export const StatusDot: React.FC<StatusDotProps> = ({ status, size = 'md', pulse = true }) => (
    <span className="relative inline-flex">
        <span className={cn('rounded-full', sizes[size], statusColors[status])} />
        {pulse && status === 'online' && (
            <span className={cn(
                'absolute inline-flex rounded-full opacity-75 animate-ping',
                sizes[size], statusColors[status]
            )} />
        )}
    </span>
);

interface EmptyStateProps {
    icon: React.ReactNode;
    title: string;
    description?: string;
    action?: { label: string; onClick: () => void };
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-16 px-8 text-center"
    >
        <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4 text-muted-foreground">
            {icon}
        </div>
        <h3 className="font-semibold text-lg mb-1">{title}</h3>
        {description && <p className="text-muted-foreground text-sm max-w-sm">{description}</p>}
        {action && (
            <button
                onClick={action.onClick}
                className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium"
            >
                {action.label}
            </button>
        )}
    </motion.div>
);

export default StatusDot;
