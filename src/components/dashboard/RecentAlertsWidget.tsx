import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { Bell, Clock, Package, AlertTriangle, ChevronRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getInventoryItems } from '@/data/operations/suppliesOperations';
import { InventoryItem } from '@/types';
import { differenceInDays, parseISO } from 'date-fns';

interface AlertItem {
    id: string;
    type: 'expiring' | 'low_stock' | 'expired';
    title: string;
    subtitle: string;
    daysLeft?: number;
    itemId: string;
}

const RecentAlertsWidget: React.FC = () => {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [alerts, setAlerts] = useState<AlertItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchAlerts = async () => {
            try {
                const items = await getInventoryItems();
                const today = new Date();
                const alertList: AlertItem[] = [];

                items.forEach((item: InventoryItem) => {
                    const expiryDate = parseISO(item.expiry_date);
                    const daysUntilExpiry = differenceInDays(expiryDate, today);

                    // Expired items
                    if (daysUntilExpiry < 0) {
                        alertList.push({
                            id: `expired-${item.id}`,
                            type: 'expired',
                            title: item.product_name,
                            subtitle: `${item.variant} - ${t('expired')}`,
                            daysLeft: daysUntilExpiry,
                            itemId: item.id,
                        });
                    }
                    // Expiring soon (within 30 days)
                    else if (daysUntilExpiry <= 30) {
                        alertList.push({
                            id: `expiring-${item.id}`,
                            type: 'expiring',
                            title: item.product_name,
                            subtitle: `${item.variant}`,
                            daysLeft: daysUntilExpiry,
                            itemId: item.id,
                        });
                    }

                    // Low stock (below reorder point)
                    if (item.quantity <= item.reorder_point) {
                        alertList.push({
                            id: `lowstock-${item.id}`,
                            type: 'low_stock',
                            title: item.product_name,
                            subtitle: `${item.variant} - ${t('quantity')}: ${item.quantity}`,
                            itemId: item.id,
                        });
                    }
                });

                // Sort by urgency and take top 5
                alertList.sort((a, b) => {
                    if (a.type === 'expired' && b.type !== 'expired') return -1;
                    if (a.type !== 'expired' && b.type === 'expired') return 1;
                    if (a.daysLeft !== undefined && b.daysLeft !== undefined) {
                        return a.daysLeft - b.daysLeft;
                    }
                    return 0;
                });

                setAlerts(alertList.slice(0, 5));
            } catch (error) {
                console.error('Failed to fetch alerts:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAlerts();
    }, [t]);

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

    const getAlertBadge = (alert: AlertItem) => {
        if (alert.type === 'expired') {
            return <Badge variant="destructive" className="text-xs">{t('expired')}</Badge>;
        }
        if (alert.type === 'expiring' && alert.daysLeft !== undefined) {
            return (
                <Badge
                    variant="outline"
                    className={`text-xs ${alert.daysLeft <= 7 ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}
                >
                    {alert.daysLeft} {t('days')}
                </Badge>
            );
        }
        if (alert.type === 'low_stock') {
            return <Badge variant="outline" className="text-xs bg-rose-50 text-rose-700 border-rose-200">{t('low_stock')}</Badge>;
        }
        return null;
    };

    const handleAlertClick = (alert: AlertItem) => {
        navigate(`/supplies?highlight=${alert.itemId}`);
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.05 },
        },
    };

    const itemVariants = {
        hidden: { opacity: 0, x: -10 },
        visible: { opacity: 1, x: 0 },
    };

    return (
        <Card className="h-full">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                        <Bell className="h-5 w-5 text-primary" />
                        {t('recent_alerts')}
                    </CardTitle>
                    {alerts.length > 0 && (
                        <Badge variant="secondary" className="bg-red-100 text-red-700">
                            {alerts.length}
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="space-y-3">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-14 bg-muted/50 rounded-lg animate-pulse" />
                        ))}
                    </div>
                ) : alerts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <Bell className="h-10 w-10 mx-auto mb-3 opacity-30" />
                        <p>{t('no_alerts')}</p>
                    </div>
                ) : (
                    <motion.div
                        className="space-y-2"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        {alerts.map((alert) => (
                            <motion.div
                                key={alert.id}
                                variants={itemVariants}
                                onClick={() => handleAlertClick(alert)}
                                className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors group"
                            >
                                <div className="flex-shrink-0">
                                    {getAlertIcon(alert.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">{alert.title}</p>
                                    <p className="text-xs text-muted-foreground truncate">{alert.subtitle}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {getAlertBadge(alert)}
                                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                )}

                {alerts.length > 0 && (
                    <Button asChild variant="ghost" className="w-full mt-4 text-primary hover:text-primary/80">
                        <Link to="/alerts" className="flex items-center gap-2">
                            {t('view_all_alerts')}
                            <ChevronRight className="h-4 w-4" />
                        </Link>
                    </Button>
                )}
            </CardContent>
        </Card>
    );
};

export default RecentAlertsWidget;
