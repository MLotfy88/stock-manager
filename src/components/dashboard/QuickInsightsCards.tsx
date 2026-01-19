import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import {
    AlertTriangle,
    Package,
    TrendingDown,
    Clock,
    ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

interface QuickInsightsCardsProps {
    expiringSoonCount: number;
    expiringThisWeek: number;
    lowStockCount: number;
    todayConsumption: number;
}

const QuickInsightsCards: React.FC<QuickInsightsCardsProps> = ({
    expiringSoonCount,
    expiringThisWeek,
    lowStockCount,
    todayConsumption,
}) => {
    const { t } = useLanguage();

    const insights = [
        {
            icon: Clock,
            title: t('expiring_this_week'),
            value: expiringThisWeek,
            subtitle: t('items'),
            color: 'text-amber-500',
            bgColor: 'bg-amber-500/10',
            borderColor: 'border-amber-500/20',
            link: '/alerts?filter=expiring',
            urgent: expiringThisWeek > 0,
        },
        {
            icon: TrendingDown,
            title: t('below_reorder_point'),
            value: lowStockCount,
            subtitle: t('items'),
            color: 'text-rose-500',
            bgColor: 'bg-rose-500/10',
            borderColor: 'border-rose-500/20',
            link: '/alerts?filter=low_stock',
            urgent: lowStockCount > 0,
        },
        {
            icon: Package,
            title: t('today_consumption'),
            value: todayConsumption,
            subtitle: t('items_consumed'),
            color: 'text-blue-500',
            bgColor: 'bg-blue-500/10',
            borderColor: 'border-blue-500/20',
            link: '/consumption',
            urgent: false,
        },
    ];

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
            },
        },
    };

    const cardVariants = {
        hidden: { opacity: 0, y: 20, scale: 0.95 },
        visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: {
                duration: 0.3,
            },
        },
    };

    return (
        <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {insights.map((insight, index) => (
                <motion.div key={index} variants={cardVariants}>
                    <Link to={insight.link}>
                        <Card
                            className={`
                relative overflow-hidden cursor-pointer
                transition-all duration-300 ease-out
                hover:shadow-lg hover:-translate-y-1
                border ${insight.borderColor}
                ${insight.urgent ? 'ring-2 ring-offset-2 ring-offset-background' : ''}
                ${insight.urgent ? insight.borderColor.replace('border-', 'ring-') : ''}
              `}
                        >
                            {/* Background Gradient */}
                            <div className={`absolute inset-0 ${insight.bgColor} opacity-50`} />

                            {/* Content */}
                            <CardContent className="relative p-5">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className={`inline-flex p-2.5 rounded-xl ${insight.bgColor} mb-3`}>
                                            <insight.icon className={`h-5 w-5 ${insight.color}`} />
                                        </div>
                                        <p className="text-sm font-medium text-muted-foreground mb-1">
                                            {insight.title}
                                        </p>
                                        <div className="flex items-baseline gap-2">
                                            <span className={`text-3xl font-bold ${insight.color}`}>
                                                {insight.value}
                                            </span>
                                            <span className="text-sm text-muted-foreground">
                                                {insight.subtitle}
                                            </span>
                                        </div>
                                    </div>

                                    <ArrowRight className={`h-5 w-5 ${insight.color} opacity-50 group-hover:opacity-100 transition-opacity`} />
                                </div>

                                {/* Urgent Indicator */}
                                {insight.urgent && insight.value > 0 && (
                                    <div className="absolute top-2 right-2">
                                        <span className="relative flex h-3 w-3">
                                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${insight.bgColor} opacity-75`}></span>
                                            <span className={`relative inline-flex rounded-full h-3 w-3 ${insight.color.replace('text-', 'bg-')}`}></span>
                                        </span>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </Link>
                </motion.div>
            ))}
        </motion.div>
    );
};

export default QuickInsightsCards;
