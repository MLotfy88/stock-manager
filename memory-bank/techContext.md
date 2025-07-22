# السياق التقني (Tech Context)

## حزمة التقنيات (Tech Stack)
- **إطار العمل (Framework):** React.js (v18)
- **لغة البرمجة:** TypeScript
- **أداة البناء (Build Tool):** Vite
- **مكتبة واجهة المستخدم (UI Library):** `shadcn/ui` (مبنية على Tailwind CSS و Radix UI)
- **التوجيه (Routing):** `react-router-dom`
- **إدارة النماذج (Forms):** `react-hook-form` مع `zod` للتحقق.
- **إدارة بيانات الخادم (Server State):** `@tanstack/react-query`
- **الرسوم البيانية (Charts):** `recharts`
- **قاعدة البيانات (المقترحة):** Supabase (PostgreSQL)

## بيئة التطوير
- **مدير الحزم:** npm
- **أوامر رئيسية:**
    - `npm install`: لتثبيت الاعتماديات.
    - `npm run dev`: لتشغيل خادم التطوير المحلي.
    - `npm run build`: لبناء نسخة الإنتاج من التطبيق.

## الاعتماديات الرئيسية
- `@supabase/supabase-js`: للتفاعل مع قاعدة بيانات Supabase.
- `lucide-react`: لمكتبة الأيقونات.
- `date-fns`: للتعامل مع التواريخ.
- `react-i18next` و `i18next`: (أو ما يماثلها مثل `LanguageContext` الحالي) لدعم تعدد اللغات.
