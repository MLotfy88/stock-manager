# Codebase Structure

## Directory Layout
- `/src`
  - `/components`: UI elements. Sub-categorized radially: `common`, `ui` (shadcn), `layout`, domain items (`consumption`, `supplies`, `packages`).
  - `/contexts`: React Context providers for global state.
  - `/hooks`: Custom React hooks (often wrapping React Query).
  - `/pages`: Route-level entry points. Covers domains like Admin, Alerts, Management, Suppliers, Returns, etc.
  - `/data`: Static data / configurations.
  - `/lib`: Utility instances (e.g. Supabase client setup).
  - `/utils`: Helper functions.
  - `/types`: TypeScript definitions.
  - `/translations`: i18n configurations.
  - `/tools`: Miscellaneous scripts/tools.
- `/supabase`: Contains database migrations and Supabase schema files (`supabase_schema.sql`).
- `/android`: Capacitor Android native project.

## Key Files
- `package.json`: Main project dependencies.
- `vite.config.ts`: Vite setup.
- `tailwind.config.ts`: Styling configuration.
