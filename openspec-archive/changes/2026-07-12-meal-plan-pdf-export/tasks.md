## 1. Backend: Django-Templates und CSS aufsetzen

- [x] 1.1 `planner/templates/` und `recipe/templates/` Verzeichnisse erstellen (falls nicht vorhanden)
- [x] 1.2 `meal_plan_pdf.css` aus `frontend-food/src/index.css` Zeilen 260–564 portieren: `@media print`-Wrapper entfernen, Tailwind-Klassen durch reines CSS ersetzen, `@page`-Rules für A4/Letter, Running Headers/Footers
- [x] 1.3 `meal_plan_pdf.html` Django-Template erstellen: Deckblatt, Personenliste, Tag-Schleife, Essens-Boxen, Notizbereiche, Tagesende-Linien, Koch-Zeitplan, Einkaufsliste, Allergen-Matrix, Nährwert-Tabelle, Footer — alle Sektionen mit Conditional-Blöcken
- [x] 1.4 `recipe_pdf.css` erstellen: Rezept-spezifische Druckregeln (Zutatenliste, Schritte, Nährwert-Tabelle, Allergen-Hinweise)
- [x] 1.5 `recipe_pdf.html` Django-Template erstellen: Titel, Bild, Beschreibung, Zutatenliste mit Mengen, Zubereitungsschritte, Nährwerte pro 100g/Portion, Allergen-Hinweise
- [x] 1.6 `cooking_schedule_pdf.css` erstellen: Kochbuch-Layout (Serifen, Rezept pro Seite, Allergen-Badges, Tageskopf mit Kosten)
- [x] 1.7 `cooking_schedule_pdf.html` Django-Template erstellen: Deckblatt, Tagesabschnitte, Rezept-Karten mit Zutaten/Schritten/Badges, Tageskosten
- [x] 1.8 Inspi-Logo in `settings/base.py` als `INSPI_LOGO_PATH` konfigurieren, Default auf `static/img/inspi-logo.png`
- [x] 1.9 Sicherstellen dass WeasyPrint-Systemabhängigkeiten im Dockerfile installiert sind (`libpango`, `libpangocairo`)
- [x] 1.10 `babel` zu `backend/pyproject.toml` Dependencies hinzufügen

## 2. Backend: MealPlan PDF — Datenaggregation

- [x] 2.1 `build_meal_context(meal_plan)` — Meals gruppieren nach Datum, Exchange-Splits pro Mahlzeit erkennen, effektive Portionen berechnen
- [x] 2.2 `build_group_member_context(meal_plan)` — GroupMembers mit NutritionalTags, date_ranges, Alter/Geschlecht aufbereiten
- [x] 2.3 `aggregate_shopping_list(meals)` — Zutaten summiert, nach RetailSection gruppiert, Frisch-Marker, Pro-Tag und Gesamt
- [x] 2.4 `build_allergen_matrix(meals)` — Allergene pro Tag via NutritionalTags sammeln, EU_ALLERGENS-Map, Kreuztabelle
- [x] 2.5 `build_nutrition_table(meals, group_members)` — Soll/Ist/Delta für Energie, Protein, Fett, KH pro Tag
- [x] 2.6 `build_cooking_timeline(meals)` — Rezepte mit Vorlaufzeit > 60 Min als Zeitstrahl pro Tag
- [x] 2.7 `collect_ingredient_overrides(meal_plan)` — Excluded-Ingredients und Override-Mengen aus IngredientOverride sammeln

## 3. Backend: MealPlan PDF — Rendering

- [x] 3.1 `generate_meal_plan_pdf()` umschreiben: Context bauen → Template rendern → WeasyPrint `HTML(string=html).write_pdf()`
- [x] 3.2 Alle Query-Parameter unterstützen: `include_notes`, `exclude_shopping_list`, `exclude_nutrition`, `exclude_allergens`, `compact_mode`, `page_format`
- [x] 3.3 Deutsche Locale-Formatierung via `babel`: `format_date()` für Wochentage, `format_decimal()` für Mengen
- [x] 3.4 `Content-Disposition: inline` für alle PDF-Endpunkte (im Browser-Tab öffnen)

## 4. Backend: Rezept PDF

- [x] 4.1 `recipe/services/pdf_export.py` erstellen: `generate_recipe_pdf(recipe)` — Zutatenliste mit Mengen aus RecipeItems, Zubereitungsschritte aus Markdown, Nährwerte aus `cached_*`-Feldern
- [x] 4.2 `GET /api/recipes/{slug}/export/pdf/` Endpunkt in `recipe/api/recipes.py` mit Auth-Check und `page_format`-Parameter
- [x] 4.3 Allergene aus NutritionalTags der Zutaten extrahieren und als Textzeile rendern

## 5. Backend: Kochplan PDF

- [x] 5.1 `planner/services/cooking_schedule_pdf.py` erstellen: `generate_cooking_schedule_pdf(meal_plan)` — Tage und Rezepte gruppieren, Zutaten auf effective_portions skalieren
- [x] 5.2 `GET /api/meal-plans/{id}/cooking-schedule/export/pdf/` Endpunkt in `planner/api/meal_plan.py`
- [x] 5.3 Allergen-Badges: Farbige Labels für jedes Allergen im Rezept (Rot für Nüsse, Orange für Gluten, Blau für Laktose, Grau für Rest)
- [x] 5.4 Tageskosten: Summe der `cached_price_total` der Rezepte, skaliert auf effective_portions

## 6. Backend: DGE-Referenzwerte

- [x] 6.1 `NORM_PERSON_DAILY_PROTEIN_G`, `NORM_PERSON_DAILY_FAT_G`, `NORM_PERSON_DAILY_CARBS_G` in `supply/data/dge_reference.py` definieren
- [x] 6.2 Pro-Tag-Skalierung: Effektive Personenzahl = GroupMembers die an diesem Tag laut date_ranges anwesend sind × DGE-Norm

## 7. Backend: Tests

- [x] 7.1 MealPlan PDF Unit-Tests: Exchange-Split, Allergen-Matrix, Nährwert-Aggregation, Einkaufsliste, Overrides, Personenliste mit date_ranges
- [x] 7.2 MealPlan PDF API-Tests: Authentifizierung, Query-Parameter (alle Kombinationen), ungültiger page_format
- [x] 7.3 Rezept PDF Unit-Tests: Zutatenliste mit Mengen, Nährwerte pro 100g/Portion, Allergen-Textzeile
- [x] 7.4 Rezept PDF API-Tests: Erfolgreicher Export, Slug nicht gefunden, Nicht authentifiziert
- [x] 7.5 Kochplan PDF Unit-Tests: Rezept-Karten, Allergen-Badges, Tageskosten-Skalierung
- [x] 7.6 Kochplan PDF API-Tests: Erfolgreicher Export, Keine Meals, Nicht authentifiziert
- [x] 7.7 Edge-Case-Tests: Leerer MealPlan, keine GroupMembers, keine Allergene, keine Nährwerte, Rezept ohne Bild

## 8. Frontend: PdfExportDialog-Komponente

- [x] 8.1 `PdfExportDialog.tsx` Komponente erstellen: Modal mit Checkboxen für Optionen, Dropdown für page_format, Props für `baseUrl` + `availableOptions` + `filename`
- [x] 8.2 Checkboxen dynamisch: Essensplan-Dialog zeigt 5 Optionen (Notizen, Einkaufsliste, Nährwerte, Allergene, Kompaktmodus), Rezept-Dialog zeigt nur page_format, Kochplan-Dialog zeigt nur page_format
- [x] 8.3 „PDF öffnen"-Button baut URL mit Query-Parametern und ruft `window.open(url)` auf
- [x] 8.4 TypeScript-Tests für PdfExportDialog: Alle Checkboxen, URL-Bau, Öffnen-Button

## 9. Frontend: Integration in bestehende Seiten

- [x] 9.1 MealPlan-Detailseite: „Drucken"-Button durch „Als PDF öffnen"-Button ersetzen, der PdfExportDialog öffnet
- [x] 9.2 RecipeDetailPage: „Drucken"-Link durch PDF-Button mit PdfExportDialog ersetzen
- [x] 9.3 RecipeSidebar: „Drucken"-Button durch PDF-Button ersetzen
- [x] 9.4 RecipeMobileActionBar: „Drucken"-Button durch PDF-Button ersetzen
- [x] 9.5 CookingScheduleTab: „Drucken"-Link durch PDF-Button mit PdfExportDialog ersetzen

## 10. Frontend: HTML-Druckansicht und CSS bereinigen

- [x] 10.1 `MealPlanPrintPage.tsx`, `mealPlanPrintUtils.ts`, deren Test-Dateien löschen
- [x] 10.2 `CookingSchedulePrintPage.tsx` löschen
- [x] 10.3 `RecipePrintPage.tsx` löschen
- [x] 10.4 `index.css` Zeilen 260–564 löschen (alle `meal-plan-print-*` Regeln und `@media print` Block)
- [x] 10.5 `App.tsx` — Routen für `/meal-plans/:id/print`, `/meal-plans/:id/cooking-schedule/print`, `/recipes/:slug/print` entfernen
- [x] 10.6 Import-Referenzen auf gelöschte Seiten in anderen Dateien entfernen

## 11. Finale Qualitätssicherung

- [x] 11.1 MealPlan PDF mit 3–7 Tagen generieren und visuell prüfen: alle Sektionen, Exchange-Splits, Formatierung
- [x] 11.2 MealPlan PDF mit allen exclude-Parametern testen: Sektionen korrekt ein/ausgeblendet
- [x] 11.3 Rezept PDF generieren und visuell prüfen: Zutaten, Schritte, Nährwerte, Allergene
- [x] 11.4 Kochplan PDF generieren und visuell prüfen: Kochbuch-Layout, Badges, Kosten, Serifen
- [x] 11.5 PdfExportDialog: Alle Checkboxen testen, URL-Parameter korrekt, PDF öffnet sich im Tab
- [x] 11.6 `uv run python manage.py makemigrations --check` — muss 0 sein
- [x] 11.7 `uv run pytest planner/tests/ recipe/tests/ -xvs` — alle Tests grün
- [x] 11.8 Code-Review: Keine `print` Statements, alle Type-Hints, deutsche Fehlermeldungen
- [x] 11.9 Spec-Dateien prüfen: 9 REMOVED Deltas + 3 neue Specs + 1 MODIFIED Delta = alle konsistent mit Proposal
