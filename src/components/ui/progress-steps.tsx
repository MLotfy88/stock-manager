import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Step {
    id: string;
    label: string;
    description?: string;
    status: 'completed' | 'current' | 'upcoming';
    path?: string;
}

interface ProgressStepsProps {
    steps: Step[];
    className?: string;
}

/**
 * ProgressSteps - Visual progress indicator for multi-step workflows
 * Shows completion status with animations
 */
export const ProgressSteps: React.FC<ProgressStepsProps> = ({ steps, className }) => {
    return (
        <div className={cn('w-full', className)}>
            {/* Desktop view */}
            <div className="hidden md:flex items-center justify-between">
                {steps.map((step, index) => (
                    <React.Fragment key={step.id}>
                        <div className="flex flex-col items-center">
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: index * 0.1 }}
                                className={cn(
                                    'w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm',
                                    'transition-all duration-300',
                                    step.status === 'completed' && 'bg-primary text-primary-foreground',
                                    step.status === 'current' && 'bg-primary/20 text-primary ring-2 ring-primary ring-offset-2',
                                    step.status === 'upcoming' && 'bg-muted text-muted-foreground'
                                )}
                            >
                                {step.status === 'completed' ? (
                                    <motion.svg
                                        initial={{ pathLength: 0 }}
                                        animate={{ pathLength: 1 }}
                                        transition={{ duration: 0.3 }}
                                        className="w-5 h-5"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth={3}
                                    >
                                        <motion.path
                                            d="M5 13l4 4L19 7"
                                            initial={{ pathLength: 0 }}
                                            animate={{ pathLength: 1 }}
                                        />
                                    </motion.svg>
                                ) : (
                                    index + 1
                                )}
                            </motion.div>
                            <div className="mt-2 text-center">
                                <p className={cn(
                                    'text-sm font-medium',
                                    step.status === 'current' && 'text-primary'
                                )}>
                                    {step.label}
                                </p>
                                {step.description && (
                                    <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                                )}
                            </div>
                        </div>

                        {index < steps.length - 1 && (
                            <div className="flex-1 mx-4">
                                <div className="h-1 bg-muted rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{
                                            width: step.status === 'completed' ? '100%' : '0%'
                                        }}
                                        transition={{ duration: 0.5, delay: index * 0.1 }}
                                        className="h-full bg-primary rounded-full"
                                    />
                                </div>
                            </div>
                        )}
                    </React.Fragment>
                ))}
            </div>

            {/* Mobile view - Scrollable */}
            <div className="md:hidden overflow-x-auto scrollbar-hide pb-2">
                <div className="flex items-center gap-2 min-w-max px-2">
                    {steps.map((step, index) => (
                        <React.Fragment key={step.id}>
                            <div
                                className={cn(
                                    'flex items-center gap-2 px-3 py-2 rounded-full text-sm',
                                    'whitespace-nowrap transition-all',
                                    step.status === 'completed' && 'bg-primary/10 text-primary',
                                    step.status === 'current' && 'bg-primary text-primary-foreground',
                                    step.status === 'upcoming' && 'bg-muted text-muted-foreground'
                                )}
                            >
                                <span className={cn(
                                    'w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold',
                                    step.status === 'completed' && 'bg-primary text-primary-foreground',
                                    step.status === 'current' && 'bg-white text-primary',
                                    step.status === 'upcoming' && 'bg-muted-foreground/30'
                                )}>
                                    {step.status === 'completed' ? '✓' : index + 1}
                                </span>
                                <span className="font-medium">{step.label}</span>
                            </div>

                            {index < steps.length - 1 && (
                                <ChevronRight className={cn(
                                    'h-4 w-4 shrink-0',
                                    step.status === 'completed' ? 'text-primary' : 'text-muted-foreground/50'
                                )} />
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ProgressSteps;
