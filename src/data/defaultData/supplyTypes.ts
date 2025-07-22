
import { SupplyTypeItem } from '../../types';

// Default supply types data
export const defaultSupplyTypes: SupplyTypeItem[] = [
  {
    id: 'st1',
    name: 'قسطرة',
    nameEn: 'Catheter',
    description: 'جميع أنواع القساطر الطبية',
  },
  {
    id: 'st2',
    name: 'أداة جراحية',
    nameEn: 'Surgical Tool',
    description: 'الأدوات المستخدمة في العمليات الجراحية',
  },
  {
    id: 'st3',
    name: 'دواء',
    nameEn: 'Medication',
    description: 'الأدوية والعقاقير الطبية',
  },
  {
    id: 'st4',
    name: 'مستهلكات',
    nameEn: 'Consumables',
    description: 'المواد الاستهلاكية المستخدمة في الرعاية الصحية',
  },
  {
    id: 'st5',
    name: 'غرسة',
    nameEn: 'Implant',
    description: 'الأجهزة القابلة للزرع',
  },
];

// Supply type translations
export const supplyTypeTranslations: Record<string, string> = {
  catheter: 'قسطرة',
  surgical_tool: 'أداة جراحية',
  medication: 'دواء',
  consumable: 'مستهلكات',
  implant: 'غرسة',
  other: 'أخرى'
};

// English translations for supply types
export const supplyTypeTranslationsEn: Record<string, string> = {
  catheter: 'Catheter',
  surgical_tool: 'Surgical Tool',
  medication: 'Medication',
  consumable: 'Consumables',
  implant: 'Implant',
  other: 'Other'
};
