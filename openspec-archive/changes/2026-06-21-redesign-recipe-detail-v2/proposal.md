## Why

Die Rezept-Detailseite (`RecipeDetailPage.tsx`, 1143 Zeilen) ist optisch uneinheitlich und enthält mehrere bestätigte Laufzeit-Bugs (z.B. Crash bei persönlichen Rezepten, Sichtbarkeits-Leck, totes Type-Stats-Feature, kaputte Embedding-Aktualisierung, fehlerhafte Cache-Berechnung). Gleichzeitig fordert die bestehende Spec `recipe-detail-reorganized` ein Layout, das nur teilweise umgesetzt wurde. Dieser Change behebt alle gefundenen Bugs und setzt ein einheitliches, informatives, modernes Layout mit Wiedererkennungswert um.

## What Changes

### Bugfixes (aus dem Rezept-Logik-Audit)

- **BREAKING** Type-Stats-Feature neu aufbauen: Model `RecipeTypeStats` wurde per Migration `0037` gelöscht, aber `services/type_stats_service.py`, `api/type_stats.py`, `schemas/type_stats.py` referenzieren es noch (ImportError/AttributeError). Neu anlegen **inkl. Histogramm-Buckets** für Preis/Kalorien/Protein + Signal-basierte Cache-Invalidierung. `ContentStatus.VERIFIED` → `ContentStatus.APPROVED` (existiert nicht).
- **BREAKING** `RecipeBadge`-Crash: Backend liefert `recipe_badge="personal"`, Frontend `BADGE_CONFIG` kennt nur `verified/community/draft` → `undefined.color` crasht jedes persönliche Rezept. `personal`-Variante ergänzen.
- Sichtbarkeits-Leck: `get_recipe` / `get_recipe_by_slug` (recipe/api/recipes.py:298,327) nutzen `Recipe.objects` ohne `_get_visible_recipes_qs` → private/Entwurf-Rezepte per ID/Slug lesbar. Visibility-Filter ergänzen.
- Embedding-Aktualisierung kaputt: `signals.py:234` greift auf nicht existentes `instance.tracker` zu → AttributeError (verschluckt) → Embeddings werden bei Updates nie aktualisiert. `FieldTracker` ergänzen oder Logik auf `update_fields` umstellen.
- Cache-Gewicht/-Preis-Bug: `recipe_checks.py:373` zählt Gewicht nur bei `portion.weight_g`, ignoriert `measuring_unit`-Fall → `cached_weight_g`/`cached_energy_total_kcal`/`cached_price_total` zu niedrig. Berechnung an `get_recipe_total_weight_g` angleichen.
- `portion_id: null` beim Modifikations-Save (RecipeDetailPage.tsx:499) → IntegrityError. Items ohne `portion_id` filtern/validieren.
- Kochmodus-Skalierung (RecipeDetailPage.tsx:303) übergibt absoluten Portions-Zähler statt Multiplikator → falsche Mengen. Multiplikator `portions / recipe.portions` übergeben.
- Cache-Invalidierung trifft falsche Query-Keys (`api/recipes.ts:129`): tote `recipe-hints`/`recipe-nutri-improvements`, fehlende `recipe-improvements`/`recipe-rules`/`recipe-comments`/`recipe-similar`. Keys korrigieren.
- `PortionScaler` stale state (`useState(defaultPortions)` reagiert nicht auf Prop-Änderung) → kontrolliert machen.
- `_can_edit_recipe` in `api/items.py:25` fehlt `owner_id`-Check (inkonsistent zu recipes.py). Vereinheitlichen.
- `IndentationError` in `normalize_recipe_servings.py:50`. Korrigieren.
- `window.location.href` für Kochmodus (RecipeSidebar/RecipeMobileActionBar) → `navigate`/`setSearchParams`.
- Toten Code entfernen: `ScaleIngredientsDialog.tsx`, `store.scaleByFactor`, `scaleQuantity`.
- Kleinere: `like_score`-Save via `.update()` (Signal-Kaskade vermeiden), doppelte `effectivePortions`-Berechnung, `quantity__gt=0`-Constraint, `servings`→`portions`-Benennung in Store/Helpers.

### Portionen-Architektur

- DB speichert weiterhin **pro 1 Portion** (`portions=1`). Frontend rechnet vor dem Senden auf 1 Portion zurück und entfernt das irreführende `portions`-Payload-Feld aus Edit/Update.
- Zutaten und Nährwerte zeigen **zwei Spalten**: "pro Portion" und "gesamt (n Portionen)".

### Layout-Redesign

- Metadaten in eine reichhaltige **Seitenleiste** (Typ-Badge, Gesamtkosten, Nutri-Score, Status, Autor mit Profil-Link, Kategorie, Koch-/Vorbereitungszeit, Schwierigkeit, Altersgruppe, Aufrufe/Likes, Datenqualität-Score, Erstellt/Aktualisiert). Hauptstrang = Inhalte (Zutaten, Beschreibung, Zubereitung, Analysen).
- Typ-Badge **nur** in der Seitenleiste (nicht im Header).
- Summary kompakt und klein direkt unter dem Titel.
- Bild-Placeholder: bei fehlendem Bild kleiner dezenter Icon-Placeholder statt großem Fallback.
- Zubereitung **default geschlossen**.
- Bearbeiten/Löschen **nur** im Header oben rechts. Sidebar-Aktionen: Kochen, Einkaufsliste, Portionen, Drucken, Teilen, Clonen.
- Untere `ContentAuthorSection` entfernen (Autor in Sidebar).
- Analyse-Tabs mit **Histogrammen** (Preis/Portion, Kalorien/Portion, Protein/Portion) inkl. neutraler Perzentil-Position; nur ab ≥10 Rezepten desselben Typs.
- Ähnliche Rezepte (Embedding-basiert) als Karten-Reihe sicherstellen.
- Hartcodierte Farben durch semantische Token ersetzen.

### Zusatz-Features

- Nährwert-Big-Table (pro 100g + pro Portion + DGE-%).
- Allergen-Ampel mit Icons (enthält / frei von) basierend auf `NutritionalTag.is_dangerous`, klickbar.
- Kosten-Aufschlüsselung pro Zutat verlinkt auf Zutaten-Detailseite.
- "In X Essensplänen verwendet" (Zähler + Links via `MealItem.recipe`).
- Saisonalität / Verfügbarkeit (Jahres-Leiste aus `Ingredient.season_start/end`).
- Versions-/Änderungshinweis ("zuletzt aktualisiert", Fork-Basis verlinkt).
- Sticky Mini-TOC (Sprung-Navigation, Desktop).

## Capabilities

### New Capabilities
- `recipe-type-stats`: Neuaufbau des `RecipeTypeStats`-Models mit Histogramm-Buckets (Preis/Kalorien/Protein), Aggregations-Service, Signal-Invalidierung und öffentlichem Benchmark-Endpoint.
- `recipe-detail-enrichments`: Zusatz-Sektionen der Detailseite (Nährwert-Big-Table mit DGE-%, Allergen-Ampel, verlinkte Kosten, "In X Essensplänen verwendet", Saisonalität, Versions-Hinweis, Sticky Mini-TOC).

### Modified Capabilities
- `recipe-detail-reorganized`: Neues Sidebar-zentriertes Layout, Typ-Badge nur Sidebar, kompakte Summary, Zubereitung default geschlossen, Bild-Placeholder, Bearbeiten nur Header, zwei-spaltige Portion-Anzeige.
- `recipe-detail-page`: Analyse-Tabs mit Histogrammen statt einfacher Balken, Bugfixes (Badge, Sichtbarkeit, Kochmodus-Skalierung, Cache-Invalidierung).
- `recipe`: Cache-Gewicht/-Preis-Berechnung korrigiert, Embedding-Aktualisierung bei Updates, Sichtbarkeitsfilter Detail-Endpunkte, Permission-Vereinheitlichung, Portion-Normalisierung beim Speichern.

## Impact

**Backend (Django):**
- `recipe/models/type_stats.py` (NEU/wiederhergestellt + Bucket-Felder), Migration
- `recipe/services/type_stats_service.py` (Buckets, `ContentStatus.APPROVED`)
- `recipe/api/type_stats.py`, `recipe/schemas/type_stats.py` (Histogramm-Output)
- `recipe/api/recipes.py` (Visibility-Filter Detail, `portions`-Handling, like_score-Update)
- `recipe/api/items.py` (`_can_edit_recipe` owner-Check)
- `recipe/services/recipe_checks.py` (Gewicht/Preis-Cache)
- `recipe/signals.py` (Embedding-Tracker, dispatch_uid)
- `recipe/models/items.py` (`quantity__gt=0`)
- `recipe/management/commands/normalize_recipe_servings.py` (IndentationError)
- Neuer Endpoint/Feld für "In X Essensplänen verwendet" (`planner`/`recipe`)
- Pydantic-Schemas: `RecipeTypeStatsOut` (Buckets), `RecipeDetailOut` (Zusatzfelder), DGE-Referenz-Output

**Frontend (React/TS):**
- `pages/recipes/RecipeDetailPage.tsx`, `EditRecipePage.tsx`
- `components/recipe/`: RecipeSidebar, RecipeBadge, RecipeMetaCard, PortionScaler, PortionBottomSheet, RecipeMobileActionBar, RecipeAnalysisTabs, PriceTab, NutritionTab, HealthTab, WeightTab, RecipeCategoryBenchmark (Histogramm), RecipeNutriScoreDistribution; NEU: NutritionBigTable, AllergenIndicator, SeasonalityBar, RecipeUsageInMealPlans, RecipeTOC, RecipeHistogram
- `api/recipes.ts` (Query-Keys, useRecipeTypeStats), Stores (`servings`→`portions`)
- Zod-Schemas `schemas/recipe.ts`, `schemas/supply.ts` (Histogramm-Buckets, Zusatzfelder, NUTRI_SCORE_COLORS)
- Entfernen: `ScaleIngredientsDialog.tsx`, `ContentAuthorSection`-Nutzung
- Hartcodierte Farben → Token (Design-System-Konformität)

**Migrationen:** Neue Migration für `RecipeTypeStats` (+ Bucket-Felder), evtl. `quantity__gt=0`-Constraint-Änderung.

**Schema-Sync:** Pydantic ↔ Zod für TypeStats-Buckets und alle neuen Detail-Felder synchron halten.
