## Why

Der "Alternative Zutat hinzufügen"-Dialog im `InlineIngredientEditor` ist eine minimalistische Eigenimplementierung, die kein einziges Feature des existierenden `IngredientDetailSearchDialog` nutzt — keine Filter (Abteilung, Diät, Sortierung), keine Paginierung, keine Nährwertanzeige, kein Nutri-Score. Zusätzlich ruft sie fälschlicherweise `GET /api/supplies/` statt `GET /api/ingredients/` auf, was die Suche praktisch unbrauchbar macht ("Keine Zutaten gefunden").

Statt zwei parallele Such-Dialoge zu pflegen, wird der `IngredientDetailSearchDialog` generisch gemacht und für beide Anwendungsfälle (neue Zutat hinzufügen + Alternative hinzufügen) genutzt.

## What Changes

- **`IngredientDetailSearchDialog` wird generisch**: Extraktion in eine wiederverwendbare Komponente, die über einen konfigurierbaren `onSelect`-Callback gesteuert wird
- **"Alternative hinzufügen" nutzt den gleichen Dialog**: Statt des eigenen Inline-Modals wird der generische `IngredientDetailSearchDialog` mit angepasstem Callback (`handleSelectAlternative`) geöffnet
- **API-Endpoint wird korrigiert**: Der alternative Search ruft `GET /api/ingredients/` (nicht `/api/supplies/`)
- **Bestehende `IngredientDetailSearchDialog`-Nutzung bleibt identisch**: Der Callback für "neue Zutat hinzufügen" (`handleAddFromDialog`) wird als default `onSelect` übergeben
- Das alte Inline-Modal für Alternativen (ca. 70 Zeilen in `InlineIngredientEditor.tsx`) wird entfernt

## Capabilities

### New Capabilities

- Keine neuen Capabilities — die bestehenden werden erweitert

### Modified Capabilities

- `ingredient-detail-search`: Der Dialog muss als wiederverwendbare Komponente extrahiert werden, die über Props konfiguriert wird (unterschiedliche `onSelect`-Callbacks, optionale quantity-Selection)
- `recipe-exchanges`: Das Hinzufügen von Alternativen benötigt eine UX-Spezifikation — welcher Dialog wird genutzt, wie läuft die Auswahl, was passiert beim Speichern

## Impact

**Frontend (`frontend-food/`)**:
- `src/components/recipe/IngredientDetailSearchDialog.tsx` — wird generisch umgebaut (neue Props, extrahierte Komponente)
- `src/components/recipe/InlineIngredientEditor.tsx` — Alternative-Dialog (Zeilen ~1092-1161) wird entfernt, stattdessen `IngredientDetailSearchDialog` eingebunden; rohe `fetch`-Aufrufe für Alternativ-Suche und Portionen-Abfrage werden ersetzt
- `src/components/recipe/IngredientQuantityDialog.tsx` — bleibt unverändert, wird aber optional (nur bei "neue Zutat", nicht bei "Alternative")

**Backend**:
- Keine Backend-Änderungen — API-Endpoints (`/api/ingredients/`, `/api/recipes/{id}/exchanges/`) existieren bereits und werden korrekt genutzt

**Schemas**:
- Keine Änderungen an Pydantic- oder Zod-Schemas

**Dependencies**:
- Keine neuen Dependencies
