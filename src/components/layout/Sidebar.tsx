
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { cn } from "@/lib/utils";
import { useMediaQuery } from '@/hooks/use-mobile';
import SidebarContent from './sidebar/SidebarContent';
import SidebarFooter from './sidebar/SidebarFooter';
import { MobileBackdrop } from './sidebar/MobileControls';
import { useLanguage } from '@/contexts/LanguageContext';

interface SidebarProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isSidebarOpen, toggleSidebar, closeSidebar }) => {
  const location = useLocation();
  const [activePath, setActivePath] = useState(location.pathname);
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { direction } = useLanguage();

  useEffect(() => {
    setActivePath(location.pathname);
    if (isMobile) {
      closeSidebar();
    }
  }, [location.pathname, isMobile]);

  const handleNavClick = (path: string) => {
    // No need to setActivePath here, useEffect will handle it
    if (isMobile) {
      closeSidebar();
    }
  };
  
  return (
    <>
      <MobileBackdrop 
        isMobile={isMobile} 
        isSidebarOpen={isSidebarOpen} 
        toggleSidebar={toggleSidebar} 
      />
      
      <aside 
        className={cn(
          "fixed z-40 w-64 flex flex-col transition-all duration-300 ease-in-out",
          "top-16",
          "h-[calc(100vh-4rem)]",
          "bg-white/95 backdrop-blur-sm border-border/50",
          "shadow-lg",
          isMobile && !isSidebarOpen ? 
            direction === 'rtl' ? "translate-x-full" : "-translate-x-full" : 
            "translate-x-0",
          direction === 'rtl' ? "right-0 border-l" : "left-0 border-r",
        )}
      >
        <div className="flex-1 overflow-y-auto">
          <SidebarContent 
            activePath={activePath} 
            handleNavClick={handleNavClick} 
          />
        </div>
        <div className="p-4">
          <SidebarFooter />
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
