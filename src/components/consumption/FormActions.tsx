
import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Save, RotateCcw } from 'lucide-react';

interface FormActionsProps {
  onReset: () => void;
  isValid: boolean;
}

const FormActions: React.FC<FormActionsProps> = ({ onReset, isValid }) => {
  const { t } = useLanguage();
  
  return (
    <div className="flex justify-end space-x-4 pt-4">
      <Button type="button" variant="outline" onClick={onReset}>
        <RotateCcw className="mr-2 h-4 w-4" />
        {t('reset')}
      </Button>
      <Button type="submit" disabled={!isValid}>
        <Save className="mr-2 h-4 w-4" />
        {t('save')}
      </Button>
    </div>
  );
};

export default FormActions;
