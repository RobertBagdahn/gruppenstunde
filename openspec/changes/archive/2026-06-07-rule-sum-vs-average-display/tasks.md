## 1. Backend: Threshold-Division fixen

- [x] 1.1 In `backend/recipe/services/suggestion_service.py`, `_evaluate_admin_rules()`: Entferne die Division von `min_green`, `max_green`, `target_mid` durch `num_days` für `scope=meal_event` Regeln (Zeilen 193-199). Nur `current` bleibt durch `num_days` geteilt.
- [x] 1.2 Passe bestehende Tests in `backend/recipe/tests/test_suggestion_service.py` an: Erwarte ungeteilte Threshold-Werte in `SuggestionOut` für `meal_event`-Regeln.
- [x] 1.3 Führe `uv run python manage.py test recipe.tests.test_suggestion_service` aus und stelle sicher, dass alle Tests grün sind.

## 2. Frontend: SollIstBar scopeLabel Prop

- [x] 2.1 In `frontend-food/src/components/shared/SollIstBar.tsx`: Füge optionalen `scopeLabel?: string` Prop hinzu.
- [x] 2.2 Rendere `scopeLabel` (wenn gesetzt) als `<div className="text-xs text-muted-foreground font-medium mb-0.5">` oberhalb der Ist/Soll-Zeile.

## 3. Frontend: NutritionView in zwei Sektionen trennen

- [x] 3.1 In `frontend-food/src/pages/planning/NutritionView.tsx`: Ersetze den `rules.find()` Aufruf (Zeilen 311-314) durch separate Lookups für `day`- und `meal_event`-Regeln.
- [x] 3.2 Erstelle eine "Summe pro Tag"-Sektion: Rendert für jeden Tag (oder nur den ausgewählten Tag) die `day`-Regeln mit `SollIstBar`. Jede SollIstBar erhält `scopeLabel="Summe Tag {N} ({formattedDate})"`.
- [x] 3.3 Erstelle eine "Durchschnitt pro Tag (Ø Plan)"-Sektion: Rendert `meal_event`-Regeln mit `SollIstBar` und `scopeLabel="Ø {N} Tage"`. Bei Auswahl eines einzelnen Tages (`selectedDate !== null`) wird diese Sektion ausgeblendet.
- [x] 3.4 Jede Sektion erhält eine eigene Header-Zeile mit Icon und deutschem Label (z.B. `<Scale>` + "Summe pro Tag" und `<TrendingUp>` + "Durchschnitt pro Tag (Ø Plan)").
- [x] 3.5 Bei Tagesselektion: Zeige nur die "Summe pro Tag"-Sektion für den ausgewählten Tag, blende die "Durchschnitt"-Sektion aus.
- [x] 3.6 Prüfe Mobile-First Darstellung: Labels und Bars müssen auf 320px Breite lesbar bleiben.

## 4. Frontend: SuggestionCard Scope-Badge

- [x] 4.1 In `frontend-food/src/components/suggestions/SuggestionCard.tsx`: Füge ein Scope-Badge oberhalb der `scope_label`-Zeile hinzu.
- [x] 4.2 Für `category="nutrition"` mit `scope="day"`: Zeige Badge "Summe" mit blauem Tint.
- [x] 4.3 Für `category="nutrition"` mit `scope="event"` oder `scope="meal_event"`: Zeige Badge "Ø Plan" mit orangem Tint.
- [x] 4.4 Für `category="nutrition"` mit `scope="meal"`: Zeige Badge "Mahlzeit" mit grünem Tint.
- [x] 4.5 Für andere Kategorien (completeness, budget, duplicate): Kein zusätzliches Badge, `scope_label` wird wie bisher angezeigt.

## 5. Verifikation

- [x] 5.1 Backend-Tests ausführen: `uv run python manage.py test recipe.tests.test_suggestion_service`
- [x] 5.2 Frontend bauen und auf TypeScript-Fehler prüfen: `cd frontend-food && npx tsc --noEmit`
- [x] 5.3 Manuell testen: MealPlan mit mehreren Tagen öffnen, NutritionView und Vorschläge-Tab auf korrekte Trennung und Labels prüfen.
- [x] 5.4 Manuell testen: Einzelnen Tag auswählen — "Durchschnitt"-Sektion muss verschwinden, "Summe"-Sektion zeigt nur den ausgewählten Tag.
