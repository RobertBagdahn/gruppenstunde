## REMOVED Requirements

### Requirement: Dedizierte Druckansicht für Rezepte
**Reason**: Die browser-basierte Druckansicht (`/recipes/:slug/print`, `@media print` CSS) wird durch den server-seitigen PDF-Export (`recipe-pdf-export`) abgelöst. Der Nutzer will keinen HTML-Druck, sondern einen sauberen PDF-Export via WeasyPrint.
**Migration**: Der „Drucken"-Button in RecipeDetailPage, RecipeSidebar und RecipeMobileActionBar wird durch einen „Als PDF öffnen"-Button ersetzt. Der Button öffnet den PdfExportDialog mit Optionen und startet dann den Download via `GET /api/recipes/{slug}/export/pdf/`. Die Route `/recipes/:slug/print` entfällt. `RecipePrintPage.tsx` wird gelöscht.
