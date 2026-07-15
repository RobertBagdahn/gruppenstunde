## Why

Die KI-Portionsvorschläge im Zutat-Zauberstab (`/api/ingredients/{slug}/ai-suggest-all/`) sind aktuell inkonsistent und teilweise defekt: Portionsnamen enthalten Zahlen (z.B. „1 Packung (500g)"), das Übernehmen eines Vorschlags in der bestehenden Zutat schlägt vermutlich mit einem `IntegrityError` fehl, weil `measuring_unit_id` beim Anlegen nie mitgeschickt wird, es gibt keine Möglichkeit alte Portionen gebündelt zu ersetzen, und vier unabhängige Code-Stellen pflegen eigene, sich widersprechende Beispieltabellen für Einheiten-Gewichte. Zusätzlich kennt die KI weder das Frühstücks-„Belag"-System noch Backzutaten, wodurch bei getaggten Zutaten unpassende oder doppelte Portionen entstehen können.

## What Changes

- **BREAKING**: Portionsnamen aus KI-Vorschlägen dürfen keine Ziffern mehr enthalten (Validierung im gemeinsamen `PortionSuggestion`-Schema); bestehende zahlenhaltige Namen bleiben unangetastet, bis ein Nutzer den Zauberstab erneut ausführt.
- Einführung eines gemeinsamen `portion_type`-Enums (`system_gramm`, `rezeptportion`, `packung`, `belag`, `backmenge`) und eines zentralen `PortionSuggestion`-Pydantic-Schemas, das von allen vier bisherigen KI-Prompt-Stellen genutzt wird (`ingredient_ai_suggest_service.suggest_all_fields`, `ingredient_ai_suggest_service.ai_create_ingredient`, `url_import_service`, `ingredient_enrichment`).
- Konsolidierung der bisher vierfach duplizierten Einheiten-Gewichts-Beispieltabelle (EL, TL, Prise, Ei, Schuss, …) in ein gemeinsames Wissens-Modul.
- Das Antwortschema der Portionsvorschläge wird um verpflichtende Felder erweitert: mindestens eine Rezeptportion, mindestens eine Packungsgröße (mehrere möglich, z.B. „Packung", „Großpackung"), immer die System-Portion „1g". Bei Zutaten mit Tag `breakfast-topping` schlägt die KI zusätzlich „Belag knapp/normal/üppig" vor; bei Zutaten mit dem neuen Tag `baking-ingredient` zusätzlich typische Backmengen.
- Neuer Content-Tag `baking-ingredient` zur Kennzeichnung von Backzutaten (analog `breakfast-topping`).
- Neuer atomarer Backend-Endpoint `POST /api/ingredients/{slug}/portions/ai-apply/`, der ausgewählte Portionsvorschläge inkl. `measuring_unit_id` in einer DB-Transaktion anlegt (behebt den Speicher-Bug und die Race-Condition aus paralleler Einzel-Mutation).
- Neue, nutzergesteuerte Checkbox „Alte Portionen ersetzen" im Zauberstab-Dialog: nur wenn aktiviert, werden vor dem Anlegen alle bestehenden Portionen der Zutat (inkl. system- und Belag-Portionen) soft-gelöscht; danach wird die System-Portion „1g" verpflichtend neu angelegt.
- Frontend: Zauberstab-Dialog gruppiert Vorschläge nach `portion_type` (statt flacher Liste), jede Gruppe mit „Alle auswählen"/Einzelauswahl.

## Capabilities

### New Capabilities
- `baking-ingredient-tag`: Neuer Ingredient-Tag `baking-ingredient` zur Erkennung von Backzutaten für KI-Portionsvorschläge.
- `ingredient-portion-ai-apply`: Neuer atomarer Apply-Endpoint für ausgewählte KI-Portionsvorschläge inkl. optionalem Replace-All (soft-delete + Pflicht-Neuanlage der „1g"-System-Portion).

### Modified Capabilities
- `ingredient-ai-suggest`: Das Portions-Antwortschema wird um `portion_type`, Pflichtfelder (Rezeptportion, Packung(en), System-Gramm) und bedingte Felder (Belag, Backmenge) erweitert; der Prompt-Text und die zugrunde liegende Einheiten-Wissensbasis werden konsolidiert; Portionsnamen dürfen keine Ziffern enthalten.

## Impact

- **Backend**: `backend/supply/services/ingredient_ai_suggest_service.py`, `backend/supply/schemas/ingredients.py` (neues `PortionSuggestionOut` inkl. `measuring_unit_name`, `portion_type`), `backend/supply/api/ingredients.py` (neuer `ai-apply`-Endpoint), `backend/supply/signals.py` (`_create_system_portions` ggf. wiederverwendet für Pflicht-Neuanlage), `backend/recipe/services/url_import_service.py`, `backend/recipe/services/ingredient_enrichment.py`, neues Modul `backend/supply/services/portion_knowledge.py`, neuer Tag-Seed für `baking-ingredient`.
- **Frontend** (`frontend-food/`): `src/schemas/supply.ts` (`PortionSuggestionSchema` inkl. `portion_type`), `src/api/supplies.ts` (neuer Hook für `ai-apply`), `src/pages/ingredients/IngredientDetailPage.tsx`, `src/components/shared/AiSuggestDialog.tsx` (Gruppierung nach `portion_type`, „Alte Portionen ersetzen"-Checkbox).
- **Migrationen**: Neue Migration für den `baking-ingredient` Tag-Seed (Data-Migration oder Management-Command, analog `seed_breakfast_catalog`). Kein Schema-Change am `Portion`-Modell nötig (Felder existieren bereits: `name`, `weight_g`, `quantity`, `measuring_unit`, `rank`, `is_system`, `deleted_at`).
- **Bestehende Daten**: Zutaten mit bereits gespeicherten, zahlenhaltigen Portionsnamen bleiben unverändert bis zum nächsten Zauberstab-Lauf mit aktivierter „Ersetzen"-Checkbox (kein automatischer Backfill in diesem Change).
