## Context

Migration `supply/0013_remove_material_quantity_type` ist in `django_migrations` als applied eingetragen, aber die Spalte `quantity_type` (NOT NULL) existiert noch in der Tabelle `supply_contentmaterialitem`. Vermutlich wurde die Migration mit `--fake` markiert oder die DB wurde aus einem Backup wiederhergestellt.

Dadurch schlägt `seed_all` fehl beim Erstellen von `ContentMaterialItem`-Records (kein `quantity_type`-Wert übergeben → IntegrityError). Der Seed bricht ab bevor Ingredients, MeasuringUnits, Portions und RecipeItems erstellt werden.

Betroffene Dateien:
- `backend/supply/migrations/0013_remove_material_quantity_type.py`
- `backend/core/management/commands/seed_all.py`

## Goals / Non-Goals

**Goals:**
- DB-Zustand mit Django-Migration-State synchronisieren
- `seed_all` läuft fehlerfrei durch
- Rezepte (z.B. Brotzeit) haben ihre Zutaten

**Non-Goals:**
- Ursache des Drifts forensisch aufklären
- Änderungen am Seed-Inhalt selbst
- Production-DB (nur lokale Entwicklungs-DB betroffen)

## Decisions

**1. Migration un-faken und erneut ausführen**

Ansatz: `migrate supply 0012 --fake` → `migrate supply 0013`

Alternativ: Manuelles `ALTER TABLE ... DROP COLUMN`. Aber die Django-Migration ist sauberer und reproduzierbar.

**2. Seed erneut ausführen statt manueller Datenkorrektur**

Nach dem Migration-Fix einfach `seed_all` neu laufen lassen. Der Seed ist idempotent (`get_or_create`, `exists()`-Checks).

## Risks / Trade-offs

- [Datenverlust in `quantity_type`-Spalte] → Irrelevant, Feld wurde bewusst entfernt und hat keinen Wert mehr
- [Seed überschreibt manuelle Daten] → Kein Risiko, Seed nutzt `get_or_create` und prüft `exists()`
