
import React, { useState, useEffect } from 'react';
import { cn } from "@/lib/utils";
import { useMediaQuery } from '@/hooks/use-mobile';
import SidebarContent from './sidebar/SidebarContent';
import { MobileMenuToggle, MobileBackdrop } from './sidebar/MobileControls';
import { useLanguage } from '@/contexts/LanguageContext';

const Sidebar = () => {
  const [activePath, setActivePath] = useState('/');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { direction } = useLanguage();
  
  // Close sidebar when route changes on mobile
  useEffect(() => {
    if (isMobile) {
      setIsSidebarOpen(false);
    } else {
      setIsSidebarOpen(true);
    }
  }, [activePath, isMobile]);

  // Set initial state based on screen size
  useEffect(() => {
    setIsSidebarOpen(!isMobile);
  }, [isMobile]);
  
  const handleNavClick = (path: string) => {
    setActivePath(path);
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  };

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  
  return (
    <>
      <MobileMenuToggle 
        isSidebarOpen={isSidebarOpen} 
        toggleSidebar={toggleSidebar} 
      />
      
      <MobileBackdrop 
        isMobile={isMobile} 
        isSidebarOpen={isSidebarOpen} 
        toggleSidebar={toggleSidebar} 
      />
      
      <aside 
        className={cn(
          "fixed z-40 w-64 overflow-y-auto transition-all duration-300 ease-in-out",
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
        <SidebarContent 
          activePath={activePath} 
          handleNavClick={handleNavClick} 
        />
      </aside>
    </>
  );
};

export default Sidebar;
