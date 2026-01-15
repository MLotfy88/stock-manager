
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
    <div className="min-h-screen bg-gray-50 pb-24" dir={direction}>
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
            <Card className="hover:border-primary/50 transition-all cursor-pointer shadow-md bg-gradient-to-br from-white to-orange-50/50">
              <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                  <MinusCircle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{t('new_consumption')}</h3>
                  <p className="text-xs text-muted-foreground">{t('record_usage_desc') || 'Record items used in procedures'}</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/transfer-inventory">
            <Card className="hover:border-primary/50 transition-all cursor-pointer shadow-sm h-full">
              <CardContent className="p-5 flex flex-col items-center text-center gap-2">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                  <ArrowRightLeft className="h-5 w-5" />
                </div>
                <span className="font-semibold text-sm">{t('transfer')}</span>
              </CardContent>
            </Card>
          </Link>

          <Link to="/supplies">
            <Card className="hover:border-primary/50 transition-all cursor-pointer shadow-sm h-full">
              <CardContent className="p-5 flex flex-col items-center text-center gap-2">
                <div className="h-10 w-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-600">
                  <Search className="h-5 w-5" />
                </div>
                <span className="font-semibold text-sm">{t('search_supplies')}</span>
              </CardContent>
            </Card>
          </Link>

          <Link to="/packages">
            <Card className="hover:border-primary/50 transition-all cursor-pointer shadow-sm h-full">
              <CardContent className="p-5 flex flex-col items-center text-center gap-2">
                <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                  <Package className="h-5 w-5" />
                </div>
                <span className="font-semibold text-sm">{t('packages')}</span>
              </CardContent>
            </Card>
          </Link>

          <Link to="/inventory-report">
            <Card className="hover:border-primary/50 transition-all cursor-pointer shadow-sm h-full">
              <CardContent className="p-5 flex flex-col items-center text-center gap-2">
                <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600">
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
