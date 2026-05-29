## Why

Der Cooklang-Import (`import_cooklang.py`) erzeugt Rezepte, bei denen alle Zutaten-Mengen als "0 g" angezeigt werden. Die Ursache: Das Unit-Mapping ist defekt — die DB enthält Abkürzungen (`g`, `ml`, `EL`) aber der Import sucht nach ausgeschriebenen Namen (`gramm`, `milliliter`). Dadurch wird `measuring_unit=None` gespeichert und das Frontend kann die Mengen nicht korrekt darstellen.

## What Changes

- **Fix Unit-Mapping**: Alias-Resolution im Import reparieren, damit DB-Units (`g`, `Kg`, `ml`, `l`, `EL`, `TL`) korrekt zugeordnet werden
- **Fix quantity_type**: Gesamtmengen aus Cooklang durch `servings` teilen und als `per_person` speichern (konsistent mit dem Rest des Systems)
- **Verbesserter Cooklang-Parser**: Regex-Fehler bei `@`-Syntax in Fließtext beheben (z.B. `@85-90g teilen...` wird fälschlich als Zutat geparst)
- **Re-Import-Fähigkeit**: Bestehende fehlerhaft importierte Rezepte können gelöscht und neu importiert werden

## Capabilities

### New Capabilities

- `cooklang-import-fix`: Korrektur des Cooklang-Import-Befehls mit korrektem Unit-Matching, quantity_type-Handling und Parser-Verbesserungen

### Modified Capabilities

- `seed-data`: Import-Befehl erzeugt nun korrekte RecipeItems mit gültiger `measuring_unit` und `quantity_type=per_person`

## Impact

- **Backend**: `recipe/management/commands/import_cooklang.py` — Hauptänderung
- **Django Apps**: `recipe`, `supply`
- **Keine Schema-Änderungen**: Pydantic/Zod bleiben unverändert (nur Datenqualität im Import)
- **Keine Migrations nötig**: Kein Model-Change, nur Logik-Fix im Management Command
- **Daten-Impact**: Bestehende fehlerhaft importierte Rezepte müssen gelöscht und neu importiert werden
