
import React from 'react';
import { LogOut } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import LanguageSwitcher from "../LanguageSwitcher";
import { signOut } from '@/data/operations/authOperations';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';

const SidebarFooter = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
      toast({ title: t('success'), description: t('logout_successful') });
    } catch (error) {
      toast({ title: t('error'), description: t('logout_failed'), variant: 'destructive' });
    }
  };
  
  return (
    <div className="pt-4 mt-6 border-t border-border">
      <LanguageSwitcher />
      <Button 
        variant="ghost" 
        className="w-full justify-start text-muted-foreground hover:text-destructive mt-2"
        onClick={handleSignOut}
      >
        <LogOut className="w-4 h-4 mr-2" />
        {t('logout')}
      </Button>
    </div>
  );
};

export default SidebarFooter;
