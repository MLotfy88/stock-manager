
import React from 'react';
import NavLink from './NavLink';
import SidebarFooter from './SidebarFooter';
import { useNavigationItems } from './navigationItems';
import { useLanguage } from '@/contexts/LanguageContext';

interface SidebarContentProps {
  activePath: string;
  handleNavClick: (path: string) => void;
}

const SidebarContent = ({ activePath, handleNavClick }: SidebarContentProps) => {
  const navItems = useNavigationItems();
  const { t } = useLanguage();

  return (
    <div className="flex flex-col h-full py-4">
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item: any, index: number) => {
          if (item.type === 'header') {
            return (
              <div key={index} className="px-2 pt-4 pb-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
                  {item.label}
                </p>
              </div>
            );
          }
          if (item.type === 'link') {
            return (
              <NavLink 
                key={item.href} 
                item={{ ...item, active: activePath === item.href }} 
                onClick={handleNavClick} 
              />
            );
          }
          return null;
        })}
      </nav>
      
      <div className="mt-auto">
        <SidebarFooter />
      </div>
    </div>
  );
};

export default SidebarContent;
