## Context

Die Seed-Daten in `backend/data/food/` sind Produktionsdaten mit 5.743 Zutaten (Export vom 2026-07-08). Sie wurden aus einer Mischung von REWE-Scraping (5.002 Einträge mit `nan_art_id_rewe`) und Legacy-Importen erzeugt. Die Datenqualität ist unzureichend — siehe Analyse in `ingredient_review_candidates.txt`.

Das Projekt nutzt `import_prod_data` (Management Command) zum Laden der Fixtures und `export_prod_data.py` (Binärscript) zum Export aus der Produktion. Beide operieren auf JSON-Dateien im Django-Fixture-Format.

**Aktuelle Probleme:**
- 43 generische Ein-Wort-Namen ohne Qualifier und mit 0 Nährwerten
- 5.219 von 5.762 aktiven Zutaten haben sinnlose rank-1-Portionen (weight_g ≤ 1,0g)
- 585 Zutaten fehlen energy_kcal (darunter Butter, Eier, Öl, Mehl, Honig)
- Nur 148 Aliase für 128 Zutaten (2,2% Abdeckung)
- `physical_viscosity` bei 5.742 von 5.743 auf "solid" (auch für Flüssigkeiten)
- 1.000 Embeddings sind für alte Zutaten-Namen berechnet
- Recipe-Caches basieren auf fehlerhaften Zutaten-Nährwerten

## Goals / Non-Goals

**Goals:**
- Vollständige Nährwerte für alle Zutaten (REWE → BLS → KI mit Range-Validation)
- Konkrete, spezifische Namen statt generischer (z.B. "gemahlener schwarzer Pfeffer" statt "Pfeffer")
- Plausible rank-1-Portionen für alle Zutaten
- ~70-90 generische Begriffe als `is_generic=True` Aliase (1:N auf alle passenden konkreten Zutaten)
- REWE-Produkte bleiben erhalten + bekommen Aliase zu kuratierten Einträgen
- Alle Recipe-Caches via echter `recalculate_recipe_cache()` neu berechnet
- Alle 5.743 Embeddings neu berechnet und als Seed gespeichert
- Saubere Fixture-JSONs via `dumpdata`, bereit für `import_prod_data`
- Idempotent: heuristische Erkennung bereits verarbeiteter Zutaten
- Summarischer Report (nur Zahlen)

**Non-Goals:**
- Keine Model-Änderungen (rein Daten-Transformation)
- Keine API-Änderungen
- Keine Frontend-Änderungen
- Keine Änderungen an masterdata (Tags, MeasuringUnits, RetailSections — die sind bereits gut)
- Keine Änderungen an planner/shopping/profiles Fixtures

## Decisions

### 1. Architektur: SQLite + Django ORM statt JSON-Manipulation

**Entscheidung**: Das enrich-Script importiert alle Fixtures in eine temporäre SQLite-DB, macht alle Änderungen via Django ORM, und exportiert mit `dumpdata`.

**Alternativen erwogen**:
- *JSON-Manipulation*: Direktes Parsen und Ändern der Fixture-JSONs. Abgelehnt wegen FK-Ketten (RecipeItem → Portion → Ingredient), Constraint-Complexität und fehlendem ORM-Support.
- *Hybrid JSON + SQLite*: JSON für Ingredients, SQLite nur für Recipe-Caches. Abgelehnt wegen doppelter Datenhaltung.

**Rationale**: Volle ORM-Garantien (Constraints, Validierung, existierende Services), keine manuelle FK-Pflege, `recalculate_recipe_cache()` und Embedding-Service direkt nutzbar.

### 2. Datenquellen-Priorität für Nährwerte: REWE → BLS → KI

**Entscheidung**: `IngredientSpec.nutrition_source` trackt die Herkunft. Priority: (1) REWE-Produktdaten aus bestehendem Fixture, (2) Bundeslebensmittelschlüssel-Referenz, (3) Gemini KI-Schätzung mit Range-Validation.

**Range-Validation für KI-Schätzungen**:
| Feld | Min | Max |
|------|-----|-----|
| energy_kcal | 0 | 900 |
| protein_g | 0 | 100 |
| fat_g | 0 | 100 |
| carbohydrate_g | 0 | 100 |
| sugar_g | 0 | 100 |
| fibre_g | 0 | 60 |
| salt_g | 0 | 100 |

Werte außerhalb → auf null setzen (keine KI-Schätzung).

### 3. KI-Einsatz: Fallback nach Regeln

**Entscheidung**: KI nur für Fälle einsetzen, die nicht durch harte Regeln oder Name-Similarity auflösbar sind (geschätzt 10-20% der Entscheidungen).

**Ablauf**:
1. Direkter Name-Match in KB → überspringen
2. Name-Similarity (trigram) → KB-Eintrag zuordnen
3. Unklar → Batched Gemini Call (50 Zutaten pro Request) mit strukturiertem JSON-Output
4. Portion-Bereinigung: Batched Gemini entscheidet pro Portion ob sinnvoll

### 4. Generic Aliases: 1:N Mapping

**Entscheidung**: Ein generischer Begriff (`is_generic=True`) wird auf ALLE passenden konkreten Zutaten verteilt. "Salz" → Jodsalz, Meersalz, Steinsalz, Himalaya-Salz.

**Begründung**: Die DB-Constraint `unique_alias_name_when_not_generic` (partial unique, gilt NUR für `is_generic=False`) erlaubt explizit dass derselbe Name auf mehreren Zutaten existiert. Das ist by design und wird so genutzt.

**Matching**: KI identifiziert für jeden generischen Begriff die passenden konkreten Zutaten (batch-weise).

### 5. Portion-Bereinigung: KI-Entscheidung

**Entscheidung**: Die KI entscheidet pro Portion, ob sie gelöscht werden soll. Kontext: Zutatenname, Portionsname, weight_g, measuring_unit.

**Harte Regel vorab**:
- `rank=9999` → immer löschen (wird durch neuen "g"-Eintrag ersetzt)
- Von RecipeItems referenziert → behalten, aber RecipeItem auf neue rank-1-Portion umbiegen

"g"-Basisportion (1g) bleibt explizit erhalten als grammgenaue Eingabemöglichkeit.

### 6. IngredientSpec Knowledge Base

**Entscheidung**: Neue Python-Datenstruktur in `supply/data/ingredient_specs.py` mit ~500 kuratierten Zutaten. Daten werden aus den bestehenden REWE-Fixtures extrahiert (REWE-Produkte haben oft schon korrekte Nährwerte und Preise).

**Struktur**:
```python
@dataclass
class IngredientSpec:
    canonical_name: str          # "gemahlener schwarzer Pfeffer"
    generic_names: list[str]     # ["Pfeffer"]
    energy_kcal: float | None
    protein_g: float | None
    # ... alle Nährwerte
    price_per_kg: Decimal | None
    physical_density: float      # default 1.0
    physical_viscosity: str      # solid/liquid/powder/paste
    retail_section: str | None
    nutritional_tags: list[str]
    portions: list[PortionSpec]  # rank-1 zuerst
    aliases: list[str]           # ["schwarzer Pfeffer", "Pfeffer gemahlen"]
    nutri_score: int | None
    nutri_class: int | None
    rewe_product_names: list[str]  # Zum Matchen von REWE-Zutaten
```

### 7. Embedding-Neuberechnung

**Entscheidung**: Alle 5.743 Embeddings werden via Gemini text-embedding API neu berechnet und in `supply_ingredient_embeddings.json` gespeichert (custom Format, kein Django Fixture).

**Embedding-Text**: `f"{ingredient.name} {ingredient.description or ''}"` (wie der existierende Embedding-Service).

### 8. Idempotenz durch Heuristik

**Entscheidung**: Kein separates Tracking-File. Stattdessen Heuristik beim Start:
- Name enthält keinen generischen Begriff (kein exakter Match in generic-terms Liste)
- `energy_kcal > 0` (oder legitim 0 bei Gewürzen/Wasser)
- Mindestens eine Portion mit `rank=1` UND `weight_g > 1.0`
→ Zutat wird übersprungen

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| KI halluziniert Nährwerte oder Portions-Entscheidungen | Range-Validation für Nährwerte; Batched-Prompts mit klaren Ja/Nein-Entscheidungen; harte Regeln vor KI |
| Embedding-Neuberechnung dauert lange (5.743 × ~100ms ≈ 10 Min) | Rate-Limiting beachten (Gemini Flash hat 1.500 RPM); Progress-Logging |
| Recipe-Cache-Berechnung auf SQLite langsamer als PostgreSQL | Nur 362 Rezepte mit durchschnittlich <10 Items — akzeptabel (<1 Min) |
| dumpdata produziert andere PKs als Original-Fixtures | Natürliche PKs aus import_prod_data bleiben erhalten (kein `--natural-foreign`), dumpdata gibt exakt dieselben PKs aus |
| Bestehende Embeddings referenzieren andere PKs | Alle Embeddings werden neu geschrieben, alte PKs irrelevant |
| `seed_generic_terms.py` läuft nach enrich_seeds und überschreibt Aliase | Command wird als obsolet markiert und aus seed_all.py entfernt |

## Migration Plan

1. **Entwicklung**: `enrich_seeds` Command in `core/management/commands/` schreiben
2. **Lokal testen**: `uv run python manage.py enrich_seeds` → Fixtures prüfen → `import_prod_data --flush` → App testen
3. **Produktion**: `uv run python manage.py enrich_seeds` → neue Fixtures commiten → deploy → `import_prod_data --flush`

**Rollback**: Alte Fixtures sind in Git-History. `git checkout HEAD~1 -- backend/data/food/` stellt wieder her.

## Open Questions

- Keine — alle Design-Entscheidungen wurden im Explore Mode geklärt (20 Fragen)
