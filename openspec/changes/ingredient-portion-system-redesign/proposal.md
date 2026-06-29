## Why

Das Portions-System von Zutaten hat über mehrere Iterationen technische Schulden angesammelt: `priority` und `rank` sind redundante Sortierfelder, `is_default` ist inkonsistent mit `rank`, die KI legt Stück/Packung ohne `weight_g` an, und Portions-Namen können sich doppeln. Das führt zu falschen Vorauswahlen in Rezepten, fehlenden Gewichten in der Einkaufsliste und einer verwirrenden Admin-UI. Dieser Change vereinheitlicht das System auf ein einziges, konsistentes Modell.

## What Changes

- **BREAKING** `priority`-Feld auf `Portion` wird entfernt; `rank` (aufsteigend, 1 = Standard) ist das einzige Sortierfeld
- **BREAKING** `is_default`-Feld auf `Portion` wird entfernt; die Portion mit `rank=1` gilt automatisch als Normalportion/Default
- Portions-Name muss eindeutig pro Zutat sein (case-insensitive Unique-Constraint, Backend-Validierung 422)
- KI-Prompts (`ai-create`, `ai-suggest-all`) liefern immer eine Normalportion mit `rank=1` sowie geschätzte `weight_g` für Stück- und Packung-System-Portionen
- System-Portionen (`g`, `Packung`, `Stück`) werden weiterhin automatisch angelegt; `g` ist immer ans Ende fixiert, `Packung` und `Stück` sind sortierbar
- Neue Portionen landen immer am Ende (höchster `rank + 1`); User sortiert per Drag & Drop
- UI markiert die Normalportion (`rank=1`) mit „Standard"-Badge und hervorgehobener Zeile
- Rezept-Zutaten-Hinzufügen wählt immer `rank=1`-Portion vor
- Einkaufslisten-Berechnung nutzt die kleinste Packung mit gültigem `weight_g`
- Warnung im UI wenn `Packung.weight_g` fehlt (kein harter Blocker)
- Stück ohne `weight_g` bei nicht-stückbaren Zutaten (Nudeln, Salz) ist akzeptiert
- **Datenmigration**: bestehende `is_default=True`-Portion → `rank=1`; Rest nach `priority desc` neu nummeriert

## Capabilities

### New Capabilities

- `ingredient-portion-redesign`: Vereinheitlichtes Portions-Datenmodell mit `rank`-only-Sortierung, Unique-Name-Constraint, Drag & Drop-UI und „Standard"-Badge für die Normalportion

### Modified Capabilities

- `ingredient-database`: `priority`- und `is_default`-Felder entfernt; `rank`-Semantik ändert sich zu „rank=1 = Default"
- `portion-ranking`: Sortierlogik auf `rank`-only umgestellt; ▲/▼-Buttons durch Drag & Drop ersetzt; System-Portionen-Positionierung neu geregelt
- `smart-ingredient-default`: `selectSmartDefaultPortion()` vereinfacht auf `portions[0]` (rank=1) statt priority/is_default-Logik
- `ingredient-ai-suggest`: Prompts erweitert um Normalportion (rank=1) + `weight_g` für Stück und Packung als Pflicht-Output
- `shopping-list-package-display`: Paket-Auswahl für Einkaufsliste auf kleinste Packung mit `weight_g` umgestellt

## Impact

- **Backend**: `supply/models/ingredient.py` (Portion-Modell), `supply/signals.py` (System-Portionen), `supply/api/ingredients.py` (Unique-Validierung, move-Endpoint), `supply/services/ingredient_ai_suggest_service.py` (Prompts), `supply/utils.py` (build_package_display)
- **Pydantic-Schemas**: `supply/schemas/ingredients.py` — `PortionOut` verliert `priority` und `is_default`; `PortionSuggestionSchema` verliert `priority`
- **Zod-Schemas**: `frontend-food/src/schemas/supply.ts` — `PortionSchema` verliert `priority` und `is_default`
- **Frontend**: `frontend-food/src/lib/portionDefaults.ts`, `frontend-food/src/lib/portionDisplay.ts`, `frontend-food/src/pages/ingredients/IngredientDetailPage.tsx`
- **Django-Migration**: Felder `priority` und `is_default` entfernen, Datenmigration der bestehenden ranks
- **Betroffene Apps**: `supply`, `recipe`, `shopping` (Einkaufsliste)
