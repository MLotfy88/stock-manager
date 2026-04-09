# Codebase Conventions

## Styling
- **Utility-first CSS**: Tailwind CSS is strictly used for almost all styling.
- **Component Design**: shadcn/ui approach - copying component source directly into `/src/components/ui/` and adjusting as necessary.

## State Management
- **Queries & Mutations**: TanStack React Query is central to data-fetching. Custom hooks in `/src/hooks/` encapsulate query keys and network logic.
- **Form State**: `react-hook-form` is the standard, paired with `zod` for declarative validation.

## Typing
- Strict TypeScript everywhere. Use `types/` for shared interfaces.

## Environment
- `.env` controls Supabase keys and other environment variables.
