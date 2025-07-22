
import React from 'react';
import { Search } from 'lucide-react';
import { Input } from "@/components/ui/input";
import NavLink, { NavItem } from './NavLink';
import SidebarFooter from './SidebarFooter';
import { getMainNavItems, getSecondaryNavItems, getManagementNavItems } from './navigationItems';
import { useLanguage } from '@/contexts/LanguageContext';

interface SidebarContentProps {
  activePath: string;
  handleNavClick: (path: string) => void;
}

const SidebarContent = ({ activePath, handleNavClick }: SidebarContentProps) => {
  const mainNavItems = getMainNavItems(activePath);
  const secondaryNavItems = getSecondaryNavItems(activePath);
  const managementNavItems = getManagementNavItems(activePath);
  const { t, direction } = useLanguage();

  return (
    <div className="flex flex-col h-full py-5">
      <div className="mx-4 mb-6 md:hidden">
        <div className="relative">
          <Search className={`absolute ${direction === 'rtl' ? 'left-3' : 'right-3'} top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4`} />
          <Input 
            type="search" 
            placeholder={t('search_supplies')}
            className={`w-full rounded-full bg-secondary/10 border-transparent ${direction === 'rtl' ? 'pl-10' : 'pr-10'} focus-visible:ring-primary`}
            dir={direction}
          />
        </div>
      </div>
      
      <nav className="space-y-1 px-3 mb-6">
        {mainNavItems.map((item) => (
          <NavLink key={item.href} item={item} onClick={handleNavClick} />
        ))}
      </nav>
      
      <div className="px-5 mb-2">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70">{t('management')}</p>
      </div>
      
      <nav className="space-y-1 px-3 mb-5">
        {secondaryNavItems.map((item) => (
          <NavLink key={item.href} item={item} onClick={handleNavClick} />
        ))}
      </nav>
      
      <div className="px-5 mb-2">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70">{t('admin')}</p>
      </div>
      
      <nav className="space-y-1 px-3 mb-auto">
        {managementNavItems.map((item) => (
          <NavLink key={item.href} item={item} onClick={handleNavClick} />
        ))}
      </nav>
      
      <SidebarFooter />
    </div>
  );
};

export default SidebarContent;
