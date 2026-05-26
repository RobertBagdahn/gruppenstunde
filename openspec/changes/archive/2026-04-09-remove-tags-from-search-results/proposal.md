## Why

Tags erscheinen aktuell als eigenständige Ergebnis-Karten in den Suchergebnissen (z.B. "Frühstück", "Ernährung", "Gesund"). Das ist verwirrend, weil Tags keine Inhalte sind, sondern Kategorisierungselemente. Sie sollen weiterhin in der Autocomplete und als Tab-Filter nutzbar bleiben, aber nicht als Karten in den Suchergebnissen auftauchen.

## What Changes

- Tags werden aus den Suchergebnis-Karten entfernt (keine Tag-Cards mehr in der Ergebnisliste)
- Tags werden aus `CONTENT_TYPES` im Backend-Suchservice entfernt, damit sie nicht mehr als Suchergebnisse zurückgegeben werden
- Tags bleiben in der Autocomplete-Funktion erhalten
- Der "Tags"-Tab in der Tab-Leiste wird entfernt
- Die `type_counts` im API-Response enthalten kein `tag`-Count mehr
- Frontend `RESULT_TYPE_OPTIONS` und `RESULT_TYPE_CONFIG` werden bereinigt

## Capabilities

### New Capabilities

_Keine neuen Capabilities._

### Modified Capabilities

- `search`: Tags werden aus den Suchergebnissen entfernt, bleiben aber in der Autocomplete

## Impact

- **Backend**: `content/services/search_service.py` — `CONTENT_TYPES` Set anpassen
- **Backend**: `content/schemas/search.py` — `result_type` Enum ggf. bereinigen (nur für Suchergebnisse, nicht für Autocomplete)
- **Frontend**: `src/schemas/search.ts` — `RESULT_TYPE_OPTIONS` und `RESULT_TYPE_CONFIG` bereinigen
- **Frontend**: `src/pages/SearchPage.tsx` — Tag-spezifische Rendering-Logik entfernen
- Keine Schema-Änderungen an Pydantic/Zod für die Hauptstrukturen nötig (nur Enum-Werte)
- Keine Migrations nötig (reine Logik-Änderung)
