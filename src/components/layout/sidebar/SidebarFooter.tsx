
import React from 'react';
import { LogOut, User, Settings } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import LanguageSwitcher from "../LanguageSwitcher";
import { signOut, getCurrentUser } from '@/data/operations/authOperations';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';

const SidebarFooter = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userEmail, setUserEmail] = React.useState<string>('');

  React.useEffect(() => {
    const loadUser = async () => {
      const user = await getCurrentUser();
      if (user?.email) setUserEmail(user.email);
    };
    loadUser();
  }, []);

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
    <div className="space-y-3">
      {/* User Info */}
      <div className="flex items-center gap-3 p-2 rounded-xl bg-muted/30 dark:bg-muted/10">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
          <User className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{userEmail || t('user')}</p>
          <p className="text-xs text-muted-foreground">{t('admin')}</p>
        </div>
      </div>

      {/* Language Switcher */}
      <div className="px-1">
        <LanguageSwitcher />
      </div>

      {/* Logout Button */}
      <Button
        variant="ghost"
        className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl h-11"
        onClick={handleSignOut}
      >
        <LogOut className="w-4 h-4" />
        <span>{t('logout')}</span>
      </Button>
    </div>
  );
};

export default SidebarFooter;
