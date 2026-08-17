## Context

Eine Prod-DB-Analyse (über cloud-sql-proxy, read-only) ergab: 14.441 von 14.645 Portionen (98,6 %) haben `weight_g = NULL`, 7.022 davon einen leeren Namen. Die kaputten Zeilen stammen aus zwei Legacy-Import-Bulk-Läufen (28.05. und 29.05.2026), alle mit `created_by = NULL`. Eine Zutat („Pralinen") hat 146 Portionen, die auf nur 2 distinkte Definitionen zurückgehen — Beleg für Mehrfach-Import ohne Dedup.

Drei voneinander unabhängige Erzeugungspfade für `Portion` existieren heute:
1. **API** (`backend/supply/api/ingredients.py:218,244`) — berechnet `weight_g` mit fehlerhafter Heuristik `calculated > 1`.
2. **URL-Import** (`backend/recipe/services/url_import_service.py:604,607,759`) — legt Einheiten per `get_or_create(name=...)` neu an und erstellt Portionen ohne Dedup.
3. **Legacy-Import** (`backend/core/management/commands/import_legacy_food.py:513,595`) — `bulk_create` umgeht jede Logik; `weight_g` 1:1 aus Legacy-JSON (oft fehlend → NULL).

Constraints: Keine Rückwärtskompatibilität nötig (aktive Entwicklung). Python-Befehle über `uv run`. Pydantic-/Zod-Schemas synchron. Migration läuft gegen Prod-DB (Cloud SQL PostgreSQL 15).

## Goals / Non-Goals

**Goals:**
- Eine einzige, erzwungene Stelle für `weight_g`-Berechnung, die alle Pfade nutzen.
- Korrektur der `> 1`-Heuristik auf `> 0`.
- `Portion.name` als Pflichtfeld (kein `blank=True`, kein `default="g"`).
- Einheiten-Kanonisierung statt Dubletten-Erzeugung im URL-Import.
- Portion-Deduplizierung pro Zutat in URL- und Legacy-Import.
- Cleanup-Daten-Migration: `weight_g` nachberechnen, Namen ableiten, Duplikate dedupen, Dubletten-Einheiten konsolidieren.
- Frontend markiert unvollständige Portionen.

**Non-Goals:**
- Keine Änderung am Naehrwert-/Preis-Berechnungssystem.
- Keine Änderung am Recipe-Cache-Mechanismus (außer notwendigen RecipeItem-Umhängungen bei Dedup).
- Keine UI-Neugestaltung der Portionsliste über die Markierung hinaus.
- Keine Truncate/Neu-Import der Daten — nur In-Place-Reparatur.

## Decisions

### Decision 1: Zentrale Berechnung als Model-Methode `Portion.compute_weight_g()`
`backend/supply/models/ingredient.py` erhält eine Methode `compute_weight_g(explicit: float | None = None) -> float | None`:
```
if explicit is not None and explicit > 0: return explicit
if self.measuring_unit:
    calc = (self.quantity or 0) * self.measuring_unit.quantity
    return calc if calc > 0 else None
return None
```
`Portion.save()` ruft die Berechnung auf, wenn `weight_g` nicht explizit gesetzt wurde. API, URL-Import und Legacy-Import rufen dieselbe Methode.

**Alternative**: Logik in einem Service `portion_service.py`. Verworfen — Model-Methode ist näher an den Daten und greift auch bei direkten `.save()`-Aufrufen. Achtung: `bulk_create` umgeht `save()`; der Legacy-Import muss `compute_weight_g()` daher explizit vor dem `bulk_create` aufrufen.

### Decision 2: Heuristik `> 1` → `> 0`
Der einzige sachliche Fix für die Hauptursache. 1 g/ml/Stück sind gültige Gewichte. Alternative (Heuristik ganz entfernen, auch 0 erlauben) verworfen — 0 g ist sinnlos und sollte NULL bleiben.

### Decision 3: `Portion.name` Pflicht — Schema-Migration
`name = models.CharField(max_length=255)` (kein `blank`, kein `default`). Pydantic `PortionCreateIn.name: str` (required), `PortionUpdateIn.name: str | None` (optional bei Patch). Zod `name: z.string().min(1)`.
- API: `backend/supply/api/ingredients.py` create_portion validiert nicht-leeren Namen → sonst HttpError 422.
- Migration muss VOR der Schema-Änderung leere Namen füllen (Daten-Migration zuerst, dann Schema-Constraint), sonst schlägt sie an Bestandsdaten fehl.

### Decision 4: Einheiten-Kanonisierung via Name+Alias-Lookup
Neue Helper `resolve_canonical_unit(name: str) -> MeasuringUnit | None` in `backend/supply/services/`. Mappt z. B. „g"→„Gramm", „EL"→„Esslöffel" über Name (case-insensitiv) und eine definierte Synonym-Tabelle. URL-Import (`url_import_service.py:604`) ersetzt `get_or_create(name=...)` durch diesen Lookup; ohne Treffer → Fallback „Gramm" oder Zeile als ungültig markieren.

**Alternative**: `MeasuringUnit`-Alias-Model. Verworfen für diesen Change (Scope) — statische Synonym-Map reicht; die Dubletten-Einheiten (id 87–99) werden in der Migration auf die kanonischen (61–75) konsolidiert.

### Decision 5: Dedup via `get_or_create` auf `(ingredient, name, measuring_unit, quantity)`
URL-Import `_create_new_ingredients` und `_resolve_portion` sowie Legacy-Import nutzen `get_or_create` mit diesem Key. Legacy-Import: vor `bulk_create` In-Memory-Dedup pro Batch + Abgleich gegen bestehende Portionen der Zutat.

### Decision 6: Cleanup-Daten-Migration (reine Python-Migration)
Reihenfolge in einer `RunPython`-Migration in `supply/migrations/`:
1. Dubletten-Einheiten (87–99) auf kanonische (61–75) umhängen (`Portion.measuring_unit` + ggf. `RecipeItem.measuring_unit`), dann leere Dubletten-Einheiten löschen.
2. Portionen pro Zutat dedupen (behalte niedrigste id pro `(name, measuring_unit, quantity)`); `RecipeItem.portion`-FKs umhängen; übrige soft-deleten (`deleted_at`).
3. Leere/`"g"`-Namen aus `measuring_unit.name` ableiten.
4. `weight_g = NULL` über `quantity × measuring_unit.quantity` nachberechnen (`> 0`).
5. Danach separate Schema-Migration: `name` non-blank, kein Default.

Soft-Delete (`deleted_at`) statt Hard-Delete für Reversibilität.

## Risks / Trade-offs

- **Migration trifft Prod mit 14.6k Zeilen + RecipeItem-Umhängungen** → Mitigation: In Batches, idempotent schreiben, vorher `--dry-run`-äquivalenten Read-Only-Check; Backup/PITR von Cloud SQL vor Lauf.
- **RecipeItem-Umhängung könnte cached Naehrwerte verändern** → Mitigation: Nach Dedup `recalculate_recipe_cache` für betroffene Rezepte triggern; in Tests Konsistenz prüfen.
- **Synonym-Map unvollständig** → Mitigation: Unbekannte Einheiten werden geloggt und auf Fallback gemappt, nicht neu angelegt; Liste aus Prod-Ist-Einheiten (61–99) ableiten.
- **`name`-Pflicht bricht bestehende Import-JSONs mit leeren Namen** → akzeptiert (keine Rückwärtskompatibilität); Import leitet Namen aus Einheit ab.
- **`bulk_create` umgeht `save()`** → Mitigation: Legacy-Import ruft `compute_weight_g()` explizit; Test deckt Mehrfachlauf-Dedup ab.

## Migration Plan

1. Deploy Code (Model-Methode, API, URL-/Legacy-Import, Schemas, Frontend).
2. Backup/Snapshot der Cloud-SQL-Prod-DB.
3. Schema-Migration Teil A (falls trennbar) NICHT vor Daten-Cleanup — Reihenfolge: Daten-Migration zuerst (füllt Namen/Gewichte, dedupt), dann Schema-Constraint-Migration.
4. `uv run python manage.py migrate supply` gegen Prod über Proxy.
5. Verifikation: Read-Only-Query — `weight_g IS NULL`-Count nahe 0, keine leeren Namen, Portion-Counts pro Zutat plausibel.
6. **Rollback**: Soft-Delete erlaubt Restore; Schema-Migration reversibel; Cloud SQL PITR als letzte Instanz.

## Open Questions

- Sollen Dubletten-Einheiten (id 87–99) nach Konsolidierung hart gelöscht oder behalten werden? (Vorschlag: löschen, da reine Import-Artefakte.)
- Fallback-Einheit für unbekannte URL-Import-Einheiten: „Gramm" oder Zeile ablehnen? (Vorschlag: „Gramm" mit Log-Warnung.)
