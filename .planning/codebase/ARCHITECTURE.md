# Architecture

## Core Paradigm
The application is a progressive web app/hybrid mobile application built using React and Capacitor. It takes a "Local-First" or "Offline-Capable" approach using Dexie for local storage, combined with React Query and Supabase for cloud synchronization and remote data persistence.

## Key Layers
1. **Pages Layer**: Maps to specific routes (`/src/pages`). Contains business logic orchestrating UI.
2. **Components Layer**: Reusable UI, separated into `ui` (base shadcn primitives) and feature-oriented (`dashboard`, `supplies`, `packages`, etc.) in `/src/components`.
3. **Data Layer**: 
    - `Dexie` is used for client-side databases.
    - `Supabase` client used for remote interaction.
    - `React Query` acts as the data fetching and caching layer.
4. **Mobile Bridge**: Web application is wrapped in Capacitor to deploy to Android, accessing native Camera APIs.
