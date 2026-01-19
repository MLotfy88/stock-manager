
import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Package, ScanBarcode, ArrowRightLeft, AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface BottomGlassNavProps {
    onMenuClick?: () => void;
}

const BottomGlassNav: React.FC<BottomGlassNavProps> = ({ onMenuClick }) => {
    const { t } = useLanguage();

    const navItems = [
        { icon: Home, label: t('dashboard'), path: '/' },
        { icon: Package, label: t('supplies_nav'), path: '/supplies' },
        { icon: ScanBarcode, label: t('consumption_nav'), path: '/consumption', isPrimary: true },
        { icon: ArrowRightLeft, label: t('transfer_inventory_nav'), path: '/transfer-inventory' },
        { icon: AlertTriangle, label: t('alerts_nav'), path: '/alerts' },
    ];

    return (
        <nav className="glass-nav fixed bottom-0 left-0 right-0 z-50 md:hidden pb-safe">
            <div className="flex justify-around items-center h-16 px-2">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => `
              flex flex-col items-center justify-center w-full h-full space-y-1
              transition-all duration-300
              ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}
              ${item.isPrimary ? '-mt-6' : ''}
            `}
                    >
                        {({ isActive }) => (
                            <>
                                <div
                                    className={`
                    p-2 rounded-xl transition-all duration-300
                    ${item.isPrimary
                                            ? 'bg-primary text-white shadow-glow scale-110'
                                            : isActive ? 'bg-primary/10' : 'bg-transparent'}
                  `}
                                >
                                    <item.icon className={item.isPrimary ? 'h-6 w-6' : 'h-5 w-5'} />
                                </div>
                                <span className={`text-[10px] font-medium ${isActive ? 'opacity-100' : 'opacity-70'}`}>
                                    {item.label}
                                </span>
                            </>
                        )}
                    </NavLink>
                ))}
            </div>
        </nav>
    );
};

export default BottomGlassNav;
