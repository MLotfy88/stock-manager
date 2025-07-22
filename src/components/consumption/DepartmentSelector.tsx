
import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface DepartmentSelectorProps {
  department: string;
  setDepartment: (value: string) => void;
}

const DepartmentSelector: React.FC<DepartmentSelectorProps> = ({ department, setDepartment }) => {
  const { t } = useLanguage();
  
  // Department list
  const departments = [
    { id: 'cardiology', name: t('cardiology_dept') },
    { id: 'surgery', name: t('surgery_dept') },
    { id: 'emergency', name: t('emergency_dept') },
    { id: 'radiology', name: t('radiology_dept') },
    { id: 'icu', name: t('icu_dept') },
    { id: 'pharmacy', name: t('pharmacy_dept') },
    { id: 'warehouse', name: t('warehouse_dept') },
    { id: 'other', name: t('other_dept') },
  ];
  
  return (
    <div className="space-y-2">
      <Label htmlFor="department">{t('department')}</Label>
      <Select value={department} onValueChange={setDepartment}>
        <SelectTrigger>
          <SelectValue placeholder={t('select_department')} />
        </SelectTrigger>
        <SelectContent>
          {departments.map(dept => (
            <SelectItem key={dept.id} value={dept.id}>
              {dept.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default DepartmentSelector;
