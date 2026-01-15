
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { cn } from "@/lib/utils";
import { useMediaQuery } from '@/hooks/use-mobile';
import SidebarContent from './sidebar/SidebarContent';
import SidebarFooter from './sidebar/SidebarFooter';
import { MobileBackdrop } from './sidebar/MobileControls';
import { useLanguage } from '@/contexts/LanguageContext';
import { Sheet, SheetContent } from "@/components/ui/sheet";

interface SidebarProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isSidebarOpen, toggleSidebar, closeSidebar }) => {
  const location = useLocation();
  const [activePath, setActivePath] = useState(location.pathname);
  const isMobile = useMediaQuery('(max-width: 1024px)');
  const { direction } = useLanguage();

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
        <SheetContent side={direction === 'rtl' ? 'right' : 'left'} className="w-72 p-0 pt-0 border-r-0">
          <div className="flex flex-col h-full bg-white/95 backdrop-blur-md">
            <div className="flex-1 overflow-y-auto pt-10 px-2">
              <SidebarContent
                activePath={activePath}
                handleNavClick={handleNavClick}
              />
            </div>
            <div className="p-4 border-t border-border/50 bg-muted/20">
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
        "bg-white/95 backdrop-blur-sm border-border/50",
        "shadow-lg",
        direction === 'rtl' ? "right-0 border-l" : "left-0 border-r",
      )}
    >
      <div className="flex-1 overflow-y-auto">
        <SidebarContent
          activePath={activePath}
          handleNavClick={handleNavClick}
        />
      </div>
      <div className="p-4 border-t">
        <SidebarFooter />
      </div>
    </aside>
  );
};

export default Sidebar;
