import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ShoppingCart, Bell } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Link } from 'react-router-dom';

interface UrgentActionsBoxProps {
  expiringSoonCount: number;
  reorderPointCount: number;
}

export const UrgentActionsBox: React.FC<UrgentActionsBoxProps> = ({ expiringSoonCount, reorderPointCount }) => {
  const { t } = useLanguage();

  const actions = [
    {
      count: expiringSoonCount,
      label: 'items_expiring_soon',
      link: '/alerts',
      icon: Bell,
      color: 'text-yellow-500',
    },
    {
      count: reorderPointCount,
      label: 'items_at_reorder_point',
      link: '/reorder-point-report',
      icon: ShoppingCart,
      color: 'text-orange-500',
    },
  ].filter(action => action.count > 0);

  if (actions.length === 0) {
    return null; // Don't render anything if there are no urgent actions
  }

  return (
    <Card className="mb-8 border-orange-500/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="text-orange-500" />
          {t('urgent_actions')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {actions.map((action) => (
          <Link to={action.link} key={action.label} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors">
            <div className="flex items-center gap-4">
              <action.icon className={`h-6 w-6 ${action.color}`} />
              <div>
                <p className="font-semibold">{t(action.label)}</p>
                <p className="text-sm text-muted-foreground">{t('count')}: {action.count}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm">{t('view_details')}</Button>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
};
