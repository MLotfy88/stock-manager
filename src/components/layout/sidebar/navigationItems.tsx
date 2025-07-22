
import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  Home, 
  Package,
  Calendar,
  AlertTriangle,
  BarChart4,
  Settings,
  Recycle,
  ArrowRightLeft,
  Database,
  Warehouse,
  Truck,
  Factory,
  Tag
} from 'lucide-react';

export const useNavigationItems = () => {
  const { t } = useLanguage();
  
  return [
    {
      type: 'link',
      label: t('dashboard_nav'),
      icon: <Home className="h-5 w-5" />,
      href: '/',
    },
    {
      type: 'header',
      label: t('inventory_management'),
    },
    {
      type: 'link',
      label: t('supplies_nav'),
      icon: <Package className="h-5 w-5" />,
      href: '/supplies',
    },
    {
      type: 'link',
      label: t('transfer_inventory_nav'),
      icon: <ArrowRightLeft className="h-5 w-5" />,
      href: '/transfer-inventory',
    },
    {
      type: 'header',
      label: t('operations'),
    },
    {
      type: 'link',
      label: t('consumption_nav'),
      icon: <Recycle className="h-5 w-5" />,
      href: '/consumption',
    },
    {
      type: 'link',
      label: t('calendar_nav'),
      icon: <Calendar className="h-5 w-5" />,
      href: '/calendar',
    },
    {
      type: 'link',
      label: t('alerts_nav'),
      icon: <AlertTriangle className="h-5 w-5" />,
      href: '/alerts',
    },
    {
      type: 'header',
      label: t('analysis'),
    },
    {
      type: 'collapsible',
      label: t('reports_nav'),
      icon: <BarChart4 className="h-5 w-5" />,
      subItems: [
        { type: 'link', label: t('reports_overview'), href: '/reports' },
        { type: 'link', label: t('inventory_report_nav'), href: '/inventory-report' },
        { type: 'link', label: t('reorder_point_report_nav'), href: '/reorder-point-report' },
        { type: 'link', label: t('consumption_report_nav'), href: '/consumption-report' },
      ]
    },
    {
      type: 'header',
      label: t('settings'),
    },
    {
      type: 'link',
      label: t('data_settings_nav'),
      icon: <Database className="h-5 w-5" />,
      href: '/admin',
    },
    {
      type: 'link',
      label: t('management_settings_nav'),
      icon: <Settings className="h-5 w-5" />,
      href: '/management',
    },
  ];
};
