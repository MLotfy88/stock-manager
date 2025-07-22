
import React from 'react';
import { Settings, LogOut } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import LanguageSwitcher from "../LanguageSwitcher";

const SidebarFooter = () => {
  const { t } = useLanguage();
  
  return (
    <div className="pt-4 mt-6 border-t border-border">
      <LanguageSwitcher />
      <Button 
        variant="outline" 
        className="w-full justify-start text-muted-foreground hover:text-foreground mt-2"
      >
        <Settings className="w-4 h-4 mr-2" />
        {t('settings')}
      </Button>
      <Button 
        variant="ghost" 
        className="w-full justify-start text-muted-foreground hover:text-destructive mt-2"
      >
        <LogOut className="w-4 h-4 mr-2" />
        {t('logout')}
      </Button>
    </div>
  );
};

export default SidebarFooter;
