## Why

Die Nährwert-Regelanzeige in der Planungsansicht vermischt zwei grundlegend verschiedene Bewertungsmodi — **Summe pro Tag** (`scope=day`) und **Durchschnitt über den Plan** (`scope=meal_event`) — ohne sie visuell zu trennen. Nutzer erkennen nicht, ob eine Ampel-Bewertung eine Tages-Summe oder einen Plan-Durchschnitt bewertet. Zusätzlich dividiert der `suggestion_service` fälschlich die Thresholds von `meal_event`-Regeln durch die Anzahl der Tage, was die SollIstBar-Anzeige verfälscht.

## What Changes

- **Backend-Fix**: `suggestion_service.py` teilt Thresholds nicht mehr durch `num_days` — nur der Ist-Wert wird auf den Tagesdurchschnitt normalisiert. Die Thresholds bleiben als originale Pro-Tag-Werte erhalten. **BREAKING**: Ändert das Verhalten des `GET /api/meal-plans/{id}/suggestions/` Endpunkts (Threshold-Werte in SuggestionOut).
- **NutritionView.tsx**: Visuelle Trennung zwischen `day`-Regeln (Summe, mit Tages-Label) und `meal_event`-Regeln (Durchschnitt, mit Plan-Ø-Label). Statt willkürlichem First-Match werden beide Scope-Typen in getrennten Sektionen dargestellt.
- **SollIstBar.tsx**: Neuer `scopeLabel`-Prop für Kontext-Anzeige (z.B. "Summe Tag 3" oder "Ø 5 Tage"). Zeigt die relevante Bezugsgröße als Label über dem Bar an.
- **SuggestionCard.tsx**: Zeigt bei Regel-Vorschlägen ein Scope-Badge, das "Summe" oder "Durchschnitt" sowie die Anzahl Tage / den konkreten Tag ausweist.

## Capabilities

### New Capabilities

Keine neuen Capabilities.

### Modified Capabilities

- `meal-plan-soll-ist-band`: Entfernt die fehlerhafte Anforderung, dass `meal_event`-Thresholds durch `num_days` geteilt werden. Thresholds im SuggestionOut bleiben als Pro-Tag-Werte. SollIstBar erhält `scopeLabel`-Prop.
- `meal-cockpit`: Day- und meal_event-Rule-Evaluierung in der NutritionView werden visuell getrennt. Erstes separates Rendering beider Scopes mit Scope-Labels.
- `meal-plan-suggestions`: SuggestionCard zeigt Scope-Kontext (Tag-Nummer oder Ø-Plan) als sichtbares Label.

## Impact

- **Backend**: `backend/recipe/services/suggestion_service.py` (Zeilen 163-216, Threshold-Division entfernen)
- **Schema (Pydantic)**: `SuggestionOut` — `min_green`/`max_green`/`target_mid` für `meal_event`-Scope ändern sich (bleiben ungeteilt)
- **Schema (Zod)**: Keine Änderung nötig (Werte sind weiterhin numbers)
- **Frontend**: `SollIstBar.tsx`, `NutritionView.tsx`, `SuggestionCard.tsx`
- **Tests**: `backend/recipe/tests/test_suggestion_service.py`, Frontend-Komponententests für SollIstBar und NutritionView
- **Specs**: `meal-plan-soll-ist-band/spec.md`, `meal-cockpit/spec.md`, `meal-plan-suggestions/spec.md`
