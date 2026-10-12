## Why

Der Food-Frontend-QA-Durchlauf vom 2026-10-10 hat Befunde ergeben, die weder in `meal-plan-input-guardrails` noch in `shopping-list-source-freshness` stehen. Der Abgleich mit main am 2026-10-12 zeigt: Kochplan-PDF, Rezept-PDF-Nährwerte, Stückäquivalente, Fehler-statt-Leerzustand im Einkaufen-Tab und die Rezepttyp-Validierung sind bereits behoben. Offen sind stille Datenlücken (fehlende Nährwerte, Zeilen ohne Portion), doppelte Einkaufszeilen und einige kleinere UX-Fehler.

## What Changes

- Rezept-Anlage und -Änderung trimmen den Titel und lehnen reine Leerzeichen-Titel ab.
- Der Essensplan warnt bei Zutaten ohne Nährwerte (analog zu „Zutat ohne Preis“), statt sie still als 0 kcal zu zählen. Rezeptzeilen ohne Zutat/Portion erzeugen eine Warnung im Plan-Check.
- Der Rezept-Editor kennzeichnet Zutaten ohne Portion vor der Auswahl und stellt eine Standard-Gramm-Portion bereit, statt nach der Auswahl mit einem Toast zu scheitern.
- Die Einkaufsliste fasst Dubletten-Zutaten (Banane/Bananen, Möhre/Möhren) zu einer Zeile zusammen.
- Der Frühstücksassistent bricht bei leerem Katalog mit klarem Hinweis ab, statt Schritte durchklickbar zu lassen.
- Kleinere Punkte: Slug-Transliteration `ß` → `ss`, Standard-Zubereitungszeit „Keine Angabe“, Aufrunden von Stück und Packungen in der Einkaufsliste, korrekter Plural bei „Portion/Portionen“, Markdown-Rendering in der Gerichtssuche, Rezept-Wizard Schritt Zutaten bei 320 px.
- Regressionstest für das Kochplan-PDF mit `Decimal`-Wert in `cached_price_total`.

Nicht Teil dieses Changes: Grenzwerte für Pläne, Mengen und Faktoren (`meal-plan-input-guardrails`) sowie Aktualitätshinweis für Einkaufslisten (`shopping-list-source-freshness`).

## Capabilities

### New Capabilities
- `recipe-input-validation`: Titel-Normalisierung und -Prüfung bei Rezepten.
- `plan-data-completeness-warnings`: Warnungen für fehlende Nährwerte und Rezeptzeilen ohne Zutat im Plan; Kennzeichnung portionsloser Zutaten im Editor.
- `shopping-list-ingredient-consolidation`: Zusammenfassen von Dubletten-Zutaten und Aufrunden kaufbarer Mengen.
- `breakfast-empty-catalog-guidance`: Verhalten des Frühstücksassistenten bei leerem Katalog.
- `food-qa-polish`: Slug-Transliteration, Standard-Zubereitungszeit, Plural, Markdown in der Gerichtssuche, 320-px-Layout des Zutaten-Schritts.

### Modified Capabilities
- Keine; die Anforderungen stehen gesammelt in den neuen Capabilities, um bestehende Specs nicht zu überschreiben.

## Impact

- Backend: `recipe/schemas/recipes.py`, `content/schemas/base.py`, `content/models/core.py` (Slug), `planner` (Plan-Check, Nährwert-Abdeckung), `supply/services/shopping_service.py`, Ingredient-Merge/Alias-Daten.
- Frontend (`frontend-food`): `InlineIngredientEditor`, `ShoppingView`, Frühstücksassistent (`StepBasis.tsx`), Gerichtssuche, Rezept-Wizard; Zod-Schemas bleiben mit Pydantic synchron.
- Tests: Backend (PDF, Validierung, Aggregation) und Frontend/E2E (320 px).
