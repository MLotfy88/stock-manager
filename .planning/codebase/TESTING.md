# Testing

## Current State
- The codebase relies heavily on TypeScript for static analysis.
- Currently, there is a lack of widespread automated unit or e2e test files in the standard mapping (e.g., no overt `__tests__` or `.spec.ts` prevalence).
- `test-barcode.ts` and `test_date.cjs` appear to be exploratory scripts rather than full test suites.

## Recommendations
- Introduce Vitest, as the project uses Vite.
- Introduce React Testing Library for component unit testing.
- Playwright or Cypress could be used for end-to-end flows, especially for critical paths like supply addition and inventory reporting.
