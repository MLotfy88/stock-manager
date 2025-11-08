import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import AppLogo from '@/components/layout/AppLogo';

const UserDashboardPage = () => {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="w-full max-w-md text-center">
        <AppLogo className="mx-auto mb-8" />
        <h1 className="text-2xl font-bold mb-8">{t('user_dashboard')}</h1>
        <div className="grid grid-cols-1 gap-4">
          <Button asChild size="lg">
            <Link to="/supplies">{t('supplies')}</Link>
          </Button>
          <Button asChild size="lg">
            <Link to="/transfer-inventory">{t('transfer_inventory')}</Link>
          </Button>
          <Button asChild size="lg">
            <Link to="/consumption">{t('consumption')}</Link>
          </Button>
          <Button asChild size="lg">
            <Link to="/inventory-report">{t('inventory_report')}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UserDashboardPage;
