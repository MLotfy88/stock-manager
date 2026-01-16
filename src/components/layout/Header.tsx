
import React from 'react';
import { Bell, Menu } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useLanguage } from '@/contexts/LanguageContext';
import AppLogo from './AppLogo';
import { ThemeToggle } from '@/components/ui/theme-toggle';

interface HeaderProps {
  toggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
  const { t, direction } = useLanguage();

  return (
    <header className="fixed w-full top-0 z-40 bg-background/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-border/50">
      <div className="flex items-center justify-between h-16 px-4 md:px-6">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" className="md:hidden touch-target tap-highlight-none" onClick={toggleSidebar}>
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 flex justify-center">
          <AppLogo />
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" size="icon" className="relative hover:bg-secondary/10 touch-target">
            <Bell className="w-5 h-5 text-muted-foreground" />
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
