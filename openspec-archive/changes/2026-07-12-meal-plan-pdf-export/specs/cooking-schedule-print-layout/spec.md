## REMOVED Requirements

### Requirement: Kochbuch-Layout in der Druckansicht
**Reason**: Die browser-basierte Kochplan-Druckansicht (`/meal-plans/:id/cooking-schedule/print`, `CookingSchedulePrintPage.tsx`) wird durch den server-seitigen PDF-Export (`cooking-schedule-pdf-export`) abgelöst. Das Kochbuch-Layout (Serifen, Rezept pro Seite, Allergen-Badges) wird vollständig in WeasyPrint-CSS neu umgesetzt.
**Migration**: Der „Drucken"-Link in CookingScheduleTab wird durch einen „Als PDF öffnen"-Button ersetzt, der den PdfExportDialog öffnet und `GET /api/meal-plans/{id}/cooking-schedule/export/pdf/` aufruft. `CookingSchedulePrintPage.tsx` wird gelöscht.
