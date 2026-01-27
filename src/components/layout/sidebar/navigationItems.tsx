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
  Warehouse,
  Activity,
  DollarSign
} from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';

export const useNavigationItems = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const role = user?.profile?.role;

  // Store Manager View (Non-Admin)
  if (role !== 'admin') {
    return [
      {
        type: 'link',
        label: t('supplies_list') || 'Supplies', // Fallback if key missing
        icon: <Package className="h-5 w-5" />,
        href: '/supplies',
      },
      {
        type: 'link',
        label: t('consumption_nav'),
        icon: <Recycle className="h-5 w-5" />,
        href: '/consumption',
      },
      {
        type: 'link',
        label: t('transfer_inventory_nav'),
        icon: <ArrowRightLeft className="h-5 w-5" />,
        href: '/transfer-inventory',
      },
      {
        type: 'link',
        label: t('alerts_nav'),
        icon: <AlertTriangle className="h-5 w-5" />,
        href: '/alerts',
      },
      {
        type: 'link',
        label: t('inventory_report_nav'),
        icon: <BarChart4 className="h-5 w-5" />,
        href: '/inventory-report',
      },
    ];
  }

  // Admin View (Full Access)
  return [
    {
      type: 'link',
      label: t('dashboard_nav'),
      icon: <Home className="h-5 w-5" />,
      href: '/',
    },
    {
      type: 'collapsible',
      label: t('inventory_management'),
      icon: <Warehouse className="h-5 w-5" />,
      subItems: [
        { type: 'link', label: t('supplies_nav'), href: '/supplies' },
        { type: 'link', label: t('transfer_inventory_nav'), href: '/transfer-inventory' },
        { type: 'link', label: t('reorder_point_manager_nav'), href: '/reorder-point-manager' },
      ]
    },
    {
      type: 'collapsible',
      label: t('operations'),
      icon: <Activity className="h-5 w-5" />,
      subItems: [
        { type: 'link', label: t('consumption_nav'), href: '/consumption' },
        { type: 'link', label: t('returns_management_nav'), href: '/returns-management' },
        { type: 'link', label: t('replacement_voucher_nav'), href: '/replacement-voucher' },
        { type: 'link', label: t('on_shelf_invoicing_nav'), href: '/on-shelf-invoicing' },
      ]
    },
    {
      type: 'header',
      label: t('financials') || 'Financials',
    },
    {
      type: 'link',
      label: t('debt_management') || 'Debt Management',
      icon: <DollarSign className="h-5 w-5" />,
      href: '/debt-management',
    },
    {
      type: 'link',
      label: t('debt_calendar') || 'Debt Calendar',
      icon: <Calendar className="h-5 w-5" />,
      href: '/debt-calendar',
    },
    {
      type: 'header',
      label: t('monitoring_and_planning'),
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
        { type: 'link', label: t('on_shelf_report_nav'), href: '/on-shelf-report' },
        { type: 'link', label: t('supplier_performance_nav'), href: '/supplier-performance' },
      ]
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
      label: t('settings'),
    },
    {
      type: 'collapsible',
      label: t('management'),
      icon: <Settings className="h-5 w-5" />,
      subItems: [
        { type: 'link', label: t('data_settings_nav'), href: '/admin' },
        { type: 'link', label: t('management_settings_nav'), href: '/management' },
        { type: 'link', label: t('procedure_templates_nav'), href: '/procedure-templates' },
      ]
    },
  ];
};
