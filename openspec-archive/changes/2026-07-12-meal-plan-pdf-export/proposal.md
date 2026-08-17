## Why

Der bestehende `meal-plan-export` Spec fordert einen server-seitigen PDF-Export via WeasyPrint — implementiert ist aber nur ein 120-Zeilen-Stub ohne Exchange-Splits, Einkaufsliste, Nährwerte oder deutsches Locale. Parallel wurden unter `enhance-meal-plan-print` browser-basierte HTML-Druckansichten für Essenspläne, Rezepte und Kochpläne gebaut, die der Nutzer explizit nicht will. Ziel ist ein vollständiger, sauberer PDF-Export für alle drei Bereiche (Essensplan, Rezept, Kochplan), der die HTML-Druckansichten ablöst.

## What Changes

- **Backend**: `pdf_export.py` wird komplett neu gebaut — WeasyPrint + Django-Templates + Wiederverwendung des bestehenden Print-CSS
- **Backend neu**: `babel`-Dependency für deutsche Zahlen- und Datumsformatierung
- **Backend neu**: DGE-Makronährstoff-Referenzwerte (Protein, Fett, Kohlenhydrate) in `supply/data/dge_reference.py`
- **API**: `GET /api/meal-plans/{id}/export/pdf/` erhält neue Query-Parameter (`include_notes`, `exclude_shopping_list`, `exclude_nutrition`, `exclude_allergens`, `compact_mode`, `page_format`)
- **API neu**: `GET /api/recipes/{slug}/export/pdf/` — Rezept-PDF-Export
- **API neu**: `GET /api/meal-plans/{id}/cooking-schedule/export/pdf/` — Kochplan-PDF-Export
- **Frontend**: Export-Dialog-Komponente (Modal mit Checkboxen) steuert alle PDF-Optionen vor dem Download
- **Frontend**: HTML-Druckansichten (`MealPlanPrintPage.tsx`, `CookingSchedulePrintPage.tsx`, `RecipePrintPage.tsx`, `mealPlanPrintUtils.ts`, alle `meal-plan-print-*` CSS-Regeln, zugehörige Routen) werden entfernt
- **Frontend**: Druck-Buttons in Recipe- und CookingSchedule-Seiten werden durch PDF-Export-Buttons ersetzt
- **BREAKING**: `/meal-plans/:id/print`, `/meal-plans/:id/cooking-schedule/print`, `/recipes/:slug/print` Routen entfallen ersatzlos

## Capabilities

### New Capabilities

- `meal-plan-pdf-export`: Server-seitiger PDF-Export für Essenspläne — Deckblatt mit Inspi-Logo, Personenliste mit Allergien/Besonderheiten, Tag-pro-Seite-Layout mit Essens-Boxen (Exchange-Split-Varianten als separate Blöcke), Notizbereichen, Koch-Zeitplan pro Tag, Running Headers, Einkaufsliste kategorisiert nach RetailSection mit Frisch-Markern, Allergen-Matrix (14 EU-Allergene), Nährwert-Übersicht (Soll/Ist/Delta), Footer mit Seitenzahl. Konfigurierbar via Query-Parameter und Frontend-Dialog.
- `recipe-pdf-export`: Server-seitiger PDF-Export für Rezepte — Rezept-Titel, Zutatenliste mit Portionsskalierung, Zubereitungsschritte, Nährwert-Übersicht, Allergen-Hinweise
- `cooking-schedule-pdf-export`: Server-seitiger PDF-Export für Kochpläne — Deckblatt, Tagesabschnitte mit Rezept-Karten, Zutatenlisten, Zubereitungsschritte, Allergen-Badges, Kosten-Übersicht

### Modified Capabilities

- `meal-plan-export`: Wird durch `meal-plan-pdf-export` ersetzt (REMOVED)
- `meal-plan-print`: Entfällt — browser-basierte Druckansicht wird durch server-seitigen PDF-Export abgelöst (REMOVED)
- `meal-plan-print-layout`: Entfällt — Layout wandert in `meal-plan-pdf-export` (REMOVED)
- `meal-plan-print-footer`: Entfällt — Footer wandert in `meal-plan-pdf-export` (REMOVED)
- `meal-plan-print-notes`: Entfällt — Notizbereiche wandern in `meal-plan-pdf-export` (REMOVED)
- `meal-plan-print-shopping-list`: Entfällt — Einkaufsliste wandert in `meal-plan-pdf-export` (REMOVED)
- `meal-plan-print-styling`: Entfällt — Styling wandert in `meal-plan-pdf-export` (REMOVED)
- `meal-plan-print-typography`: Entfällt — Typografie wandert in `meal-plan-pdf-export` (REMOVED)
- `recipe-print-route`: Entfällt — browser-basierte Druckansicht wird durch `recipe-pdf-export` abgelöst (REMOVED)
- `cooking-schedule-print-layout`: Entfällt — Layout wandert in `cooking-schedule-pdf-export` (REMOVED)

## Impact

- **Backend**: `planner/services/pdf_export.py` (Rewrite), `recipe/services/pdf_export.py` (neu), `planner/services/cooking_schedule_pdf.py` (neu)
- **Backend**: `planner/api/meal_plan.py` (erweiterte Query-Parameter), `recipe/api/recipes.py` (neuer PDF-Endpunkt)
- **Backend neu**: Django-Templates `planner/templates/meal_plan_pdf.html`, `recipe/templates/recipe_pdf.html`, `planner/templates/cooking_schedule_pdf.html`
- **Backend neu**: CSS-Dateien `planner/templates/meal_plan_pdf.css`, `recipe/templates/recipe_pdf.css`, `planner/templates/cooking_schedule_pdf.css`
- **Backend neu**: Dependency `babel` für Locale-Formatierung
- **Backend erweitert**: `supply/data/dge_reference.py` — neue Konstanten für Protein/Fett/KH-Normen
- **Backend erweitert**: `settings/base.py` — `INSPI_LOGO_PATH`
- **Frontend entfernen**: `MealPlanPrintPage.tsx`, `mealPlanPrintUtils.ts`, `CookingSchedulePrintPage.tsx`, `RecipePrintPage.tsx`, alle `meal-plan-print-*` CSS-Regeln, Routen in `App.tsx`
- **Frontend neu**: `PdfExportDialog` Komponente (Modal mit Checkboxen für alle PDF-Optionen)
- **Frontend ändern**: Druck-Links in `CookingScheduleTab.tsx`, `RecipeDetailPage.tsx`, `RecipeSidebar.tsx`, `RecipeMobileActionBar.tsx` → PDF-Export-Button mit Dialog
- **Specs entfernen**: 9 Spec-Dateien (7 × meal-plan-print-*, recipe-print-route, cooking-schedule-print-layout)
- **Specs aktualisieren**: `meal-plan-export` → REMOVED
- **Tests**: Alte Druck-Tests entfallen; neue Tests für alle drei PDF-Services, API-Endpunkte und Dialog-Komponente
- **Keine Migration nötig**: Alle Daten sind bereits in bestehenden Modellen
