
import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface FormHeaderProps {
  title: string;
  description: string;
}

const FormHeader: React.FC<FormHeaderProps> = ({ title, description }) => {
  const { t } = useLanguage();
  
  return (
    <CardHeader>
      <CardTitle>{t(title)}</CardTitle>
      <CardDescription>{t(description)}</CardDescription>
    </CardHeader>
  );
};

export default FormHeader;
