
import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface RequestedByInputProps {
  requestedBy: string;
  setRequestedBy: (value: string) => void;
}

const RequestedByInput: React.FC<RequestedByInputProps> = ({ requestedBy, setRequestedBy }) => {
  const { t } = useLanguage();
  
  return (
    <div className="space-y-2">
      <Label htmlFor="requestedBy">{t('requested_by')}</Label>
      <Input 
        id="requestedBy" 
        value={requestedBy} 
        onChange={(e) => setRequestedBy(e.target.value)} 
        placeholder={t('enter_name')} 
      />
    </div>
  );
};

export default RequestedByInput;
