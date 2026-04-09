# Technical Concerns & Debt

1. **State Synchronization**: Maintaining consistency between offline-first IndexedDB (Dexie) and Supabase remote might introduce edge case conflicts during reconnections.
2. **Page Complexity**: `/src/pages/AddSupplyPage.tsx` is exceptionally large (nearly 56KB). This indicates massive local state or mixed concerns that should be refactored into smaller sub-components.
3. **Mobile Build Maintenance**: Managing both progressive web features and Capacitor bridge (specifically camera/barcode edge cases) requires testing on real physical devices.
4. **Testing Deficit**: The lack of a formalized test suite is a major risk given the complexity of inventory data logic.
