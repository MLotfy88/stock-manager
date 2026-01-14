
import { SupplyTypeItem } from '../../types';

// Default supply types data
export const defaultSupplyTypes: SupplyTypeItem[] = [
  {
    id: 'st1',
    name: 'قسطرة',
    name_en: 'Catheter',
    description: 'جميع أنواع القساطر الطبية',
  },
  {
    id: 'st2',
    name: 'أداة جراحية',
    name_en: 'Surgical Tool',
    description: 'الأدوات المستخدمة في العمليات الجراحية',
  },
  {
    id: 'st3',
    name: 'دواء',
    name_en: 'Medication',
    description: 'الأدوية والعقاقير الطبية',
  },
  {
    id: 'st4',
    name: 'مستهلكات',
    name_en: 'Consumables',
    description: 'المواد الاستهلاكية المستخدمة في الرعاية الصحية',
  },
  {
    id: 'st5',
    name: 'غرسة',
    name_en: 'Implant',
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
