
import React, { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { useMediaQuery } from '@/hooks/use-mobile';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Search, Plus, FileText } from 'lucide-react';
import ConsumptionForm from '@/components/consumption/ConsumptionForm';
import ConsumptionRecordList from '@/components/consumption/ConsumptionRecordList';

import { useLocation } from 'react-router-dom';

const ConsumptionPage = () => {
  const isMobile = useMediaQuery('(max-width: 1024px)');
  const { t, direction } = useLanguage();
  const { toast } = useToast();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'new' | 'list'>(
    location.state?.initialItems ? 'new' : 'list'
  );

  const initialItems = location.state?.initialItems;


  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background dark:from-slate-900 dark:to-slate-950 pb-20" dir={direction}>
      <Header toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
      <Sidebar
        isSidebarOpen={isSidebarOpen}
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        closeSidebar={() => setIsSidebarOpen(false)}
      />

      <main className={`${isMobile ? 'px-4' : direction === 'rtl' ? 'pr-72 pl-8' : 'pl-72 pr-8'} transition-all`}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 animate-fade-in">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-1">{t('consumption_records')}</h1>
              <p className="text-muted-foreground text-sm md:text-base">
                {t('consumption_records_description')}
              </p>
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              <Button
                className={`gap-2 ${activeTab === 'list' ? 'bg-primary text-white' : 'bg-muted/50 text-foreground hover:bg-muted'}`}
                onClick={() => setActiveTab('list')}
              >
                <FileText className="h-4 w-4" />
                {t('view_records')}
              </Button>
              <Button
                className={`gap-2 ${activeTab === 'new' ? 'bg-primary text-white' : 'bg-muted/50 text-foreground hover:bg-muted'}`}
                onClick={() => setActiveTab('new')}
              >
                <Plus className="h-4 w-4" />
                {t('new_consumption')}
              </Button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-border/50 overflow-hidden p-1 md:p-6 animate-fade-in">
            {activeTab === 'new' ? (
              <ConsumptionForm onSuccess={() => setActiveTab('list')} initialItems={initialItems} />
            ) : (
              <ConsumptionRecordList />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ConsumptionPage;
