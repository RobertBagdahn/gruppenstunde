## Context

Der Frühstücksassistent bezieht Basis-Zutaten aus dem Catalog-Endpoint (`GET /api/supply/breakfast-catalog/`), der per `breakfast-base` Tag filtert (`Ingredient.objects.filter(tags=base_tag, is_standalone_food=True)`).

Der `seed_breakfast_catalog`-Befehl erzeugt 6 Basis-Zutaten (Bauernbrot, Toastbrot, Stuten, Körnerbrot, Brötchen halb/ganz) und taggt sie. Zusätzlich gibt es generische Brot-Zutaten (Brot PK 138, Brötchen PK 139, Vollkornbrot etc.) aus dem Legacy-Import, die keine Tags haben.

Das Export-Skript (`export_prod_data.py`) überträgt das `tags`-M2M-Feld nicht für `Ingredient` — Zeile 52 hat nur `["nutritional_tags"]`. Bei `Recipe` (Zeile 56) ist `tags` korrekt enthalten.

## Goals / Non-Goals

**Goals:**
- Export-Skript fixen: `tags` ins M2M-Feld-Array von `Ingredient` aufnehmen
- Seed-Befehl erweitern: existierende generische Brot-Zutaten automatisch mit `breakfast-base` taggen
- Prod einmalig seeden, damit der Katalog live funktioniert
- Lokale Dev-Umgebungen nach `import_prod_data` haben ebenfalls korrekte Tags (Export + Seed)

**Non-Goals:**
- Keine Änderungen am Frühstücksassistenten selbst (UI, API, Calc)
- Keine neuen Modelle oder Datenbank-Migrationen
- Kein Frontend-Code

## Decisions

### 1. Export: `tags` zu Ingredient-Feldliste hinzufügen

**Typ:** Minimale Änderung
**Datei:** `backend/bin/export_prod_data.py` Zeile 52
**Änderung:** `["nutritional_tags"]` → `["nutritional_tags", "tags"]`
**Begründung:** Gleiches Pattern wie `Recipe` (Zeile 56). Die `export_prod_data.py` nutzt psycopg direkt und liest M2M-Tabellen über separate Queries. Einfach die Feld-Liste erweitern — der Export-Mechanismus iteriert automatisch über die `through`-Tabelle.

### 2. Seed erweitern: Bestehende Brot-Zutaten nachtaggen

**Ansatz A — In `seed_breakfast_catalog` integrieren:**
- Nach dem `get_or_create` der 6 spezifischen Basis-Zutaten per Namensmuster nach generischen Brot-Zutaten suchen und taggen
- Matching: `Ingredient.objects.filter(name__in=["Brot", "Brötchen", ...], is_standalone_food=True)`
- Risiko: Falsch-Positive (z.B. "Toasty" enthält Toast, ist aber kein Brot)
- **Entscheidung: Präzises Whitelist-Set** von Slugs statt Namens-Suche

**Ansatz B — Separate Migration:**
- Eigene Datenmigration analog zu `0042_migrate_breakfast_tags.py`
- Nachteil: erhöhter Wartungsaufwand für einmalige Aktion
- **Verworfen** zu Gunsten von Ansatz A (Seed ist idempotent, kann beliebig oft laufen)

**Gewählter Ansatz:** Erweiterung des Seed-Befehls mit einem `--tag-existing` Flag und einer Whitelist von Slugs:
```python
EXISTING_BREAD_SLUGS = [
    "brot", "brotchen", "brot-vollkorn", "toastbrot", "vollkorn-toast",
    "koernerbrot", "roggenbrot", "weissbrot", "ciabatta",
]
```
Der Seed durchläuft diese Slugs und taggt sie mit `breakfast-base`, falls vorhanden.

### 3. Prod-Seed via Cloud Run Shell

Nach Deployment des gefixten Seeds:
```bash
# Auf prod (Cloud Run Shell):
uv run python manage.py seed_breakfast_catalog --tag-existing
```
Kein Deployment-Zyklus nötig — Cloud Run Shell reicht.

## Risks / Trade-offs

| Risiko | Mitigation |
|--------|------------|
| Falsch-Positive beim Nachtaggen generischer Brot-Zutaten | Whitelist fester Slugs statt Namens-Suche reduziert Risiko auf nahe Null |
| Prod-Seed erzeugt doppelte Zutaten | Seed nutzt `get_or_create` → idempotent |
| Export-Neugenerierung überschreibt lokale Fixtures | Expliziter `--only food` Lauf nach dem Fix; diff vor Commit prüfen |
| Tags auf Prod wurden von Migration 0042 doch korrekt gesetzt | Export wird dann Tags enthalten → lokaler Import wird sie korrekt laden. Kein Schaden durch doppelten Seed (idempotent). |
