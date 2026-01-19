import React, { useState, useEffect } from 'react';
import { Bell, ChevronRight, Clock, Package, AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { getInventoryItems } from '@/data/operations/suppliesOperations';
import { InventoryItem } from '@/types';
import { differenceInDays, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

interface AlertItem {
    id: string;
    type: 'expiring' | 'low_stock' | 'expired';
    title: string;
    subtitle: string;
    daysLeft?: number;
    itemId: string;
}

const NotificationDropdown: React.FC = () => {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [alerts, setAlerts] = useState<AlertItem[]>([]);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const fetchAlerts = async () => {
            try {
                const items = await getInventoryItems();
                const today = new Date();
                const alertList: AlertItem[] = [];

                items.forEach((item: InventoryItem) => {
                    const expiryDate = parseISO(item.expiry_date);
                    const daysUntilExpiry = differenceInDays(expiryDate, today);

                    if (daysUntilExpiry < 0) {
                        alertList.push({
                            id: `expired-${item.id}`,
                            type: 'expired',
                            title: item.product_name,
                            subtitle: `${item.variant}`,
                            daysLeft: daysUntilExpiry,
                            itemId: item.id,
                        });
                    } else if (daysUntilExpiry <= 30) {
                        alertList.push({
                            id: `expiring-${item.id}`,
                            type: 'expiring',
                            title: item.product_name,
                            subtitle: `${item.variant}`,
                            daysLeft: daysUntilExpiry,
                            itemId: item.id,
                        });
                    }

                    if (item.quantity <= item.reorder_point) {
                        alertList.push({
                            id: `lowstock-${item.id}`,
                            type: 'low_stock',
                            title: item.product_name,
                            subtitle: `${item.variant}`,
                            itemId: item.id,
                        });
                    }
                });

                alertList.sort((a, b) => {
                    if (a.type === 'expired') return -1;
                    if (b.type === 'expired') return 1;
                    if (a.daysLeft !== undefined && b.daysLeft !== undefined) {
                        return a.daysLeft - b.daysLeft;
                    }
                    return 0;
                });

                setAlerts(alertList.slice(0, 5));
            } catch (error) {
                console.error('Failed to fetch alerts:', error);
            }
        };

        fetchAlerts();
    }, []);

    const getAlertIcon = (type: string) => {
        switch (type) {
            case 'expired':
                return <AlertTriangle className="h-4 w-4 text-red-500" />;
            case 'expiring':
                return <Clock className="h-4 w-4 text-amber-500" />;
            case 'low_stock':
                return <Package className="h-4 w-4 text-rose-500" />;
            default:
                return <Bell className="h-4 w-4" />;
        }
    };

    const handleAlertClick = (alert: AlertItem) => {
        setIsOpen(false);
        navigate(`/supplies?highlight=${alert.itemId}`);
    };

    const handleViewAll = () => {
        setIsOpen(false);
        navigate('/alerts');
    };

    const totalAlerts = alerts.length;

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative hover:bg-secondary/10 touch-target"
                >
                    <Bell className="w-5 h-5 text-muted-foreground" />
                    <AnimatePresence>
                        {totalAlerts > 0 && (
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                                className="absolute -top-1 -right-1"
                            >
                                <Badge
                                    className="h-5 min-w-[20px] px-1.5 text-xs bg-red-500 hover:bg-red-500 text-white border-0 flex items-center justify-center"
                                >
                                    {totalAlerts > 9 ? '9+' : totalAlerts}
                                </Badge>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
                align="end"
                className="w-80 p-0"
                sideOffset={8}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                    <h3 className="font-semibold text-sm">{t('notifications')}</h3>
                    {totalAlerts > 0 && (
                        <Badge variant="secondary" className="text-xs">
                            {totalAlerts} {t('new')}
                        </Badge>
                    )}
                </div>

                {/* Alerts List */}
                <div className="max-h-[300px] overflow-y-auto">
                    {alerts.length === 0 ? (
                        <div className="py-8 text-center text-muted-foreground">
                            <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                            <p className="text-sm">{t('no_notifications')}</p>
                        </div>
                    ) : (
                        alerts.map((alert, index) => (
                            <DropdownMenuItem
                                key={alert.id}
                                className="px-4 py-3 cursor-pointer focus:bg-muted/50"
                                onClick={() => handleAlertClick(alert)}
                            >
                                <div className="flex items-start gap-3 w-full">
                                    <div className="flex-shrink-0 mt-0.5">
                                        {getAlertIcon(alert.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm truncate">{alert.title}</p>
                                        <p className="text-xs text-muted-foreground truncate">{alert.subtitle}</p>
                                        {alert.daysLeft !== undefined && (
                                            <p className={`text-xs mt-1 ${alert.daysLeft < 0 ? 'text-red-500' : 'text-amber-500'}`}>
                                                {alert.daysLeft < 0
                                                    ? t('expired')
                                                    : `${alert.daysLeft} ${t('days_remaining')}`
                                                }
                                            </p>
                                        )}
                                        {alert.type === 'low_stock' && (
                                            <p className="text-xs mt-1 text-rose-500">{t('needs_reorder')}</p>
                                        )}
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                </div>
                            </DropdownMenuItem>
                        ))
                    )}
                </div>

                {/* Footer */}
                {alerts.length > 0 && (
                    <>
                        <DropdownMenuSeparator />
                        <div className="p-2">
                            <Button
                                variant="ghost"
                                className="w-full text-primary hover:text-primary/80 text-sm"
                                onClick={handleViewAll}
                            >
                                {t('view_all_alerts')}
                                <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        </div>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default NotificationDropdown;
