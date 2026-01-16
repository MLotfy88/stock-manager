
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { cn } from "@/lib/utils";
import { useMediaQuery } from '@/hooks/use-mobile';
import SidebarContent from './sidebar/SidebarContent';
import SidebarFooter from './sidebar/SidebarFooter';
import { MobileBackdrop } from './sidebar/MobileControls';
import { useLanguage } from '@/contexts/LanguageContext';
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SidebarProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isSidebarOpen, toggleSidebar, closeSidebar }) => {
  const location = useLocation();
  const [activePath, setActivePath] = useState(location.pathname);
  const isMobile = useMediaQuery('(max-width: 1024px)');
  const { direction, t } = useLanguage();

  useEffect(() => {
    setActivePath(location.pathname);
    if (isMobile) {
      closeSidebar();
    }
  }, [location.pathname, isMobile]);

  const handleNavClick = (path: string) => {
    if (isMobile) {
      closeSidebar();
    }
  };

  if (isMobile) {
    return (
      <Sheet open={isSidebarOpen} onOpenChange={(open) => !open && closeSidebar()}>
        {/* Mobile Drawer (Sheet) */}
        <SheetContent
          side={direction === 'rtl' ? 'right' : 'left'}
          className="w-[280px] p-0 border-0"
        >
          <div className="flex flex-col h-full bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border/50">
              <h2 className="text-lg font-bold text-gradient">{t('menu')}</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={closeSidebar}
                className="h-8 w-8 rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto scrollbar-hide">
              <SidebarContent
                activePath={activePath}
                handleNavClick={handleNavClick}
              />
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border/50 bg-white/50 dark:bg-slate-900/50">
              <SidebarFooter />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside
      className={cn(
        "fixed z-40 w-64 flex flex-col transition-all duration-300 ease-in-out",
        "top-16",
        "h-[calc(100vh-4rem)]",
        "bg-gradient-to-b from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-950",
        "backdrop-blur-sm",
        "shadow-xl shadow-black/5 dark:shadow-black/20",
        direction === 'rtl' ? "right-0 border-l border-border/50" : "left-0 border-r border-border/50",
      )}
    >
      {/* Navigation */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <SidebarContent
          activePath={activePath}
          handleNavClick={handleNavClick}
        />
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border/30 bg-muted/20 dark:bg-slate-900/50">
        <SidebarFooter />
      </div>
    </aside>
  );
};

export default Sidebar;
