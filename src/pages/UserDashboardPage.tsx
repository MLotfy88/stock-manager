
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import AppLogo from '@/components/layout/AppLogo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, ArrowRightLeft, MinusCircle, FileText, Search } from 'lucide-react';
import BottomGlassNav from '@/components/layout/BottomGlassNav';
import Header from '@/components/layout/Header';
import { usePermission } from '@/hooks/usePermission';
import { useAuth } from '@/contexts/AuthContext';

const UserDashboardPage = () => {
  const { t, direction } = useLanguage();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background dark:from-slate-900 dark:to-slate-950 pb-24" dir={direction}>
      <Header toggleSidebar={() => { }} />

      <main className="max-w-md mx-auto p-4 pt-8 space-y-8">
        <div className="text-center">
          <AppLogo className="mx-auto mb-6 scale-110" />
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            {t('welcome_back')}, {user?.email?.split('@')[0] || 'User'}
          </h1>
          <p className="text-muted-foreground mt-2">{t('select_action')}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Link to="/consumption" className="col-span-2">
            <Card className="mobile-card-interactive bg-gradient-to-br from-white to-orange-50/50 dark:from-slate-900 dark:to-orange-950/20 border-orange-200/50 dark:border-orange-900/30">
              <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                <div className="h-14 w-14 rounded-2xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400 shadow-sm">
                  <MinusCircle className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{t('new_consumption')}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{t('record_usage_desc') || 'Record items used in procedures'}</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/transfer-inventory">
            <Card className="mobile-card-interactive group h-full">
              <CardContent className="p-5 flex flex-col items-center text-center gap-2">
                <div className="h-12 w-12 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                  <ArrowRightLeft className="h-5 w-5" />
                </div>
                <span className="font-semibold text-sm">{t('transfer')}</span>
              </CardContent>
            </Card>
          </Link>

          <Link to="/supplies">
            <Card className="mobile-card-interactive group h-full">
              <CardContent className="p-5 flex flex-col items-center text-center gap-2">
                <div className="h-12 w-12 rounded-2xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-teal-600 dark:text-teal-400 group-hover:scale-110 transition-transform">
                  <Search className="h-5 w-5" />
                </div>
                <span className="font-semibold text-sm">{t('search_supplies')}</span>
              </CardContent>
            </Card>
          </Link>

          <Link to="/packages">
            <Card className="mobile-card-interactive group h-full">
              <CardContent className="p-5 flex flex-col items-center text-center gap-2">
                <div className="h-12 w-12 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
                  <Package className="h-5 w-5" />
                </div>
                <span className="font-semibold text-sm">{t('packages')}</span>
              </CardContent>
            </Card>
          </Link>

          <Link to="/inventory-report">
            <Card className="mobile-card-interactive group h-full">
              <CardContent className="p-5 flex flex-col items-center text-center gap-2">
                <div className="h-12 w-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-400 group-hover:scale-110 transition-transform">
                  <FileText className="h-5 w-5" />
                </div>
                <span className="font-semibold text-sm">{t('reports')}</span>
              </CardContent>
            </Card>
          </Link>
        </div>
      </main>

      <BottomGlassNav />
    </div>
  );
};

export default UserDashboardPage;
