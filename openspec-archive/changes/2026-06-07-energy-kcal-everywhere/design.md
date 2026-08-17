## Context

Energie wird aktuell in der Datenbank in kJ gespeichert. Der archivierte Change `2026-06-03-energy-kj-to-kcal` hat kcal-Anzeige und kcal-basierte Regel-Schwellwerte eingeführt, aber die DB-Speicherung bewusst in kJ belassen. Das Ergebnis ist eine durchgängige Dual-Repräsentation mit Konvertierungen an jeder Grenze.

Dieser Change entfernt die kJ-Speicherung vollständig. kcal wird die einzige Energie-Einheit — in der DB, in der API, im Frontend. Alle Konvertierungsfunktionen entfallen.

## Goals / Non-Goals

**Goals:**
- Alle 5 Datenbank-Felder von `*_kj` auf `*_kcal` umbenennen und Werte umrechnen (÷ 4.184, gerundet auf 0 Dezimalstellen).
- `kj_to_kcal()` / `kcal_to_kj()` (Backend) und `kjToKcal()` (Frontend) komplett entfernen.
- Alle Pydantic- und Zod-Schema-Felder umbenennen, doppelte `energy_kcal`-Computed-Felder entfernen.
- `HintParameterChoices.ENERGY_KJ` → `ENERGY_KCAL`, `rule.parameter = "energy_kj"` → `"energy_kcal"`.
- `health_traits_service.is_high_protein()`: Konstante von 17 kJ/g auf 4 kcal/g.
- Eingabeformular `IngredientCreatePage`: Label von `Energie (kJ)` auf `Energie (kcal)`.

**Non-Goals:**
- Keine optionale kJ-Anzeige (kommt später als separater Change).
- Keine Änderung an anderen Nährwerten (protein_g, fat_g etc. — nur Energie ist betroffen).
- Keine Änderung an der Norm-Person-Berechnungslogik (PAL, Altersgruppen etc.).
- Keine Änderung an bestehenden alten Migrationen (historische Dateien bleiben unverändert).

## Decisions

### 1. Migration: Pure SQL, keine RunPython

**Entscheidung:** Alle Spalten-Änderungen per rohem SQL in `SeparateDatabaseAndState`.

```sql
-- Pro Spalte (5×):
ALTER TABLE <table> ADD COLUMN <new> double precision;
UPDATE <table> SET <new> = ROUND(<old> / 4.184);
ALTER TABLE <table> DROP COLUMN <old>;
```

Zusätzlich:
```sql
UPDATE recipe_rule SET parameter = 'energy_kcal' WHERE parameter = 'energy_kj';
```

**Begründung:** SQL ist schneller und deterministischer als Python-Loops. `SeparateDatabaseAndState` hält Django's ORM-State synchron. 0 Dezimalstellen → ganze Zahlen, Rundung mit PostgreSQL `ROUND()`.

**Alternative (verworfen):** `RunPython` mit Model-Instanzen. Langsamer bei großen Datensätzen, potenzielle Signal-Probleme.

### 2. Rule-Parameter-Key: Umbenennung

**Entscheidung:** `energy_kj` → `energy_kcal` als String-Wert in `rule.parameter`.

Schwellwerte (min_green, max_green etc.) bleiben **unverändert** — sie sind bereits in kcal (Migration 0027). Nur der Key-String ändert sich. `HintParameterChoices.ENERGY_KJ` wird zu `ENERGY_KCAL` mit Label `"Energie (kcal)"`.

**Begründung:** Konsistenz mit dem Rest des Systems. Der Key `energy_kj` war ein Überbleibsel der kJ-Ära.

**Alternative (verworfen):** Key `energy_kj` beibehalten. Würde Inkonsistenz erzeugen (alle anderen Felder heißen `*_kcal`, nur der Rule-Key referenziert `energy_kj`).

### 3. health_traits_service: Formel-Konstante 17 → 4

**Entscheidung:** `protein_energy_kj = protein_per_100g * 17.0` → `protein_energy_kcal = protein_per_100g * 4.0`.

```python
# Vorher:
pct = (protein_per_100g * 17.0) / energy_kj_per_100g * 100.0

# Nachher:
pct = (protein_per_100g * 4.0) / energy_kcal_per_100g * 100.0
```

**Begründung:** 4 kcal = 16.736 kJ ≈ 17 kJ. Die 20%-Schwelle bleibt identisch, das Ergebnis ist mathematisch äquivalent. Die 4.184-Differenz (17.0 vs. 16.736) ist vernachlässigbar (<2% Abweichung im Ergebnis).

### 4. Computed-Felder entfernen

**Entscheidung:** `energy_kcal`-Felder in `ItemNutrition`, `RecipeNutritionBreakdown`, `MealOut` etc. werden entfernt. Das primäre Feld `*_kcal` liefert den Wert direkt.

**Vorher:**
```python
class ItemNutrition(BaseModel):
    energy_kj: float
    energy_kcal: float  # computed via kj_to_kcal()
```

**Nachher:**
```python
class ItemNutrition(BaseModel):
    energy_kcal: float  # direkt aus DB/Computation
```

**Begründung:** Keine Dual-Repräsentation mehr nötig. Ein Feld pro Wert.

### 5. external_energy_kcal: API-Surface = DB-Feld

**Entscheidung:** `Meal.external_energy_kj` (DB) und `MealOut.external_energy_kcal` (API, via Resolver) werden vereinheitlicht zu `Meal.external_energy_kcal` auf beiden Ebenen. `MealUpdateIn.external_energy_kcal` bleibt gleich (war schon kcal-Eingabe).

**Begründung:** Der vorherige kJ-DB/kcal-API-Unterschied war dem kJ-Speicherungs-Zwang geschuldet. Jetzt identisch.

### 6. Schema-Sync: Pydantic + Zod gleichzeitig

**Entscheidung:** Alle Schema-Änderungen werden im Backend (Pydantic) und in beiden Frontends (Zod: `frontend/` und `frontend-food/`) parallel umgesetzt.

**Begründung:** 1:1-Schema-Sync ist Kernprinzip des Projekts. Keine zeitliche Verschiebung, sonst API-Desync.

### 7. Keine optionalen kJ-Anzeige-Felder

**Entscheidung:** Keine `*_kj`-Felder als optional/legacy behalten.

**Begründung:** kJ-Anzeige kommt als separater Change mit eigenem Design (z.B. Tooltip "entspricht X kJ"). Keine Altlasten.

## Risks / Trade-offs

- **[Genauigkeitsverlust]** Rundung auf 0 Dezimalstellen → kleine Werte (<10 kcal) könnten signifikant abweichen. → Akzeptiert: Rezepte haben typischerweise 200–800 kcal/Portion, 1 kcal Abweichung ist irrelevant. Für DGE-Referenzwerte (1000–3000 kcal) ebenso.

- **[Breaking API]** Alle Clients (Frontend, Frontend-Food) müssen gleichzeitig deployed werden. → Beide Frontends sind im selben Monorepo, Deployment erfolgt atomar.

- **[Große Migration]** 5 Spalten über 4 Tabellen, UPDATE über alle Zeilen. → SQL-Migration ist idempotent (DROP COLUMN failt nur, wenn Spalte nicht existiert — was nach erfolgreichem ersten Lauf der Fall ist). Rollback: Reverse-Migration mit ÷ durch 4.184 → × 4.184 (Rückrechnung, Genauigkeitsverlust möglich).

- **[Rule-Parameter-String]** `UPDATE recipe_rule SET parameter = 'energy_kcal'` betrifft alle Regeln mit `parameter='energy_kj'`. → Einfaches SQL, keine Idempotenz-Probleme (WHERE-Klausel filtert bereits konvertierte).

- **[Konflikt mit laufenden Changes]** Der `allergen-scanner-mealplan`-Change könnte `energy_kj` referenzieren. → Dieser Change sollte nach Abschluss des anderen ausgeführt werden.

## Migration Plan

```
┌─────────────────────────────────────────────────────────────────┐
│                     MIGRATION ORDER                              │
│                                                                 │
│  1. Neue Migration (SQL-basiert):                                │
│     ALTER TABLE ... ADD COLUMN *_kcal                            │
│     UPDATE ... SET *_kcal = ROUND(*_kj / 4.184)                  │
│     ALTER TABLE ... DROP COLUMN *_kj                             │
│     UPDATE recipe_rule SET parameter = 'energy_kcal'             │
│                                                                 │
│  2. Django-Modelle: Feldnamen ändern (keine Migration, nur Code) │
│                                                                 │
│  3. Backend-Schemas+Services+APIs: Rename, Conversions entfernen │
│                                                                 │
│  4. Frontend-Schemas+Components: Rename, kjToKcal() entfernen    │
│                                                                 │
│  5. Seed-Daten + Commands: kJ → kcal Werte                      │
│                                                                 │
│  6. Tests: Assertions aktualisieren                              │
│                                                                 │
│  7. Re-Seed: seed_all + seed_rules neu ausführen                 │
└─────────────────────────────────────────────────────────────────┘
```

Rollback: Reverse-Migration (× 4.184), Code-Revert. Nicht empfohlen wegen Präzisionsverlust bei doppelter Rundung.

## Open Questions

- **NormPortionSimulator:** Verwendet aktuell `kjToKcal(dge.energy_kj)` — wird einfach zu direktem `dge.energy_kcal`. Die PAL-Skalierung (`* palScale`) bleibt, aber auf kcal-Basis. Bestätigt?
- **DGE-Referenzwerte in `dge_reference.py`:** Aktuell in kJ (z.B. 5100 für 15-jährigen männlich PAL 1.5 ≈ 1219 kcal). Werden per `÷ 4.184, round` auf kcal umgerechnet. Die PAL-Faktoren selbst bleiben unverändert (1.2, 1.4, 1.6, 1.75 etc.).
