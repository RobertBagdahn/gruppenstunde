## Why

Im gesamten Backend und in der OpenSpec-Dokumentation werden deutsche Umlaute (ä, ö, ü) durchgehend als ASCII-Ersetzungen geschrieben (ae, oe, ue). Das Frontend verwendet bereits korrekte Umlaute. Diese Inkonsistenz führt zu unleserlichen Fehlermeldungen für Benutzer und erschwert die Wartbarkeit der Dokumentation. Da UTF-8 überall unterstützt wird, gibt es keinen technischen Grund für die ASCII-Ersetzungen.

## What Changes

- **Backend Python-Dateien**: Alle deutschen UI-Strings (Fehlermeldungen, Admin-Labels, AI-Prompts, verbose_name, Choice-Labels) von ASCII-Ersetzungen auf korrekte Umlaute umstellen (~55 Vorkommen in ~25 Dateien)
- **Backend Tests**: Test-Assertions und Testdaten an die neuen Umlaut-Strings anpassen (~15 Vorkommen)
- **OpenSpec-Dokumentation**: Alle Spec-Dateien, Components, und archivierte Changes von ASCII-Ersetzungen auf Umlaute umstellen (~200+ Vorkommen in ~20 Dateien)
- **Django Migrations**: Neue Migration für geänderte `verbose_name`/`verbose_name_plural` und Choice-Werte
- **AGENTS.md Dateien**: Projekt-Kontextbeschreibungen auf Umlaute umstellen

## Capabilities

### New Capabilities

_Keine neuen Capabilities — dies ist eine reine Textkorrektur._

### Modified Capabilities

_Keine Spec-Level-Änderungen — die Anforderungen bleiben identisch, nur die Schreibweise der deutschen Texte ändert sich von ASCII-Ersetzungen zu korrekten Umlauten._

## Impact

- **Betroffene Django-Apps**: `content`, `event`, `game`, `blog`, `recipe`, `packinglist`, `supply`
- **Betroffene Backend-Dateien**: `admin.py`, `api.py`, `services/*.py`, `schemas/*.py`, `choices.py`, `models.py`, Tests
- **Pydantic-Schemas**: `content/schemas/ai.py` (Default-Wert `"Stueck"` → `"Stück"`)
- **Zod-Schemas**: Keine Änderungen nötig (Frontend verwendet bereits Umlaute)
- **Migrations**: Eine neue Migration für `event/models/day_slots.py` (`verbose_name_plural`) und `game/choices.py` (Choice-Werte)
- **Keine API-Breaking-Changes**: Die Änderungen betreffen nur Anzeigetexte, keine API-Contracts oder Datenbank-Feldnamen
- **Keine Frontend-Änderungen**: Das Frontend verwendet bereits korrekte Umlaute
