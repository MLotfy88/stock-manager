import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface CircularProgressProps {
    value: number;
    max: number;
    size?: number;
    strokeWidth?: number;
    showValue?: boolean;
    label?: string;
    color?: 'primary' | 'success' | 'warning' | 'danger';
    className?: string;
}

const colorClasses = {
    primary: 'text-primary',
    success: 'text-green-500',
    warning: 'text-amber-500',
    danger: 'text-red-500',
};

/**
 * CircularProgress - Animated circular progress indicator
 * Great for showing completion percentages
 */
export const CircularProgress: React.FC<CircularProgressProps> = ({
    value,
    max,
    size = 120,
    strokeWidth = 8,
    showValue = true,
    label,
    color = 'primary',
    className,
}) => {
    const percentage = Math.min((value / max) * 100, 100);
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percentage / 100) * circumference;

    return (
        <div className={cn('relative inline-flex items-center justify-center', className)}>
            <svg width={size} height={size} className="transform -rotate-90">
                {/* Background circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    strokeWidth={strokeWidth}
                    className="fill-none stroke-muted"
                />
                {/* Progress circle */}
                <motion.circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    className={cn('fill-none', colorClasses[color])}
                    style={{
                        stroke: 'currentColor',
                        strokeDasharray: circumference,
                    }}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                />
            </svg>

            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                {showValue && (
                    <motion.span
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5 }}
                        className="text-2xl font-bold"
                    >
                        {Math.round(percentage)}%
                    </motion.span>
                )}
                {label && (
                    <span className="text-xs text-muted-foreground mt-1">{label}</span>
                )}
            </div>
        </div>
    );
};

/**
 * MiniProgress - Small inline progress bar
 */
export const MiniProgress: React.FC<{
    value: number;
    max: number;
    color?: 'primary' | 'success' | 'warning' | 'danger';
    className?: string;
}> = ({ value, max, color = 'primary', className }) => {
    const percentage = Math.min((value / max) * 100, 100);

    const bgColors = {
        primary: 'bg-primary',
        success: 'bg-green-500',
        warning: 'bg-amber-500',
        danger: 'bg-red-500',
    };

    return (
        <div className={cn('h-2 w-full bg-muted rounded-full overflow-hidden', className)}>
            <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className={cn('h-full rounded-full', bgColors[color])}
            />
        </div>
    );
};

export default CircularProgress;
