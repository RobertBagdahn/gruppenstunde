## REMOVED Requirements

### Requirement: Dedizierte Druckansicht für Essensplan
**Reason**: Die browser-basierte HTML-Druckansicht (`/meal-plans/:id/print`, `window.print()`) wird durch server-seitigen PDF-Export (`meal-plan-pdf-export`) abgelöst. Der Nutzer will keine HTML-Seite zum Drucken, sondern einen sauberen PDF-Export via WeasyPrint.
**Migration**: Der „Drucken"-Button im MealPlan wird durch einen Link zu `GET /api/meal-plans/{id}/export/pdf/` ersetzt. Die Route `/meal-plans/:id/print` entfällt. `MealPlanPrintPage.tsx`, `mealPlanPrintUtils.ts` und alle `meal-plan-print-*` CSS-Regeln werden gelöscht.
