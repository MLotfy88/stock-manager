
import React from 'react';
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { Globe } from 'lucide-react';

const LanguageSwitcher = () => {
  const { language, changeLanguage, t } = useLanguage();
  
  const toggleLanguage = () => {
    changeLanguage(language === 'ar' ? 'en' : 'ar');
  };
  
  return (
    <Button 
      variant="ghost" 
      size="sm" 
      className="flex items-center gap-2 text-muted-foreground hover:text-foreground hover:bg-secondary/10"
      onClick={toggleLanguage}
    >
      <Globe className="h-4 w-4" />
      <span className="text-sm font-medium hidden md:block">{language === 'ar' ? 'English' : 'العربية'}</span>
    </Button>
  );
};

export default LanguageSwitcher;
