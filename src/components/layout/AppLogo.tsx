
import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface AppLogoProps {
  className?: string;
}

const AppLogo: React.FC<AppLogoProps> = ({ className }) => {
  const { t } = useLanguage();
  
  return (
    <Link to="/" className={cn("flex items-center gap-4", className)}>
      <div className="relative">
        {/* Heart with heartbeat line */}
        <svg 
          width="32" 
          height="32" 
          viewBox="0 0 24 24" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="text-red-500"
        >
          <path 
            d="M12 21.35L10.55 20.03C5.4 15.36 2 12.27 2 8.5C2 5.41 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.08C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.41 22 8.5C22 12.27 18.6 15.36 13.45 20.03L12 21.35Z" 
            fill="currentColor"
          />
          {/* Heartbeat line */}
          <path 
            d="M3.5 12H7L9 7L12 16L15 12H20.5" 
            stroke="white" 
            strokeWidth="1.5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <span className="font-semibold text-lg tracking-tight text-foreground/90 hidden md:block">
        {t('app_name')}
      </span>
    </Link>
  );
};

export default AppLogo;
