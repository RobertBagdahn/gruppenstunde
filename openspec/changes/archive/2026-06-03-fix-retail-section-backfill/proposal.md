## Why

In der Einkaufsliste landen Zutaten wie Müsli, Pflanzenöl, Schafskäse und Tomate unter "Sonstiges", obwohl passende Supermarktabteilungen existieren. Das macht die Einkaufsliste unübersichtlich und untergräbt das Vertrauen in die automatische Sortierung. Ursache ist nicht primär ein fehlendes Keyword-Mapping, sondern dass bei vielen Bestandszutaten das Feld `Ingredient.retail_section` schlicht nicht gesetzt ist — das Keyword-Mapping greift heute nur bei Neuanlage/Import, nicht rückwirkend.

## What Changes

- Neues idempotentes Management-Command `backfill_retail_sections`, das für alle Zutaten ohne gesetzte `retail_section` das vorhandene Keyword-Mapping (`get_retail_section`) nachträglich anwendet und zuordnet.
- Ergänzung fehlender bzw. zu unspezifischer Keywords in `retail_section_mapping.py` als Sicherheitsnetz (u.a. `SCHAFSKAESE`/`SCHAFSKÄSE`, `PFLANZENOEL`/`PFLANZENÖL`, Singular-Varianten wo nötig).
- Optionaler `--dry-run`-Modus, der zeigt, welche Zutat welcher Abteilung zugeordnet würde, ohne zu speichern.
- Sicherstellen, dass beim Anlegen/Import einer Zutat die `retail_section` automatisch gesetzt wird, falch noch nicht geschehen (Verifikation des bestehenden Pfads).

## Capabilities

### New Capabilities
- `retail-section-backfill`: Nachträgliche, idempotente Zuordnung von Supermarktabteilungen zu bestehenden Zutaten über das vorhandene Keyword-Mapping, plus Pflege der Keyword-Stammdaten.

### Modified Capabilities
<!-- Keine bestehende Capability ändert ihr spec-level Verhalten; die Einkaufslisten-Gruppierung selbst bleibt unverändert, nur die zugrundeliegenden Daten werden korrigiert. -->

## Impact

- **Backend / supply App**:
  - Neu: `supply/management/commands/backfill_retail_sections.py`
  - Geändert: `supply/services/retail_section_mapping.py` (Keyword-Ergänzungen)
  - Verifikation: Pfad, der `retail_section` bei Zutat-Anlage/Import setzt (`IngredientCreate`-API, `import_legacy_food`, `import_inspi_data`)
- **Daten**: Bestandszutaten in der DB werden aktualisiert (kein Schema-Change, keine Migration nötig — nur Datenkorrektur per Command).
- **Frontend**: Keine Änderung nötig; die Einkaufslisten-Gruppierung nutzt automatisch die korrigierten Daten. Das frontend-seitige `'Sonstiges'`-Fallback bleibt als Sicherheitsnetz erhalten.
- **Tests**: Command-Test (idempotent, dry-run, korrektes Mapping für die genannten Beispielzutaten), Keyword-Mapping-Test für die neuen Einträge.
- **Schemas**: Keine Pydantic-/Zod-Änderungen.
