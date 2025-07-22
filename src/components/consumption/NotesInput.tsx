
import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface NotesInputProps {
  notes: string;
  setNotes: (value: string) => void;
  useTextarea?: boolean;
}

const NotesInput: React.FC<NotesInputProps> = ({ notes, setNotes, useTextarea = false }) => {
  const { t } = useLanguage();
  
  return (
    <div className="space-y-2">
      <Label htmlFor="notes">{t('notes')}</Label>
      {useTextarea ? (
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t('enter_notes')}
          rows={3}
        />
      ) : (
        <Input
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t('enter_notes')}
        />
      )}
    </div>
  );
};

export default NotesInput;
