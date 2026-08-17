# Implementation Tasks — recipe-detail-cleanup

Reihenfolge: Zuerst Backend entfernen, dann Schemas synchronisieren, dann Frontend entfernen und umbauen, dann Tests und Verifikation. Jede Task ist so geschnitten, dass sie einzeln verifizierbar und committable ist.

## 1. Backend — Inspi-Score entfernen

- [x] 1.1 Endpoint `GET /api/recipes/{id}/inspi-score/` aus `backend/recipe/api/` entfernen (Router-Registrierung und Handler-Funktion)
- [x] 1.2 Datei `backend/recipe/services/inspi_score_service.py` löschen
- [x] 1.3 Schemas `InspiScoreOut`, `InspiDimensionOut` (und ggf. weitere Inspi-Score-spezifische Schemas) aus `backend/recipe/schemas/` entfernen; aus `__init__.py` Re-Exports löschen
- [x] 1.4 Datei `backend/recipe/tests/test_inspi_score.py` löschen
- [x] 1.5 Nach weiteren Referenzen auf `inspi_score`, `InspiScore`, `calculate_inspi_score` im Backend suchen (grep) und entfernen
- [x] 1.6 `uv run python manage.py check` erfolgreich durchlaufen lassen

## 2. Backend — Recipe-Checks entfernen

- [x] 2.1 Endpoint `GET /api/recipes/{id}/checks/` aus `backend/recipe/api/` entfernen
- [x] 2.2 In `backend/recipe/services/recipe_checks.py` die Check-Aggregator-Funktion (die das Response für den Endpoint zusammenbaut) entfernen
- [x] 2.3 Helper `get_recipe_nutritional_values` in `backend/recipe/services/recipe_checks.py` explizit belassen (wird von `nutri_improvement_service.py` genutzt); per Kommentar oder Modul-Umbenennung klarstellen, dass die Datei jetzt reiner Nutrition-Helper ist
- [x] 2.4 Schemas `CheckOut` (und zugehörige Dimension-Schemas) aus `backend/recipe/schemas/` entfernen
- [x] 2.5 Falls vorhanden: `backend/recipe/tests/test_recipe_checks.py` löschen oder auf die verbleibenden Nutrition-Helper einschränken
- [x] 2.6 `uv run pytest backend/recipe` grün

## 3. Frontend — API-Layer und Schemas synchronisieren

- [x] 3.1 Hook `useInspiScore` und zugehörige Query-Key-Fabrik aus `frontend/src/api/recipes.ts` entfernen
- [x] 3.2 Hook `useRecipeChecks` und zugehörige Query-Key-Fabrik aus `frontend/src/api/recipes.ts` entfernen
- [x] 3.3 Zod-Schema `InspiScoreSchema` (plus abgeleitete Types `InspiScore`, `InspiDimension`) aus `frontend/src/schemas/recipe.ts` entfernen
- [x] 3.4 Zod-Schema `CheckSchema` und abgeleitete Types aus `frontend/src/schemas/recipe.ts` entfernen
- [x] 3.5 TypeScript-Build `pnpm tsc --noEmit` (oder projekt-spezifisch) grün

## 4. Frontend — InspiScore-Komponente entfernen

- [x] 4.1 Datei `frontend/src/components/recipe/InspiScore.tsx` löschen
- [x] 4.2 Falls vorhanden: zugehörige Story/Test-Dateien (`InspiScore.stories.tsx`, `InspiScore.test.tsx`) löschen
- [x] 4.3 Import `InspiScore` in `frontend/src/pages/recipes/RecipeDetailPage.tsx` und sämtliche JSX-Verwendungen entfernen
- [x] 4.4 Assets: prüfen ob `favicon.png`-Import/Referenz speziell für InspiScore existierte und entfernen (favicon bleibt als App-Favicon erhalten)

## 5. Frontend — Recipe-Checks-Box entfernen

- [x] 5.1 JSX-Block, der die "Recipe Checks"-Box rendert, aus `RecipeDetailPage.tsx` entfernen
- [x] 5.2 Zugehörige lokale Hilfsfunktionen/Render-Komponenten, die nur für diese Box existierten, entfernen

## 6. Frontend — Header Info-Box umbauen

- [x] 6.1 JSX-Block der Info-Box "Normportionen (15 J., männl., PAL 1.5)" in `RecipeDetailPage.tsx` lokalisieren und entfernen
- [x] 6.2 An derselben Position Nutri-Score-Badge (A–E, farbig) aus `cached_nutri_class` rendern; existierende Badge-Komponente (`NutriScoreBadge` o.ä.) wiederverwenden — keine neue Komponente erstellen
- [x] 6.3 KPI-Box "Kosten pro Person" entfernen; durch KPI-Box "Gesamtkosten" ersetzen, die `cached_price_total` formatiert als EUR anzeigt (z.B. `8,40 €`), ohne Rating/Ampel
- [x] 6.4 Graceful Fallback: Wenn `cached_nutri_class` null ist, Badge ausblenden (oder neutralen "–" Platzhalter zeigen — final Variante gemäß `design.md`-Decision)
- [x] 6.5 Graceful Fallback: Wenn `cached_price_total` null ist, KPI-Box ausblenden

## 7. Frontend — Zweites Nutri-Score-Display entfernen

- [x] 7.1 Den Nutri-Score-Block, der eigenständig oberhalb der Zutatenliste gerendert wird (außerhalb der Info-Box), in `RecipeDetailPage.tsx` lokalisieren und entfernen
- [x] 7.2 Sicherstellen, dass Nutri-Score weiterhin im Gesundheitsanalyse-Detail-Bereich erhalten bleibt (nur die obere Duplizierung entfernen)

## 8. Frontend — "pro Portion"-Texte bereinigen

- [x] 8.1 In Preis-Analyse-Section: Text "pro Portion" an KPI-Werten entfernen
- [x] 8.2 In Gewichtsanalyse-Section: Text "pro Portion" an KPI-Werten entfernen
- [x] 8.3 In Gesundheitsindikatoren-Section: Text "pro Portion" an KPI-Werten entfernen
- [x] 8.4 Im Makronährstoff-/Nährwert-Breakdown: "pro Portion" explizit belassen (nicht anfassen)

## 9. Frontend — Zubereitungsanalyse entfernen

- [x] 9.1 Gesamte `AnalysisSection` mit Titel "Zubereitungsanalyse" aus `RecipeDetailPage.tsx` entfernen
- [x] 9.2 Ausschließlich dort verwendete Imports und Hilfskomponenten entfernen

## 10. Frontend — Einklappbare Zubereitungs-Section

- [x] 10.1 Zubereitungs-Section (Markdown-`description` via `MarkdownRenderer`) in einen einklappbaren `AnalysisSection`-Wrapper hüllen
- [x] 10.2 Default-State bestimmen: `useState(() => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches)` — auf Mobile eingeklappt, auf Desktop ausgeklappt
- [x] 10.3 Klick auf Section-Header wechselt Expand-State (Priorität vor Default)
- [x] 10.4 Manuelle Verifikation auf Mobile-Viewport (320–767px) und Desktop-Viewport (≥1024px)

## 11. Verifikation

- [x] 11.1 `pnpm tsc --noEmit` grün, keine ungenutzten Imports
- [x] 11.2 `pnpm lint` grün
- [x] 11.3 `uv run pytest backend/recipe` grün
- [x] 11.4 Manueller Smoke-Test: Rezept-Detailseite für (a) Rezept mit vollen Daten, (b) Rezept ohne `cached_nutri_class`, (c) Rezept ohne `cached_price_total` — jeweils Mobile + Desktop
- [x] 11.5 DevTools Network-Tab: sicherstellen, dass keine `/inspi-score/` oder `/checks/` Requests mehr abgesetzt werden
- [x] 11.6 Zeilenzahl von `RecipeDetailPage.tsx` vor/nach messen (Ziel: deutliche Reduktion Richtung <1400 Zeilen, Feinstrukturierung kommt in Change #3)

## 12. OpenSpec Archive (nach Merge)

- [ ] 12.1 `openspec validate recipe-detail-cleanup --strict` erfolgreich
- [ ] 12.2 Change via `openspec archive recipe-detail-cleanup` archivieren; Delta in `openspec/specs/recipe/spec.md` anwenden
