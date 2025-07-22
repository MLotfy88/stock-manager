
import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from "@/lib/utils";

export type NavItem = {
  label: string;
  icon: React.ReactNode;
  href: string;
  active?: boolean;
  badge?: number;
};

interface NavLinkProps {
  item: NavItem;
  onClick: (path: string) => void;
}

const NavLink = ({ item, onClick }: NavLinkProps) => (
  <Link 
    to={item.href} 
    onClick={() => onClick(item.href)}
    className={cn(
      "flex items-center gap-3 px-4 py-2.5 rounded-md text-sm font-medium transition-all",
      item.active 
        ? "bg-primary/90 text-white shadow-sm" 
        : "text-muted-foreground hover:bg-secondary/20 hover:text-foreground"
    )}
  >
    <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
      {item.icon}
    </span>
    <span className="truncate">{item.label}</span>
    {item.badge && (
      <span className="ml-auto min-w-5 h-5 bg-destructive/90 text-white rounded-full text-xs flex items-center justify-center px-1.5">
        {item.badge}
      </span>
    )}
  </Link>
);

export default NavLink;
