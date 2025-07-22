
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from 'lucide-react';

export type NavItem = {
  type: 'link' | 'collapsible';
  label: string;
  icon?: React.ReactNode;
  href?: string;
  active?: boolean;
  badge?: number;
  subItems?: NavItem[];
};

interface NavLinkProps {
  item: NavItem;
  onClick: (path: string) => void;
}

const NavLink = ({ item, onClick }: NavLinkProps) => {
  const [isOpen, setIsOpen] = useState(item.subItems?.some(sub => sub.active) || false);

  if (item.type === 'collapsible') {
    const isActive = item.subItems?.some(sub => sub.active);
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <button
            className={cn(
              "flex items-center justify-between w-full gap-3 px-4 py-2.5 rounded-md text-sm font-medium transition-all",
              isActive
                ? "bg-secondary/50 text-foreground"
                : "text-muted-foreground hover:bg-secondary/20 hover:text-foreground"
            )}
          >
            <div className="flex items-center gap-3">
              <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center">{item.icon}</span>
              <span className="truncate">{item.label}</span>
            </div>
            <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pl-6 mt-1 space-y-1">
          {item.subItems?.map(subItem => (
            <NavLink key={subItem.href} item={subItem} onClick={onClick} />
          ))}
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <Link 
      to={item.href || '#'} 
      onClick={() => item.href && onClick(item.href)}
      className={cn(
        "flex items-center gap-3 px-4 py-2.5 rounded-md text-sm font-medium transition-all",
        item.active 
          ? "bg-primary/90 text-white shadow-sm" 
          : "text-muted-foreground hover:bg-secondary/20 hover:text-foreground"
      )}
    >
      <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
        {item.icon || <span className="w-5 h-5" />}
      </span>
      <span className="truncate">{item.label}</span>
      {item.badge && (
        <span className="ml-auto min-w-5 h-5 bg-destructive/90 text-white rounded-full text-xs flex items-center justify-center px-1.5">
          {item.badge}
        </span>
      )}
    </Link>
  );
};

export default NavLink;
