# هيكل المشروع (Project Structure)

هذا المستند يوضح الهيكل الرئيسي للملفات والمجلدات في المشروع.

```
.
├── public/
│   └── ... (ملفات عامة مثل favicon)
├── src/
│   ├── components/
│   │   ├── layout/      # مكونات التخطيط (Header, Sidebar)
│   │   ├── ui/          # مكونات shadcn/ui الأساسية
│   │   ├── dashboard/   # مكونات لوحة التحكم
│   │   ├── supplies/    # مكونات خاصة بالمخزون
│   │   └── consumption/ # مكونات خاصة بالاستهلاك
│   ├── contexts/
│   │   └── LanguageContext.tsx # لإدارة اللغة
│   ├── data/
│   │   ├── defaultData/ # بيانات افتراضية (سيتم إزالتها)
│   │   └── operations/  # منطق عمليات البيانات (CRUD)
│   ├── hooks/
│   │   └── ... (Hooks مخصصة)
│   ├── lib/
│   │   └── utils.ts     # دوال مساعدة عامة
│   ├── pages/
│   │   ├── AdminPage.tsx              # صفحة الإعدادات (المركزية)
│   │   ├── SuppliesPage.tsx           # صفحة عرض المخزون
│   │   ├── AddSupplyPage.tsx          # صفحة إضافة مخزون
│   │   ├── SupplyTypesPage.tsx        # صفحة تعريف المنتجات
│   │   ├── StoresPage.tsx             # صفحة إدارة المخازن
│   │   ├── TransferInventoryPage.tsx  # صفحة نقل المخزون
│   │   ├── InventoryReportPage.tsx    # صفحة جرد المخزون
│   │   ├── ReorderPointReportPage.tsx # صفحة تقرير حد الطلب
│   │   ├── ConsumptionReportPage.tsx  # صفحة تقرير الاستهلاك
│   │   └── ... (بقية الصفحات)
│   ├── translations/
│   │   ├── ar.ts        # ملفات الترجمة
│   │   └── en.ts
│   ├── types/
│   │   └── index.ts     # تعريفات الأنواع (TypeScript)
│   ├── utils/
│   │   ├── storageUtils.ts # دوال التعامل مع localStorage
│   │   └── dateUtils.ts    # دوال مساعدة للتواريخ
│   ├── App.tsx          # المكون الرئيسي وتعاريف المسارات
│   ├── main.tsx         # نقطة دخول التطبيق
│   └── index.css        # تنسيقات CSS عامة
├── memory-bank/
│   ├── projectbrief.md
│   ├── techContext.md
│   ├── systemPatterns.md
│   ├── productContext.md
│   ├── activeContext.md
│   └── progress.md
├── ANALYSIS.md
├── DEPLOYMENT_GUIDE.md
├── package.json
├── vite.config.ts
└── ... (ملفات الإعدادات الأخرى)
