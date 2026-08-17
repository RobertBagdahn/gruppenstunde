## Context

Das Inspi-Projekt hat ein funktionierendes Ernährungssystem mit Big 7 Makronährstoffen auf dem `Ingredient`-Model, Nutri-Score-Berechnung, RecipeHint-Regeln und einem HealthRule-basierten Cockpit. Aktuell existieren nur 4 rudimentäre RecipeHint-Seed-Daten und 6 HealthRules. Im alten Inspi-Projekt (`/inspi/food`) waren 20+ RecipeHints implementiert. Vitamine und Mineralstoffe fehlen komplett.

**Aktuelle Dateien:**
- `backend/supply/models/ingredient.py` — Ingredient mit 11 Nährwertfeldern (energy_kj, protein_g, fat_g, fat_sat_g, carbohydrate_g, sugar_g, fibre_g, salt_g, sodium_mg, fructose_g, lactose_g)
- `backend/recipe/models/recipe.py` — Recipe mit 8 cached-Nährwertfeldern
- `backend/recipe/models/hints.py` — RecipeHint Model
- `backend/recipe/models/health_rule.py` — HealthRule Model
- `backend/supply/data/dge_reference.py` — Statische DGE-Referenzwerte (nur Makronährstoffe)
- `backend/supply/services/nutri_service.py` — Nutri-Score-Berechnung
- `backend/recipe/services/recipe_checks.py` — Rezept-Nährwert-Aggregation und Hint-Matching
- `backend/recipe/services/cockpit_service.py` — HealthRule-Auswertung für Cockpit
- `backend/core/management/commands/seed_all.py` — Seed-Daten (Zeilen 1916-2036)
- `backend/supply/admin.py` — Ingredient-Admin mit Fieldsets
- `backend/recipe/admin.py` — RecipeHint-Admin, HealthRule fehlt im Admin

**Frontend:**
- `frontend/src/schemas/` — Zod-Schemas für Ingredient, Recipe, Nutrition
- `frontend/src/api/` — TanStack Query Hooks
- `frontend/src/pages/` — Rezeptdetail mit Nährwerttabelle

## Goals / Non-Goals

**Goals:**
- Ingredient-Model um Vitamine (13 Felder) und Mineralstoffe (12 Felder) erweitern
- Recipe-Model um entsprechende denormalisierte Cache-Felder erweitern
- DGE-Referenzwerte als pflegbares Django-Model statt statischer Python-Datei
- RecipeHint-Regeln von 4 auf 50+ erweitern (alle alten Inspi-Regeln + neue Vitamin/Mineralstoff-Regeln)
- HealthRules von 6 auf 20+ erweitern (Vitamine/Mineralstoffe auf Tages/Mahlzeitebene)
- Alle Regeln mit konkreten Improvement-Texten versehen
- Admin-Oberfläche für HealthRule ergänzen
- Nährwerttabelle in Rezeptdetail und Ingredient-Detail erweitern
- DGE-Bedarfsdeckung (%) in Nutrition-Breakdown API

**Non-Goals:**
- Keine Änderung der Nutri-Score-Berechnung (bleibt bei Big 7)
- Kein neues Frontend-Modul (nur Erweiterung bestehender Tabellen)
- Keine Vitamin/Mineralstoff-Daten für bestehende Zutaten befüllen (nur Felder anlegen, Daten kommen über AI-Service oder manuell)
- Kein Import von externen Nährwertdatenbanken (z.B. USDA FDC)
- Keine Änderung der Inspi-Score-Berechnung

## Decisions

### 1. Vitamine und Mineralstoffe direkt auf Ingredient (Flat Fields) statt separater Tabelle

**Entscheidung:** Alle Vitamin- und Mineralstoff-Felder werden als nullable FloatFields direkt auf dem Ingredient-Model hinzugefügt (analog zu den bestehenden Makronährstoff-Feldern).

**Alternativen:**
- *Separate NutrientValue-Tabelle (EAV-Pattern)*: Flexibler, aber deutlich langsamer bei Aggregation (N+1 Queries), komplexere Schemas, kein einfaches Admin-Fieldset
- *JSON-Feld*: Flexibel, aber nicht typsicher, keine DB-Validierung, schwieriger in Admin

**Rationale:** Das bestehende Pattern (Flat Fields) funktioniert gut, ist performant bei Aggregation, einfach im Admin darstellbar und konsistent mit der Architektur. ~25 neue Felder sind akzeptabel.

### 2. DGE-Referenz als Django-Model statt statischer Python-Datei

**Entscheidung:** Neues Model `DgeReference` in der supply App mit Feldern für Altersgruppe, Geschlecht und alle Nährwert-Referenzwerte. Initial per Seed befüllt, über Admin pflegbar.

**Alternativen:**
- *Statische Datei beibehalten*: Einfacher, aber nicht über Admin pflegbar
- *JSON-Konfigurationsdatei*: Pflegbar, aber kein Admin-Interface

**Rationale:** Die DGE-Werte ändern sich selten, aber Admins sollen sie anpassen können (z.B. für spezielle Pfadfinder-Zielgruppen). Das bestehende `dge_reference.py` wird zum Seed-Daten-Input.

### 3. Denormalisierte Cache-Felder auf Recipe für Vitamine/Mineralstoffe

**Entscheidung:** Analog zu den bestehenden `cached_*`-Feldern werden ~15 weitere Cache-Felder auf Recipe hinzugefügt (nur die wichtigsten: Vitamin A, C, D, B12, Calcium, Eisen, Magnesium, Zink, Kalium, Folat).

**Alternativen:**
- *Alle 25 Werte cachen*: Zu viele Felder, die meisten werden in Listen nicht angezeigt
- *Gar nicht cachen*: Zu langsam bei Listen-Queries

**Rationale:** Nur die 10 ernährungsphysiologisch wichtigsten Mikronährstoffe werden gecacht. Alle 25 sind weiterhin on-demand über den Nutrition-Breakdown-Endpoint berechenbar.

### 4. RecipeHint-Regeln: Improvement-Texte als Freitext auf dem Model

**Entscheidung:** Das bestehende `description`-Feld auf RecipeHint wird für Improvement-Texte genutzt. Zusätzlich wird ein `improvement_text`-Feld hinzugefügt, das konkrete Handlungsempfehlungen enthält.

**Rationale:** Trennung von Beschreibung (was ist das Problem) und Improvement (was kann man tun). Beide Felder sind im Admin pflegbar.

### 5. Nährwert-Gruppen-Struktur in der Tabelle

**Entscheidung:** Nährstoffe werden in 4 Gruppen dargestellt:
1. **Makronährstoffe** (Big 7 + Ballaststoffe): Energie, Fett, davon gesättigte FS, Kohlenhydrate, davon Zucker, Eiweiß, Salz, Ballaststoffe
2. **Vitamine**: A, B1, B2, B6, B12, C, D, E, K, Niacin, Folat, Pantothensäure, Biotin
3. **Mineralstoffe**: Calcium, Eisen, Magnesium, Zink, Kalium, Phosphor, Jod, Selen, Kupfer, Mangan, Chrom, Fluorid
4. **Sonstiges**: Fructose, Lactose, Fruit Factor (für Nutri-Score)

## Risks / Trade-offs

**[Risk] ~40 neue DB-Spalten auf Ingredient** → Alle nullable mit default=None, kein Performance-Impact da PostgreSQL NULL effizient speichert. Migration ist safe da nur ADD COLUMN.

**[Risk] Recipe-Cache-Invalidierung wird langsamer** → Nur 10 neue cached-Felder, Aggregation in `recalculate_recipe_cache()` ist O(n) über RecipeItems. Akzeptabel.

**[Risk] Seed-Daten werden groß** → Strukturierung in separate Seed-Funktionen innerhalb `seed_all.py`. RecipeHints und HealthRules als eigene Blöcke.

**[Risk] Frontend-Tabelle wird auf Mobile unübersichtlich** → Collapsible Sections (Makronährstoffe immer sichtbar, Vitamine/Mineralstoffe aufklappbar).

## API-Änderungen

### Bestehende Endpoints (erweiterte Responses)
- `GET /api/ingredients/{slug}/` — IngredientDetailOut bekommt Vitamin/Mineralstoff-Felder
- `POST /api/ingredients/` — IngredientCreateIn bekommt optionale Vitamin/Mineralstoff-Felder
- `PATCH /api/ingredients/{slug}/` — IngredientUpdateIn bekommt optionale Vitamin/Mineralstoff-Felder
- `GET /api/recipes/{id}/nutrition-breakdown/` — RecipeNutritionBreakdownOut bekommt Vitamin/Mineralstoff-Aggregation + DGE-% Spalte
- `GET /api/recipes/{id}/recipe-hints/` — Mehr Hints kommen zurück (50+ statt 4)
- `GET /api/health-rules/` — Mehr Rules (20+ statt 6)

### Neuer Endpoint
- `GET /api/dge-references/` — Liste aller DGE-Referenzwerte (für Frontend-Anzeige der %-Bedarfsdeckung)

## Migrations-Anforderungen

1. `supply`: ADD COLUMN für 25 nullable FloatFields auf Ingredient + neues DgeReference Model
2. `recipe`: ADD COLUMN für 10 nullable FloatFields auf Recipe (cached-Felder) + ADD COLUMN `improvement_text` auf RecipeHint
3. Seed-Daten: `seed_all.py` erweitern mit DgeReference-Daten, erweiterten RecipeHints und HealthRules

## Open Questions

- Sollen die DGE-Referenzwerte auch Vitamine und Mineralstoffe enthalten? → Ja, mit offiziellen DGE D-A-CH Werten.
- Soll die Prozent-Bedarfsdeckung im Frontend client-seitig berechnet werden (DGE-Daten laden + Nährwerte dividieren) oder server-seitig? → Server-seitig im Nutrition-Breakdown-Endpoint, da die Altersgruppe des MealEvents/NormPortion berücksichtigt werden soll.
