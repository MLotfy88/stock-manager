
import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Package, ScanBarcode, Box, MoreHorizontal } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const BottomGlassNav = () => {
    const { t } = useLanguage();

    const navItems = [
        { icon: Home, label: t('dashboard'), path: '/' },
        { icon: Box, label: t('inventory'), path: '/supplies' },
        { icon: ScanBarcode, label: t('scan'), path: '/consumption', isPrimary: true }, // Central action
        { icon: Package, label: t('packages'), path: '/packages' }, // New Packages route
        { icon: MoreHorizontal, label: t('more'), path: '/menu' }, // Placeholder for detailed menu/drawer trigger
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
