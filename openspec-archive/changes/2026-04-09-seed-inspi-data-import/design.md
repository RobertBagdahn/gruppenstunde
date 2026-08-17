## Context

Das Vorgängerprojekt **Inspi** speicherte Daten in Django-Fixtures (JSON-Format mit `{pk, model, fields}`). Die gruppenstunde-Plattform hat eine refaktorierte Architektur mit anderen App-Namen und Model-Feldern, aber die Kernkonzepte (Activities, Ingredients, Recipes, Materials) sind äquivalent. Die Inspi-Daten liegen unter `/Users/robertbagdahn/code/inspi/data/` und umfassen:

- **239 Activities** mit HTML-Beschreibungen, Tags, Materialzuordnungen
- **6.319 Ingredients** mit Nährwertdaten (MetaInfo-Modell), Preisen, EAN-Codes (REWE)
- **203 Rezepte** mit RecipeItems
- **660 Material-Namen** und **553 Material-Zuordnungen**
- **Master-Daten**: Topics, ScoutLevels, Locations, RetailSections, NutritionalTags, MeasuringUnits, RecipeHints

Die bestehende Seed-Logik (`seed_all.py`) bleibt unberührt. Der Inspi-Import ist ein separater, einmaliger Management Command.

## Goals / Non-Goals

**Goals:**
- Einmaliger Import aller verwertbaren Inspi-Daten in die gruppenstunde-Modelle
- Sauberes Mapping der Inspi-Datenstrukturen auf die neuen Modelle
- Idempotenz (wiederholbar ohne Duplikate)
- Import von möglichst vielen Daten: alle 6.319 Zutaten, alle 239 Activities, alle 203 Rezepte
- HTML → Markdown Konvertierung für Beschreibungstexte

**Non-Goals:**
- Kein automatischer Import bei jedem `seed_all`-Lauf
- Keine Bilder-Migration (Inspi-Images nicht lokal vorhanden)
- Keine Frontend-Änderungen
- Kein Daten-Cleanup oder Deduplizierung innerhalb der Inspi-Daten selbst
- Kein Production-Import — nur für Entwicklung/Staging

## Decisions

### 1. Separate Management Command statt Erweiterung von `seed_all`

**Entscheidung**: Neues Command `import_inspi_data` in `core/management/commands/`.

**Rationale**: Die Inspi-Daten sind ein einmaliger Bulk-Import mit ~8.000+ Records. Das bestehende `seed_all` erzeugt handkuratierte Beispieldaten und soll schnell bleiben. Der Import braucht Zugriff auf externe Dateien und ist ein separater Use-Case.

**Alternative verworfen**: Erweiterung von `seed_all` mit `--only inspi` — würde die Seed-Logik unnötig aufblähen.

### 2. JSON-Fixtures direkt lesen statt Django `loaddata`

**Entscheidung**: JSON-Dateien mit `json.load()` einlesen und über die Django ORM importieren.

**Rationale**: Die Inspi-Fixtures verwenden andere Model-Namen (`activity.activity` vs. `session.GroupSession`) und haben ein anderes Schema. Ein direktes `loaddata` ist nicht möglich. Das ORM-basierte Mapping erlaubt Feld-Transformationen und Validierung.

### 3. Activity → Content-Typ Mapping per `activity_type`

**Entscheidung**: Mapping basierend auf `activity_types` FK-Array:
- `activity_type_id=5` (Rezept) → Überspringen (Rezepte kommen aus `food/`-Daten)
- `activity_type_id=1` (Spiel) → `Game`
- `activity_type_id in [2,3,4]` (Lernen, Forschen, Kreatives) → `GroupSession`
- Aktivitäten mit mehreren Types → primärer Type (erster in der Liste)

**Rationale**: Die Inspi-Activity-Types (Spiel, Lernen, Forschen, Kreatives, Rezept) mappen natürlich auf die gruppenstunde Content-Types.

### 4. Inspi MetaInfo → Ingredient-Felder

**Entscheidung**: Das Inspi `food.metainfo`-Modell wird aufgelöst — Nährwerte landen direkt auf `Ingredient`, Preise auf `price_per_kg`.

**Rationale**: Gruppenstunde hat kein separates MetaInfo-Model. Alle Nährwertfelder und der Preis sind direkt auf `Ingredient`.

Feld-Mapping:
| Inspi MetaInfo | Gruppenstunde Ingredient |
|---|---|
| `energy_kj` | `energy_kj` |
| `protein_g` | `protein_g` |
| `fat_g` | `fat_g` |
| `fat_sat_g` | `fat_sat_g` |
| `carbohydrate_g` | `carbohydrate_g` |
| `sugar_g` | `sugar_g` |
| `fibre_g` | `fibre_g` |
| `salt_g` | `salt_g` |
| `sodium_mg` | `sodium_mg` (direkt) |
| `fruit_factor` | `fruit_factor` |
| `nutri_points` | `nutri_score` |
| `nutri_class` | `nutri_class` |
| `price_per_kg` | `price_per_kg` |
| `child_frendly_score` | `child_score` |
| `scout_frendly_score` | `scout_score` |

### 5. HTML zu Markdown Konvertierung

**Entscheidung**: HTML-Beschreibungstexte aus Inspi-Activities mit `markdownify` oder einfachem Regex in Markdown konvertieren.

**Rationale**: Gruppenstunde nutzt Markdown für alle Rich-Text-Felder. Die Inspi-Daten enthalten HTML. Eine vollständige Bibliothek wie `markdownify` wäre eine neue Dependency — ein einfacher Regex-basierter Ansatz für die gängigen HTML-Tags (`<p>`, `<br>`, `<b>`, `<i>`, `<ul>`, `<li>`, `<h1>`-`<h6>`) reicht aus.

### 6. Datenquelle-Pfad als Command-Argument

**Entscheidung**: `--data-dir` Argument mit Default `/Users/robertbagdahn/code/inspi/data`.

**Rationale**: Flexibilität für verschiedene Entwickler-Setups. Der Default-Pfad ist der bekannte Speicherort.

### 7. Import-Reihenfolge

**Entscheidung**: Abhängigkeitsbasierte Reihenfolge:
1. Master-Daten: MeasuringUnits, RetailSections, NutritionalTags, Tags, ScoutLevels
2. Ingredients + Portions (benötigen MeasuringUnits, RetailSections, NutritionalTags)
3. Materials (unabhängig)
4. Recipes + RecipeItems (benötigen Ingredients, Portions, MeasuringUnits)
5. Activities → GroupSessions/Games (benötigen Tags, ScoutLevels)
6. ContentMaterialItems (benötigen Materials + Activities)
7. RecipeHints → HealthRules

### 8. Idempotenz-Strategie

**Entscheidung**: `get_or_create` basierend auf `slug` (für Content-Typen und Supply) oder `name` (für Master-Daten).

**Rationale**: Slugs sind unique. Bei wiederholtem Import werden existierende Records übersprungen.

## Risks / Trade-offs

- **[Datenqualität]** Inspi-Daten enthalten Duplikate (z.B. mehrere "Stöcke" bei MaterialName) → Mitigation: `get_or_create` auf `name`/`slug` nimmt den ersten Treffer, Duplikate werden übersprungen.
- **[HTML-Konvertierung]** Nicht alle HTML-Konstrukte werden perfekt konvertiert → Mitigation: Die meisten Inspi-Beschreibungen nutzen einfaches HTML (`<p>`, `<br>`, `<b>`). Sonderfälle akzeptieren.
- **[Fehlende Bilder]** Activities haben `image`-Referenzen die nicht importiert werden → Mitigation: `image`-Feld bleibt leer, Frontend zeigt Fallback.
- **[Performance]** 6.319 Ingredients + 203 Recipes = viele DB-Inserts → Mitigation: `bulk_create` wo möglich, `transaction.atomic()` für Konsistenz.
- **[Daten-Pfad]** Der Import braucht Zugriff auf `/Users/robertbagdahn/code/inspi/data/` → Mitigation: Pfad ist konfigurierbar via `--data-dir`.

## Betroffene Dateien

| Pfad | Änderung |
|---|---|
| `backend/core/management/commands/import_inspi_data.py` | Neue Datei — Management Command |
| Keine weiteren Dateien betroffen | — |

## Datenbank-Migrationen

Keine Migrationen nötig. Alle Daten passen in bestehende Modelle.
