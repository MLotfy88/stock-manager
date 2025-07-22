
import React from 'react';
import { Menu, X } from 'lucide-react';
import { Button } from "@/components/ui/button";

interface MobileControlsProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  isMobile: boolean;
}

export const MobileMenuToggle = ({ isSidebarOpen, toggleSidebar }: Omit<MobileControlsProps, 'isMobile'>) => (
  <Button
    variant="ghost"
    size="icon"
    onClick={toggleSidebar}
    className="fixed top-4 left-4 z-50 md:hidden hover:bg-secondary/10"
  >
    {isSidebarOpen ? (
      <X className="h-5 w-5 text-muted-foreground" />
    ) : (
      <Menu className="h-5 w-5 text-muted-foreground" />
    )}
  </Button>
);

export const MobileBackdrop = ({ isMobile, isSidebarOpen, toggleSidebar }: MobileControlsProps) => (
  isMobile && isSidebarOpen ? (
    <div 
      className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 md:hidden animate-in fade-in-0" 
      onClick={toggleSidebar}
    />
  ) : null
);
