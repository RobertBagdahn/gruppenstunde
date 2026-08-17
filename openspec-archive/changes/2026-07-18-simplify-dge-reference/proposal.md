## Why

DGE-Referenzwerte existieren in zwei parallelen Systemen — einem statischen Python-Dict (`supply/data/dge_reference.py`) und einem Django-DB-Model (`supply.models.DgeReference`). Das DB-Model wurde nie mit Seed-Daten befüllt (Seed ist auskommentiert, "model was simplified, seed data is outdated"), die Tabelle ist leer. Die statischen Daten sind die faktische Single Source of Truth, die von allen aktiven Features genutzt wird (Norm-Person-Simulator, Frühstücks-Wizard, PDF-Export, Speisepläne). Die DB-Model-Infrastruktur (Router, Admin, Schemas, Hook) ist toter Code, der nur verwirrt und gewartet werden muss.

## What Changes

- **BREAKING**: `DgeReference` Django-Model, `GET /api/dge-references/` Endpoint und `DgeReferenceOut` Pydantic-Schema werden ersatzlos entfernt
- `recipe/api/nutrition.py` DGE-Coverage-Berechnung nutzt stattdessen `get_dge_reference()` aus `supply/data/dge_reference.py`
- Django-Admin-Registrierung, Router, URL-Registrierung, Export-Skripte werden bereinigt
- Frontend: Ungenutzte `DgeReferenceSchema` (Zod), `DgeReference` TypeScript-Type und `useDgeReference` Hook entfernen
- Migration zum Löschen der `supply_dgereference`-Tabelle

## Capabilities

### New Capabilities

_Keine._

### Modified Capabilities

- `extended-nutrition-rules`: Entfernen der DgeReference-Model- und `/api/dge-references/`-Endpoint-Anforderung. DGE-Werte werden ausschließlich aus statischen Daten (`supply/data/dge_reference.py`) bezogen.
- `seed-data`: Entfernen der DgeReference-Seed-Einträge (waren bereits auskommentiert).

## Impact

- **Backend**: `supply/models/reference.py`, `supply/models/__init__.py`, `supply/admin.py`, `supply/schemas/reference.py`, `supply/schemas/__init__.py`, `supply/api/dge_references.py`, `supply/api/__init__.py`, `inspi/urls.py`, `recipe/api/nutrition.py`, `bin/export_prod_data.py`, `bin/export_prod_data.sh`, `recipe/tests/test_extended_nutrition.py`
- **Frontend**: `frontend-food/src/api/normPerson.ts`, `frontend-food/src/schemas/normPerson.ts`
- **DB**: Migration zum Löschen der Tabelle `supply_dgereference`
