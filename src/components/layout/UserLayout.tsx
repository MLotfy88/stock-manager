import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';
import AppLogo from './AppLogo';
import { useLanguage } from '@/contexts/LanguageContext';

const UserHeader = () => {
  const { t } = useLanguage();
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
      <AppLogo />
      <Button asChild variant="outline" size="sm">
        <Link to="/user-dashboard">
          <Home className="h-4 w-4 mr-2" />
          {t('user_dashboard')}
        </Link>
      </Button>
    </header>
  );
};

const UserLayout = () => {
  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <UserHeader />
      <main className="flex flex-1 flex-col gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
        <Outlet />
      </main>
    </div>
  );
};

export default UserLayout;
