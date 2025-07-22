
import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  Home, 
  Package,
  Calendar,
  AlertTriangle,
  BarChart4,
  Factory,
  Truck,
  Tag,
  Warehouse,
  Settings,
  Box,
  Recycle,
  ArrowRightLeft
} from 'lucide-react';

export const useNavigationItems = () => {
  const { t } = useLanguage();
  
  return [
    {
      label: t('dashboard_nav'),
      icon: <Home className="h-5 w-5" />,
      href: '/',
    },
    {
      label: t('supplies_nav'),
      icon: <Package className="h-5 w-5" />,
      href: '/supplies',
    },
    {
      label: t('transfer_inventory_nav'),
      icon: <ArrowRightLeft className="h-5 w-5" />,
      href: '/transfer-inventory',
    },
    {
      label: t('consumption_nav'),
      icon: <Recycle className="h-5 w-5" />,
      href: '/consumption',
    },
    {
      label: t('calendar_nav'),
      icon: <Calendar className="h-5 w-5" />,
      href: '/calendar',
    },
    {
      label: t('alerts_nav'),
      icon: <AlertTriangle className="h-5 w-5" />,
      href: '/alerts',
    },
    {
      label: t('reports_nav'),
      icon: <BarChart4 className="h-5 w-5" />,
      href: '/reports',
    },
    {
      label: t('settings'),
      icon: <Settings className="h-5 w-5" />,
      href: '/admin',
    },
  ];
};

export const getMainNavItems = (activePath: string) => {
  const { t } = useLanguage();
  return [
    {
      label: t('dashboard_nav'),
      icon: <Home className="h-5 w-5" />,
      href: '/',
      active: activePath === '/'
    },
    {
      label: t('supplies_nav'),
      icon: <Package className="h-5 w-5" />,
      href: '/supplies',
      active: activePath === '/supplies'
    },
    {
      label: t('transfer_inventory_nav'),
      icon: <ArrowRightLeft className="h-5 w-5" />,
      href: '/transfer-inventory',
      active: activePath === '/transfer-inventory'
    },
    {
      label: t('consumption_nav'),
      icon: <Recycle className="h-5 w-5" />,
      href: '/consumption',
      active: activePath === '/consumption'
    },
    {
      label: t('calendar_nav'),
      icon: <Calendar className="h-5 w-5" />,
      href: '/calendar',
      active: activePath === '/calendar'
    },
    {
      label: t('alerts_nav'),
      icon: <AlertTriangle className="h-5 w-5" />,
      href: '/alerts',
      active: activePath === '/alerts'
    },
  ];
};

export const getSecondaryNavItems = (activePath: string) => {
  const { t } = useLanguage();
  return [];
};

export const getManagementNavItems = (activePath: string) => {
  const { t } = useLanguage();
  return [
    {
      label: t('reports_nav'),
      icon: <BarChart4 className="h-5 w-5" />,
      href: '/reports',
      active: activePath === '/reports'
    },
    {
      label: t('inventory_report_nav'),
      icon: <BarChart4 className="h-5 w-5" />,
      href: '/inventory-report',
      active: activePath === '/inventory-report'
    },
    {
      label: t('reorder_point_report_nav'),
      icon: <BarChart4 className="h-5 w-5" />,
      href: '/reorder-point-report',
      active: activePath === '/reorder-point-report'
    },
    {
      label: t('consumption_report_nav'),
      icon: <BarChart4 className="h-5 w-5" />,
      href: '/consumption-report',
      active: activePath === '/consumption-report'
    },
    {
      label: t('settings'),
      icon: <Settings className="h-5 w-5" />,
      href: '/admin',
      active: activePath === '/admin'
    },
  ];
};
