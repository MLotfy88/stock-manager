
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';

type Language = 'ar' | 'en';
type Direction = 'rtl' | 'ltr';

interface LanguageContextType {
  language: Language;
  direction: Direction;
  changeLanguage: (lang: Language) => void;
  t: (key: string) => string;
  getLocalizedName: (arName: string, enName?: string) => string;
}

const defaultLanguage: Language = 'ar';

const LanguageContext = createContext<LanguageContextType>({
  language: defaultLanguage,
  direction: 'rtl',
  changeLanguage: () => {},
  t: (key: string) => key,
  getLocalizedName: (arName: string) => arName,
});

export const useLanguage = () => useContext(LanguageContext);

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const savedLanguage = localStorage.getItem('language') as Language;
    return savedLanguage || defaultLanguage;
  });
  
  const direction: Direction = language === 'ar' ? 'rtl' : 'ltr';
  
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = direction;
    document.body.dir = direction;
    localStorage.setItem('language', language);
  }, [language, direction]);
  
  const changeLanguage = (lang: Language) => {
    setLanguage(lang);
  };
  
  const t = (key: string): string => {
    const translations = language === 'ar' ? arTranslations : enTranslations;
    return translations[key] || key;
  };
  
  // New function for getting localized names based on current language
  const getLocalizedName = (arName: string, enName?: string): string => {
    if (language === 'ar') return arName;
    return enName || arName; // If no English name is provided, fall back to Arabic
  };
  
  return (
    <LanguageContext.Provider value={{ language, direction, changeLanguage, t, getLocalizedName }}>
      {children}
    </LanguageContext.Provider>
  );
};

// Import translations as default exports
import arTranslations from '../translations/ar';
import enTranslations from '../translations/en';
