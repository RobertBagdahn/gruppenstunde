## Why

Die Warengruppen (RetailSections) sind inkonsistent gepflegt und unvollständig. Eine Prüfung der echten Datenbank zeigt: Es existieren real **12 Warengruppen, alle mit `rank = 0`** (keine sinnvolle Einkaufs-Reihenfolge), deren Namen weitgehend dem Auto-Mapping (`backend/supply/services/retail_section_mapping.py`) entsprechen — aber **nicht** den 12 Namen aus dem Seed (`backend/core/management/commands/seed_all.py:381-394`). Drei Quellen divergieren (Seed, DB, Mapping).

Konkrete Folgen im Ist-Zustand:
- **6 Mapping-Zielnamen fehlen in der DB** (`Fleisch & Wurst`, `Hülsenfrüchte & Nüsse`, `Süßwaren & Snacks`, `Kaffee und Tee`, `Getränke ohne Alkohol`, `Gewürze`) → Zutaten mit diesen Keywords bekommen keine Warengruppe (real ~10 % der Zutaten ohne Zuordnung).
- **2 DB-Gruppen werden vom Mapping nie getroffen** (`Getränke`, `Kühlung`), weil das Mapping stattdessen auf `Getränke ohne Alkohol` bzw. `Milchprodukte & Käse` zeigt (Synonym-Drift).
- **Alkoholische Getränke** (Bier, Sekt, Spirituose, Likör) werden fälschlich auf `Getränke ohne Alkohol` gemappt.
- Alle Gruppen haben `rank = 0` → Einkaufsliste gruppiert ohne Laden-Rundgang-Reihenfolge.

## What Changes

- **Fehlende Warengruppen ergänzen** — Die 6 in der DB fehlenden Mapping-Zielnamen werden angelegt, sodass keine Zutat mehr ohne Warengruppe bleibt.
- **Getränke-Gruppen trennen** — Die bestehende generische Gruppe `Getränke` wird zu `Alkoholfreie Getränke` umbenannt (Bestandszutaten bleiben erhalten); zusätzlich neue Gruppe `Alkoholische Getränke`.
- **Alkohol korrekt zuordnen** — Alkoholische Keywords (Bier, Sekt, Spirituose, Likör) werden `Alkoholische Getränke` zugeordnet statt der bisherigen Fehlzuordnung; alkoholfreie Keywords `Alkoholfreie Getränke`.
- **Auffanggruppe + Re-Mapping** — Eine Gruppe `Sonstiges`; aktuell unzugeordnete Zutaten (~24) werden automatisch neu gemappt, nicht zuordenbare erhalten `Sonstiges`.
- **Sinnvolle `rank`-Reihenfolge** — Alle Warengruppen erhalten eine an einem Supermarkt-Rundgang orientierte Sortierung (statt `rank = 0`).
- **Single Source of Truth** — Eine gemeinsame `RETAIL_SECTIONS`-Konstante (Name, rank), die Seed, Auto-Mapping und Legacy-Import verwenden, damit die drei Quellen nicht erneut auseinanderlaufen. Basis sind die bestehenden 12 DB-Namen + die 6 Ergänzungen.

## Capabilities

### New Capabilities
- `retail-section-catalog`: Einheitlicher Warengruppen-Katalog als Single Source of Truth (auf Basis der real existierenden DB-Namen), mit vollständiger Mapping-Abdeckung, korrekter Alkohol-Zuordnung und Laden-Rundgang-`rank`.

### Modified Capabilities
- (keine)

## Impact

- **Backend-Apps**: `supply` (neue `data/retail_sections.py`, `services/retail_section_mapping.py`), `core` (`management/commands/seed_all.py`), Legacy-Import (`import_legacy_food`).
- **Frontend-Pages**: `frontend-food` — `pages/admin/RetailSectionTab.tsx` (keine Strukturänderung), Einkaufslisten-Gruppierung (`ShoppingView.tsx`) profitiert von `rank`.
- **Migration**: Datenmigration/Management-Command, der die 6 fehlenden Gruppen anlegt, `rank` für alle setzt und Synonyme angleicht (idempotent). Bestehende 12 DB-Gruppen bleiben erhalten.
- **Tests**: Konsistenz (Mapping-Zielnamen ⊆ Katalog), Alkohol-Zuordnung, keine Zutat ohne Warengruppe nach Re-Mapping.
