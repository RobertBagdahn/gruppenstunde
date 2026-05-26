## Why

Aktuell haben Nutzer zwei schlechte Wege, eine Packliste zu erstellen: Entweder eine leere Liste mit Titel (dann fängt man bei null an), oder eine von 12 Templates klonen (ohne Kontext-Empfehlung). Beide Wege sind statisch und erfordern viel manuelles Nacharbeiten. Es fehlen intelligente Hilfen: kein Autocomplete beim Tippen neuer Items, keine kontextbezogene Zusammenstellung, keine Führung durch den Prozess.

Das Ziel ist ein **dynamischer Wizard**, der basierend auf wenigen Kontext-Fragen (Aktivitätstyp, Dauer, Jahreszeit, Altersstufe) automatisch eine passende Packliste zusammenstellt. Dazu Autocomplete gegen den Item-Katalog beim manuellen Hinzufügen und die bestehenden KI-Vorschläge — alles zusammen ein moderner, schneller Flow.

## What Changes

- **NEU**: Wizard-Seite unter `/packing-lists/new` mit Kontext-Abfrage (Aktivitätstyp, Dauer, Jahreszeit, Altersstufe) und dynamischer Listenerstellung
- **NEU**: Dynamischer Builder-Algorithmus im Backend, der Items aus einem unified Katalog basierend auf Tags filtert und eine vorausgefüllte Packliste erstellt
- **NEU**: API-Endpoint `POST /api/packing-lists/generate/` der Kontext entgegennimmt und eine fertige PackingList mit Kategorien und Items zurückgibt
- **NEU**: Autocomplete-Dropdown beim Tippen in "Gegenstand hinzufügen" gegen den Item-Katalog (client-seitig, ~250 Items)
- **BREAKING**: Vereinigung der zwei getrennten Item-Kataloge (Seed-Katalog in `seed_packing_lists.py` und Suggestion-Katalog in `suggestion_service.py`) zu einem einzigen Unified Catalog
- **BREAKING**: Erweiterung des Tag-Systems um Kontext-Tags (Aktivitätstyp, Dauer, Jahreszeit, Altersstufe) und Prioritäts-Tags (`basis`, `standard`, `erweitert`)
- **BREAKING**: `PackingList` Model bekommt neue optionale Kontext-Felder (`activity_type`, `duration`, `season`, `age_group`) für Analytics und kontextbezogene KI-Vorschläge
- **BREAKING**: Die 12 statischen Seed-Templates werden zu Wizard-Presets migriert (vordefinierte Kontext-Kombinationen statt fester Item-Listen)
- Bestehende Suggestion-Features (Random-Chips, KI-Vorschläge, Katalog-Browser) bleiben erhalten und profitieren vom vereinheitlichten Katalog

## Capabilities

### New Capabilities
- `packing-list-wizard`: Wizard-Flow für kontextbasierte Packlisten-Erstellung — Kontext-Abfrage UI, dynamischer Builder-Algorithmus, Generate-API, Preset-System
- `packing-list-autocomplete`: Autocomplete-Dropdown beim Item-Hinzufügen gegen den Unified Catalog — client-seitige Filterung, Quantity/Description Übernahme aus Katalog
- `packing-list-unified-catalog`: Vereinheitlichter Item-Katalog mit erweitertem Tag-System — Single Source of Truth für Wizard, Suggestions und Autocomplete

### Modified Capabilities
- `packing-list`: PackingList Model bekommt Kontext-Felder, KI-Vorschläge nutzen gespeicherten Kontext
- `packing-list-seed-data`: Seed-Command wird auf Unified Catalog umgestellt, Templates werden zu Presets

## Impact

### Backend (`packinglist` App)
- `models.py`: PackingList bekommt 4 neue optionale CharField-Felder (activity_type, duration, season, age_group) → Migration nötig
- `schemas.py`: Neue Pydantic-Schemas für Generate-Request/Response, Autocomplete-Response. Bestehende PackingListOut um Kontext-Felder erweitern
- `api.py`: Neuer Endpoint `POST /generate/`, neuer Endpoint `GET /catalog/autocomplete/`
- `services/suggestion_service.py`: Komplett überarbeiten — Unified Catalog mit erweiterten Tags, neuer Builder-Algorithmus, Seed-Katalog integrieren
- `management/commands/seed_packing_lists.py`: Umschreiben auf Unified Catalog, Templates → Presets

### Frontend
- `schemas/packingList.ts`: Neue Zod-Schemas für Generate, Autocomplete, Kontext-Felder in PackingListSchema
- `api/packingLists.ts`: Neue Hooks `useGeneratePackingList()`, `useFullCatalog()` für Autocomplete
- Neue Seite: `pages/PackingListWizardPage.tsx` (Route `/packing-lists/new`)
- `pages/PackingListDetailPage.tsx`: Autocomplete-Dropdown in QuickAddItem-Komponente einbauen
- `pages/PackingListsPage.tsx`: "Neue Packliste" Button leitet zu `/packing-lists/new` statt inline-Formular
- `App.tsx`: Neue Route `/packing-lists/new`
