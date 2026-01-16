import React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export type ScanFeedbackType = 'success' | 'error' | 'warning' | 'info';

interface ScanFeedbackToastProps {
    show: boolean;
    type: ScanFeedbackType;
    title: string;
    message?: string;
    details?: {
        productName?: string;
        variant?: string;
        expiry?: string;
        quantity?: number;
    };
    onClose: () => void;
    autoClose?: number;
}

const typeConfig = {
    success: {
        icon: CheckCircle,
        bg: 'bg-gradient-to-r from-green-500 to-emerald-500',
        border: 'border-green-400',
    },
    error: {
        icon: XCircle,
        bg: 'bg-gradient-to-r from-red-500 to-rose-500',
        border: 'border-red-400',
    },
    warning: {
        icon: AlertTriangle,
        bg: 'bg-gradient-to-r from-amber-500 to-orange-500',
        border: 'border-amber-400',
    },
    info: {
        icon: Info,
        bg: 'bg-gradient-to-r from-blue-500 to-cyan-500',
        border: 'border-blue-400',
    },
};

/**
 * ScanFeedbackToast - Animated feedback after scanning
 * Shows product info with beautiful animations
 */
export const ScanFeedbackToast: React.FC<ScanFeedbackToastProps> = ({
    show,
    type,
    title,
    message,
    details,
    onClose,
    autoClose = 3000,
}) => {
    const config = typeConfig[type];
    const Icon = config.icon;

    React.useEffect(() => {
        if (show && autoClose > 0) {
            const timer = setTimeout(onClose, autoClose);
            return () => clearTimeout(timer);
        }
    }, [show, autoClose, onClose]);

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0, y: -50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    className={cn(
                        'fixed top-20 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-96 z-[100]',
                        'rounded-2xl overflow-hidden shadow-2xl',
                        'border-2',
                        config.border
                    )}
                >
                    {/* Header */}
                    <div className={cn('p-4 text-white', config.bg)}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.1, type: 'spring', stiffness: 400 }}
                                >
                                    <Icon className="h-6 w-6" />
                                </motion.div>
                                <div>
                                    <h4 className="font-bold text-lg">{title}</h4>
                                    {message && <p className="text-sm opacity-90">{message}</p>}
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-1 hover:bg-white/20 rounded-full transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    {/* Details */}
                    {details && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            transition={{ delay: 0.15 }}
                            className="p-4 bg-white dark:bg-slate-900 space-y-2"
                        >
                            {details.productName && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground text-sm">المنتج</span>
                                    <span className="font-medium">{details.productName}</span>
                                </div>
                            )}
                            {details.variant && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground text-sm">المتغير</span>
                                    <span className="font-mono bg-muted px-2 py-0.5 rounded text-sm">{details.variant}</span>
                                </div>
                            )}
                            {details.expiry && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground text-sm">تاريخ الانتهاء</span>
                                    <span className="font-medium">{details.expiry}</span>
                                </div>
                            )}
                            {details.quantity !== undefined && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground text-sm">الكمية</span>
                                    <span className="font-bold text-primary">{details.quantity}</span>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* Progress bar for auto-close */}
                    {autoClose > 0 && (
                        <motion.div
                            initial={{ width: '100%' }}
                            animate={{ width: '0%' }}
                            transition={{ duration: autoClose / 1000, ease: 'linear' }}
                            className={cn('h-1', config.bg)}
                        />
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default ScanFeedbackToast;
