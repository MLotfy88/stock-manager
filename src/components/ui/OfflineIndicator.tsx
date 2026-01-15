
import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

export const OfflineIndicator = () => {
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const { t } = useLanguage();

    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    if (!isOffline) return null;

    return (
        <div className={cn(
            "fixed bottom-20 left-1/2 -translate-x-1/2 z-50",
            "bg-destructive text-destructive-foreground",
            "px-4 py-2 rounded-full shadow-lg",
            "flex items-center gap-2 text-sm font-medium",
            "animate-in slide-in-from-bottom-5 fade-in duration-300"
        )}>
            <WifiOff className="h-4 w-4" />
            <span>{t('you_are_offline') || 'You are offline'}</span>
        </div>
    );
};
