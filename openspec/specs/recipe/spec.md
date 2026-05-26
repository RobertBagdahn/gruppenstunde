## Requirements

### Requirement: Recipe Model inherits from Content
Recipe SHALL inherit from the abstract `Content` base class. All existing Recipe-specific fields (recipe_type, servings) SHALL be preserved. The `servings` field SHALL default to 1 (Normportion) and represent the base portion count for which all RecipeItem quantities are stored. Recipe SHALL additionally have denormalized cache fields for aggregated nutritional values per Normportion: `cached_energy_kj` (FloatField, nullable), `cached_protein_g` (FloatField, nullable), `cached_fat_g` (FloatField, nullable), `cached_carbohydrate_g` (FloatField, nullable), `cached_sugar_g` (FloatField, nullable), `cached_fibre_g` (FloatField, nullable), `cached_salt_g` (FloatField, nullable), `cached_nutri_class` (IntegerField 1-5, nullable), `cached_price_total` (DecimalField, nullable), `cached_at` (DateTimeField, nullable).

#### Scenario: Recipe has all Content fields and cache fields
- **WHEN** a Recipe is created
- **THEN** it SHALL have all Content base fields (title, slug, summary, description, tags, scout_levels, authors, embedding, etc.)
- **THEN** it SHALL have recipe-specific fields (recipe_type, servings)
- **THEN** servings SHALL default to 1
- **THEN** it SHALL have all cached nutritional fields (initially null)

### Requirement: Recipe Material Section
Recipe SHALL support Material assignment via ContentMaterialItem for kitchen equipment (knives, cutting boards, ovens, etc.). Materials SHALL be displayed in a separate "Küchengeräte" section, distinct from the "Zutaten" section.

#### Scenario: Recipe with kitchen equipment
- **WHEN** a Recipe has Materials assigned
- **THEN** a "Küchengeräte" section SHALL appear below or alongside the "Zutaten" section
- **THEN** each material SHALL link to the Material detail page

### Requirement: RecipeItem uses Supply-based Ingredient
RecipeItem SHALL reference `supply.Ingredient` and `supply.Portion`. The cross-app FK pattern SHALL remain the same.

#### Scenario: RecipeItem references supply.Ingredient
- **WHEN** a RecipeItem is created
- **THEN** it SHALL reference a Portion from the supply app
- **THEN** quantities SHALL be per NormPerson (1 Portion)

## Removed Requirements (Historical)

### Requirement: RecipeComment Model
**Reason**: Replaced by generic ContentComment from content app
**Migration**: All RecipeComment data SHALL be migrated to ContentComment with content_type pointing to Recipe

### Requirement: RecipeEmotion Model
**Reason**: Replaced by generic ContentEmotion from content app
**Migration**: All RecipeEmotion data SHALL be migrated to ContentEmotion with content_type pointing to Recipe

### Requirement: RecipeView Model
**Reason**: Replaced by generic ContentView from content app
**Migration**: All RecipeView data SHALL be migrated to ContentView with content_type pointing to Recipe

### Requirement: Recipe standalone status field
**Reason**: Status management is now handled by Content base class with approval workflow
**Migration**: Existing Recipe status values SHALL be mapped to new ContentStatus choices

## Requirements (continued)

### Requirement: Cached nutritional fields on Recipe
Recipe SHALL maintain cached nutritional aggregates computed from its RecipeItems. These are the denormalized cache fields defined on the Recipe model (cached_energy_kj, cached_protein_g, cached_fat_g, cached_carbohydrate_g, cached_sugar_g, cached_fibre_g, cached_salt_g, cached_nutri_class, cached_price_total, cached_at).

In addition to the existing 8 cached macronutrient fields, the model SHALL include 10 cached micronutrient fields:
- `cached_vitamin_a_mg` (FloatField, nullable)
- `cached_vitamin_c_mg` (FloatField, nullable)
- `cached_vitamin_d_ug` (FloatField, nullable)
- `cached_vitamin_b12_ug` (FloatField, nullable)
- `cached_calcium_mg` (FloatField, nullable)
- `cached_iron_mg` (FloatField, nullable)
- `cached_magnesium_mg` (FloatField, nullable)
- `cached_zinc_mg` (FloatField, nullable)
- `cached_potassium_mg` (FloatField, nullable)
- `cached_folate_ug` (FloatField, nullable)

The `recalculate_recipe_cache()` function SHALL aggregate these values from RecipeItems and store them on the Recipe.

#### Scenario: Cache fields populated on RecipeItem change
- **WHEN** a RecipeItem is added, modified, or deleted from a Recipe
- **THEN** the Recipe's cached nutritional fields (including micronutrients) SHALL be recalculated
- **THEN** `cached_at` SHALL be set to the current timestamp
- **THEN** the calculation SHALL aggregate all RecipeItem nutritional values per Normportion (based on servings)

#### Scenario: Recipe cache includes micronutrients
- **WHEN** a RecipeItem is saved on a recipe where the ingredient has vitamin_c_mg=53.0 and calcium_mg=120
- **THEN** the Recipe's cached_vitamin_c_mg and cached_calcium_mg SHALL be recalculated

#### Scenario: Recipe list includes cached micronutrients
- **WHEN** a GET request is made to `/api/recipes/`
- **THEN** each recipe in the response SHALL include the 10 cached micronutrient fields (may be null)

#### Scenario: Cache fields invalidated on Ingredient change
- **WHEN** an Ingredient's nutritional values or price_per_kg are updated
- **THEN** all Recipes containing that Ingredient (via RecipeItem) SHALL have `cached_at` set to null
- **THEN** a background recalculation SHALL update the cache fields

### Requirement: Signal-based cache invalidation
The system SHALL automatically invalidate and recalculate Recipe caches when underlying data changes, using Django signals. This covers changes to `RecipeItem`, `supply.Ingredient`, `supply.Portion`, and `supply.MeasuringUnit`.

#### Scenario: RecipeItem saved or deleted
- **WHEN** a RecipeItem is saved (`post_save`) or deleted (`post_delete`)
- **THEN** the parent Recipe's cached nutritional fields SHALL be recalculated within the same request cycle

#### Scenario: Ingredient saved
- **WHEN** an Ingredient is saved (`post_save`) with changed nutritional values
- **THEN** all Recipes referencing that Ingredient directly (`RecipeItem.ingredient`) or indirectly (`RecipeItem.portion.ingredient`) SHALL have their caches recalculated

#### Scenario: Ingredient deleted
- **WHEN** an Ingredient is deleted (`post_delete`)
- **THEN** all Recipes that previously referenced that Ingredient directly or via Portion SHALL have their caches recalculated so the removed contribution is no longer reflected in `cached_*` fields

#### Scenario: Portion saved
- **WHEN** a Portion is saved (`post_save`) with changed `weight_g`, `quantity`, `measuring_unit`, or `ingredient`
- **THEN** all Recipes with a RecipeItem referencing that Portion SHALL have their caches recalculated

#### Scenario: Portion deleted
- **WHEN** a Portion is deleted (`post_delete`)
- **THEN** all Recipes that previously referenced that Portion SHALL have their caches recalculated

#### Scenario: MeasuringUnit saved
- **WHEN** a MeasuringUnit is saved (`post_save`) with changed `quantity` factor
- **THEN** all Recipes with a RecipeItem referencing that MeasuringUnit directly or via `portion.measuring_unit` SHALL have their caches recalculated

### Requirement: LLM suggestion cache keyed by recipe cache timestamp
The LLM-based ingredient suggestion service (`recipe.services.suggestion_service.get_suggestions`) SHALL include the Recipe's `cached_at` timestamp in its Django cache key, so that any change which updates `cached_at` automatically invalidates previously cached suggestions.

#### Scenario: Cache key composition
- **WHEN** `get_suggestions(recipe, objective, user)` is called
- **THEN** the cache key SHALL have the form `recipe_suggestion:{recipe.id}:{cached_at_timestamp}:{hash(objective)}`
- **THEN** `cached_at_timestamp` SHALL be `int(recipe.cached_at.timestamp())` when `cached_at` is set, otherwise `0`

#### Scenario: Cached suggestion reused when recipe unchanged
- **WHEN** the same `(recipe, objective)` combination is requested twice within the TTL window AND `cached_at` has not changed
- **THEN** the second call SHALL return the cached suggestion without invoking Gemini

#### Scenario: Cache miss after recipe change
- **WHEN** a RecipeItem/Ingredient/Portion/MeasuringUnit change has triggered `recalculate_recipe_cache` and updated `cached_at`
- **AND** a suggestion request is made for the same `(recipe, objective)` combination
- **THEN** the previous cache entry SHALL NOT be returned
- **THEN** Gemini SHALL be invoked to produce fresh suggestions

### Requirement: Frontend recipe data invalidation helper
The frontend SHALL provide a single helper function `invalidateRecipeData(queryClient, recipeId)` in `frontend/src/api/recipes.ts` that invalidates all TanStack Query keys whose data can become stale when a Recipe or its RecipeItems change. All Recipe- and RecipeItem-mutating hooks SHALL use this helper in their `onSuccess` callbacks instead of invalidating individual keys.

#### Scenario: Helper invalidates all derived query keys
- **WHEN** `invalidateRecipeData(queryClient, recipeId)` is called
- **THEN** the following query keys SHALL be invalidated: `['recipe', recipeId]`, `['recipe', 'slug']`, `['recipe-items', recipeId]`, `['recipe-hints', recipeId]`, `['recipe-nutri-score', recipeId]`, `['recipe-nutrition-breakdown', recipeId]`, `['recipe-nutri-improvements', recipeId]`, `['recipes']`, `['my-recipes']`

#### Scenario: RecipeItem mutation refreshes all derived views
- **WHEN** `useCreateRecipeItem`, `useUpdateRecipeItem`, or `useDeleteRecipeItem` completes successfully
- **THEN** the mutation's `onSuccess` callback SHALL call `invalidateRecipeData(queryClient, recipeId)`
- **THEN** the Recipe detail page SHALL re-fetch nutritional breakdown, hints, nutri-score, and improvements without a manual page reload

#### Scenario: Recipe-level mutation refreshes all derived views
- **WHEN** a Recipe-level mutation (`useUpdateRecipe`, fork, visibility change) completes successfully
- **THEN** the mutation's `onSuccess` callback SHALL call `invalidateRecipeData(queryClient, recipeId)`

### Requirement: recalculate_recipe_cache management command
The system SHALL provide a Django management command `recalculate_recipe_cache` to bulk-recalculate cached nutritional fields for all (or specific) Recipes.

#### Scenario: Full recalculation
- **WHEN** an admin runs `uv run python manage.py recalculate_recipe_cache`
- **THEN** all Recipes SHALL have their cached nutritional fields recalculated
- **THEN** a summary of updated recipes SHALL be printed

### Requirement: Recipe list shows cached nutritional data
The recipe list API and UI SHALL use cached nutritional fields for displaying Nutri-Score badges and price indicators without additional joins.

#### Scenario: Recipe list with Nutri-Score badge
- **WHEN** a user views the recipe list
- **THEN** each recipe card SHALL display a Nutri-Score badge based on `cached_nutri_class`
- **THEN** the badge SHALL show A (green) through E (red)

#### Scenario: Recipe list with price indicator
- **WHEN** a user views the recipe list
- **THEN** each recipe card SHALL display a price indicator based on `cached_price_total`
- **THEN** the price SHALL be formatted as EUR with traffic-light coloring (green < 3 EUR, yellow < 8 EUR, red >= 8 EUR)

#### Scenario: Stale cache display
- **WHEN** a Recipe has `cached_at = null` (cache invalidated)
- **THEN** the list SHALL either show "wird berechnet..." or fetch fresh values on demand

### Requirement: Extended nutrition breakdown with DGE coverage
The nutrition breakdown endpoint SHALL include micronutrient data, DGE reference coverage percentages, positive health traits, and per-item nutritional contributions.

The `RecipeNutritionBreakdownOut` SHALL include:
- All existing macronutrient totals
- New micronutrient totals: total_vitamin_a_mg, total_vitamin_c_mg, total_vitamin_d_ug, total_vitamin_b12_ug, total_calcium_mg, total_iron_mg, total_magnesium_mg, total_zinc_mg, total_potassium_mg, total_folate_ug
- Per-serving values for all micronutrients
- A `dge_coverage` object mapping each nutrient to a percentage of daily reference value
- `positive_traits: list[str]` (Enum-Keys der positiven Eigenschaften; leer wenn keine zutreffen)

The `RecipeItemNutritionOut` SHALL include all 25 micronutrient fields per item and a `contributions: list[ContributionOut]` field.

Das Schema `ContributionOut` MUSS die Felder `parameter` (enum: energy, protein, fat, sat_fat, carbs, sugar, salt, fiber), `absolute` (float), `percent_of_recipe` (float 0–100) haben.

#### Scenario: Nutrition breakdown with micronutrients
- **WHEN** a GET request is made to `/api/recipes/{id}/nutrition-breakdown/`
- **THEN** the response SHALL include total and per-serving values for all vitamins and minerals

#### Scenario: DGE coverage calculation
- **WHEN** a recipe has per-serving vitamin_c_mg=30 and the DGE reference for age 14 male is 90mg
- **THEN** the dge_coverage SHALL include `vitamin_c_mg: 33.3` (percentage)

#### Scenario: Nutrition breakdown with positive traits
- **WHEN** ein Rezept mit Ballaststoffgehalt >= 6 g/100g angefragt wird
- **THEN** MUSS das Response `positive_traits` den Eintrag `high_fiber` enthalten

#### Scenario: Nutrition breakdown with contributions
- **WHEN** ein Rezept mit drei Zutaten (Nudeln, Tomatensosse, Kaese) angefragt wird
- **THEN** MUSS jedes Item in `items` ein `contributions`-Array enthalten
- **THEN** MUSS die Summe aller `percent_of_recipe` ueber alle Items fuer denselben Parameter zwischen 99 und 101 liegen (Rundungs-Toleranz)
- **THEN** MUSS `absolute` konsistent mit dem bereits berechneten Einzelwert des Items fuer den Parameter sein

#### Scenario: Nutrition breakdown with micronutrients (unchanged)
- **WHEN** ein Client die Breakdown-Response empfaengt
- **THEN** MUSS jedes Item die 25 Mikronaehrstoff-Felder (Vitamine und Mineralstoffe) wie in der bestehenden Spec definiert enthalten

### Requirement: Positive Health-Badges auf Rezept-Detailseite
The system SHALL compute and display positive health traits for each recipe based on hardcoded DGE-/EU-claim thresholds and render them as green chips in the health section.

#### Scenario: Trait-Berechnung
- **WHEN** der Server den Nutrition-Breakdown fuer ein Rezept zusammenstellt
- **THEN** MUSS er eine Liste `positive_traits: string[]` zurueckgeben, die null oder mehr der folgenden Enum-Keys enthaelt: `high_fiber`, `high_protein`, `low_salt`, `low_sat_fat`, `low_sugar`, `balanced`
- **THEN** MUSS `high_fiber` aktiv sein, wenn Ballaststoffgehalt pro 100g >= 6 g
- **THEN** MUSS `high_protein` aktiv sein, wenn Protein >= 20 % der Energie liefert
- **THEN** MUSS `low_salt` aktiv sein, wenn Salzgehalt pro 100g <= 0,3 g
- **THEN** MUSS `low_sat_fat` aktiv sein, wenn gesaettigte Fettsaeuren pro 100g <= 1,5 g
- **THEN** MUSS `low_sugar` aktiv sein, wenn Zucker pro 100g <= 5 g
- **THEN** MUSS `balanced` aktiv sein, wenn Nutri-Score-Punkte im Bereich [-1, +4] liegen

#### Scenario: Badges im Frontend
- **WHEN** die Gesundheits-Sektion der Rezept-Detailseite gerendert wird und `positive_traits` nicht leer ist
- **THEN** MUSS eine Chip-Reihe oberhalb der Improvements-Liste angezeigt werden
- **THEN** MUSS jeder Chip Icon, deutsche Bezeichnung und gruene Akzentfarbe (Emerald-Palette) haben

#### Scenario: Keine Badges bei leerer Liste
- **WHEN** `positive_traits` leer ist
- **THEN** DARF keine Chip-Reihe und keine leere Ueberschrift gerendert werden

### Requirement: Zutaten-Contribution-Panel im Nutrition-Breakdown
The system SHALL expose per-ingredient contribution data for key nutritional parameters and render them in expandable panels under the nutrition breakdown.

#### Scenario: Contributions im API-Response
- **WHEN** der Client `GET /api/recipes/{id}/nutrition-breakdown/` aufruft
- **THEN** MUSS jedes `RecipeItemNutritionOut` ein Feld `contributions: ContributionOut[]` enthalten
- **THEN** MUSS jede `ContributionOut` die Felder `parameter` (enum), `absolute` (float), `percent_of_recipe` (float 0-100) enthalten
- **THEN** MUSS `absolute` in der Einheit des jeweiligen Parameters angegeben sein (g fuer Naehrstoffe, kJ fuer Energie)

#### Scenario: Panel rendert Top-5 pro Parameter
- **WHEN** ein Nutzer im Nutrition-Breakdown einen Parameter-Block expandiert
- **THEN** MUSS eine Liste der 5 am meisten beitragenden Zutaten (absteigend nach `percent_of_recipe`) gerendert werden
- **THEN** MUSS jede Zeile Zutat-Name, `absolute`-Wert mit Einheit, `percent_of_recipe` und einen kleinen horizontalen Balken enthalten
- **THEN** MUSS bei mehr als 5 beitragenden Zutaten ein Button „+N weitere anzeigen" den Rest einblenden

#### Scenario: Panel rendert nichts bei null-Werten
- **WHEN** alle Zutaten eines Rezepts `percent_of_recipe = 0` fuer einen Parameter haben
- **THEN** MUSS die expandierte Liste eine neutrale Nachricht zeigen

### Requirement: Recipe hints include improvement text
The `RecipeHintMatchOut` schema SHALL include an `improvement_text` field with concrete improvement suggestions. The hint matching logic SHALL support the new vitamin and mineral parameters in addition to existing macronutrient parameters.

#### Scenario: Matched hint includes improvement text
- **WHEN** a recipe triggers a hint for low fibre
- **THEN** the API response SHALL include both the hint name/description and the improvement_text with a concrete suggestion

#### Scenario: Vitamin hint matching
- **WHEN** a recipe has `vitamin_c_mg < 10` per serving and a vitamin_c RecipeHint exists
- **THEN** the system SHALL match the vitamin C hint and return it in the hints response

### Requirement: HealthRule model for traffic-light thresholds
The system SHALL provide a `HealthRule` model that defines configurable thresholds for nutritional traffic-light indicators (green/yellow/red) per nutrient.

#### Scenario: Traffic-light evaluation
- **WHEN** a Recipe's cached nutritional values are evaluated against HealthRules
- **THEN** each nutrient SHALL receive a traffic-light classification (green, yellow, red) based on the configured thresholds
- **THEN** the UI SHALL display the traffic-light indicators alongside nutritional values

### Requirement: Portionsrechner-Daten in Recipe-API
Die Recipe-Detail-API SHALL zusätzliche Daten für den Portionsrechner liefern, einschließlich aller verfügbaren Portionen pro Zutat.

#### Scenario: Recipe-Detail enthält Portions-Informationen
- **WHEN** ein Nutzer `GET /api/recipes/{id}/` oder `GET /api/recipes/by-slug/{slug}/` aufruft
- **THEN** SHALL jedes RecipeItem im Response zusätzlich `ingredient_portions` enthalten: eine Liste aller Portionen der Zutat mit `name`, `weight_g`, `priority`, `is_default`
- **THEN** SHALL jedes RecipeItem `ingredient_density` und `ingredient_viscosity` enthalten

### Requirement: Export-Button auf Rezeptdetailseite
Die Rezeptdetailseite SHALL einen "Zur Einkaufsliste hinzufügen"-Button anzeigen.

#### Scenario: Einkaufsliste aus Rezept erstellen
- **WHEN** ein authentifizierter Nutzer auf der Rezeptdetailseite "Zur Einkaufsliste" klickt
- **THEN** SHALL ein Dialog erscheinen mit der aktuellen Portionszahl aus dem Skalierungsrechner
- **THEN** SHALL der Nutzer die Portionszahl anpassen können
- **THEN** SHALL nach Bestätigung die Shopping-List-API aufgerufen werden
- **THEN** SHALL der Nutzer zur erstellten Einkaufsliste weitergeleitet werden

### Requirement: RecipeCard Metadaten-Anzeige

Die RecipeCard MUSS Content-Typ-spezifische Metadaten prominent anzeigen.

#### Scenario: Metadaten auf RecipeCard
- **WHEN** eine RecipeCard in der Listenansicht gerendert wird
- **THEN** MUSS sie folgende Metadaten als Icon+Text anzeigen: Nutri-Score Badge (A-E, farbig), Rezepttyp (als Label), Zubereitungszeit (Uhr-Icon + Minuten), Schwierigkeit (Stern-Icons), Kosten-Rating (Euro-Icons)
- **THEN** MÜSSEN bis zu 3 Tags als kompakte Chips sichtbar sein

#### Scenario: Kompakte Darstellung bei 5 Spalten
- **WHEN** die RecipeCard bei einer Spaltenbreite von ca. 220px gerendert wird
- **THEN** MÜSSEN Metadaten als Icons mit Kurztext dargestellt werden (z.B. „⏱ 30min" statt „Zubereitungszeit: 30 Minuten")
- **THEN** MUSS der Titel einzeilig mit Textabschnitt (`truncate`) dargestellt werden

### Requirement: Normportionen-Anzeige

Das System MUSS die Portionen-Anzeige auf der Rezept-Detailseite mit einem erklärenden Hinweis versehen und die reine Portionenzahl nicht mehr isoliert darstellen.

#### Scenario: Normportionen-Hinweis anzeigen
- **WHEN** die Rezept-Detailseite angezeigt wird
- **THEN** MUSS anstelle der reinen Portionenzahl ein erklärender Hinweis angezeigt werden: „Dieses Rezept ist berechnet für X Normportion(en). Eine Normportion basiert auf einem 15-jährigen Pfadfinder (PAL 1,5)."
- **THEN** MUSS der PortionScaler weiterhin funktionieren, aber mit dem Kontext-Hinweis

#### Scenario: Portionen-Badge in Kacheln
- **WHEN** ein Rezept in der Listenansicht als Kachel angezeigt wird
- **THEN** MUSS der Portionen-Badge entfernt werden (da ohne Kontext irreführend)

### Requirement: Gewichtsanzeige mit automatischer Einheitenkonvertierung

Das System MUSS große Grammzahlen automatisch in Kilogramm konvertieren.

#### Scenario: Gewicht >= 1000g
- **WHEN** eine Gewichtsangabe >= 1000g angezeigt wird (in Zutatenliste, Einkaufsliste, Nährwertanalyse)
- **THEN** MUSS die Anzeige in Kilogramm erfolgen, gerundet auf eine Dezimalstelle (z.B. 1500g → 1,5 kg, 2300g → 2,3 kg, 1000g → 1 kg)

#### Scenario: Gewicht < 1000g
- **WHEN** eine Gewichtsangabe < 1000g angezeigt wird
- **THEN** MUSS die Anzeige in Gramm erfolgen, ganzzahlig gerundet (z.B. 253.7g → 254 g)

#### Scenario: Sehr kleine Mengen
- **WHEN** eine Gewichtsangabe < 1g angezeigt wird
- **THEN** MUSS die Anzeige in Gramm mit einer Dezimalstelle erfolgen (z.B. 0.5g → 0,5 g)

### Requirement: Autor-Position

Das System MUSS den Autor-Bereich am unteren Ende der Rezept-Detailseite anzeigen.

#### Scenario: Autor unten anzeigen
- **WHEN** die Rezept-Detailseite gerendert wird
- **THEN** MUSS der Autor-Bereich (Name, Avatar, Link) nach der Beschreibung und vor den Kommentaren positioniert sein
- **THEN** MUSS der Autor NICHT mehr in der oberen Info-Box erscheinen

### Requirement: Rezept-Detailseite Header Info-Box

The recipe detail header info box SHALL be rendered only on viewports below 1024px; on larger viewports its content moves into the sidebar. Das System MUSS auf der Rezept-Detailseite oberhalb der Zutatenliste eine kompakte Header-Info-Box rendern, die Nutri-Score und Gesamtkosten anzeigt. Auf Viewports ≥ 1024px MUSS diese Box mittels `lg:hidden` ausgeblendet werden; ihre Inhalte werden stattdessen in der neuen Desktop-Sidebar dargestellt. Auf Viewports < 1024px bleibt die Box wie in Change #1 definiert sichtbar.

#### Scenario: Header-Info-Box auf Mobile
- **WHEN** die Rezept-Detailseite auf einem Viewport < 1024px geladen wird
- **THEN** MUSS die Header-Info-Box mit Nutri-Score-Badge und Gesamtkosten-KPI oberhalb der Zutatenliste sichtbar sein

#### Scenario: Header-Info-Box auf Desktop
- **WHEN** die Rezept-Detailseite auf einem Viewport ≥ 1024px geladen wird
- **THEN** MUSS die Header-Info-Box unsichtbar sein (CSS `lg:hidden`)
- **THEN** MÜSSEN Nutri-Score-Badge und Gesamtkosten-KPI stattdessen in der rechten Sidebar gerendert werden

#### Scenario: Keine Normportionen-Erklärbox
- **WHEN** die Rezept-Detailseite auf irgendeinem Viewport geladen wird
- **THEN** DARF kein erklärender Textblock „Dieses Rezept ist berechnet für X Normportion(en). …" mehr angezeigt werden (unverändert gegenüber Change #1)

#### Scenario: "pro Portion"-Text in KPI-Blöcken
- **WHEN** KPI-Blöcke der Preis-Analyse, Gewichtsanalyse oder Gesundheitsindikatoren gerendert werden
- **THEN** DARF der Zusatz „pro Portion" in diesen Blöcken nicht mehr erscheinen (unverändert gegenüber Change #1)
- **THEN** MUSS der Zusatz „pro Portion" im Makronährstoff-/Nährwert-Breakdown erhalten bleiben (unverändert gegenüber Change #1)

### Requirement: Desktop-Sidebar auf Rezept-Detailseite

The system SHALL render a sticky right sidebar on the recipe detail page for viewports with width ≥ 1024px. Das System MUSS auf der Rezept-Detailseite ab einer Viewport-Breite von 1024px eine rechte Sidebar mit fester Breite rendern, die beim Scrollen sticky bleibt und die wichtigsten Metadaten und Primäraktionen persistent sichtbar hält.

#### Scenario: Sidebar-Layout auf Desktop
- **WHEN** die Rezept-Detailseite auf einem Viewport ≥ 1024px geladen wird
- **THEN** MUSS die Seite in einem zweispaltigen Grid gerendert werden: Hauptinhalt links (flexibel), Sidebar rechts (320px Breite)
- **THEN** MUSS die Sidebar `position: sticky` mit `top: 80px` relativ zum Viewport haben
- **THEN** MUSS die Sidebar bei Inhalten, die länger als der verbleibende Viewport sind, intern scrollbar sein (`max-height: calc(100vh - 5rem); overflow-y: auto`)

#### Scenario: Sidebar-Inhalte
- **WHEN** die Sidebar gerendert wird
- **THEN** MUSS sie in dieser Reihenfolge enthalten: (1) Hero-Metadaten-Block (Rezepttyp-Badge, Autor-Link, Zubereitungszeit, Schwierigkeit), (2) Nutri-Score-Badge A–E, (3) Gesamtkosten-KPI in EUR, (4) kompakter PortionScaler, (5) Primäraktionen-Gruppe („Einkaufsliste erstellen", „Teilen")
- **THEN** MUSS die Hero-Bild-Darstellung in der Hauptspalte verbleiben und nicht in der Sidebar auftauchen

#### Scenario: Sidebar entfällt auf Mobile
- **WHEN** die Rezept-Detailseite auf einem Viewport < 1024px geladen wird
- **THEN** DARF keine rechte Sidebar existieren
- **THEN** MUSS der Seiteninhalt einspaltig gerendert werden

### Requirement: Mobile Sticky-Action-Bar

The system SHALL render a sticky bottom action bar on the recipe detail page for viewports with width < 1024px. Das System MUSS auf Viewports < 1024px eine sticky Bottom-Action-Bar mit zwei Primäraktionen anzeigen, die respektvoll `safe-area-inset-bottom` berücksichtigt und bei aktivem Text-Input ausgeblendet wird.

#### Scenario: Bottom-Bar auf Mobile
- **WHEN** die Rezept-Detailseite auf einem Viewport < 1024px geladen wird
- **THEN** MUSS am unteren Rand eine sticky Bar mit zwei Buttons gerendert werden: „Einkaufsliste" und „Portionen"
- **THEN** MUSS die Bar eine Höhe von 64px haben plus `env(safe-area-inset-bottom)` Padding
- **THEN** MUSS der Hauptinhalt-Container unten so viel Padding haben, dass der letzte Inhalt nicht verdeckt wird

#### Scenario: Klick auf „Einkaufsliste"
- **WHEN** der Nutzer in der Bottom-Bar „Einkaufsliste" antippt
- **THEN** MUSS derselbe Dialog geöffnet werden, der auch vom bisherigen Header-Action ausgelöst wird (Portions-Dialog → Einkaufslisten-Export)

#### Scenario: Klick auf „Portionen"
- **WHEN** der Nutzer in der Bottom-Bar „Portionen" antippt
- **THEN** MUSS ein Bottom-Sheet mit dem PortionScaler geöffnet werden
- **THEN** MUSS die Skalierung live in der Zutatenliste reflektiert werden

#### Scenario: Bottom-Bar bei Text-Input ausblenden
- **WHEN** ein `<textarea>` auf der Seite den Fokus erhält (z.B. Kommentar-Input)
- **THEN** MUSS die Bottom-Bar per CSS-Transform nach unten verschoben werden (`translateY(100%)`) mit Transition
- **WHEN** der Fokus die `<textarea>` verlässt
- **THEN** MUSS die Bottom-Bar zurückkehren

#### Scenario: Bottom-Bar entfällt auf Desktop
- **WHEN** die Rezept-Detailseite auf einem Viewport ≥ 1024px geladen wird
- **THEN** DARF keine Bottom-Action-Bar gerendert werden


---

# Inspi-Score (Apple Rating)

## Requirements

### Requirement: Inspi-Score Berechnung

Das System MUSS für jedes Rezept ein 4-Dimensionen-Rating berechnen, dargestellt als 1-5 Inspi-Köpfe pro Dimension. Die Dimensionen sind: Preis, Gesundheit, Sättigung und Geschmack.

#### Scenario: Preis-Rating berechnen
- **WHEN** das System das Preis-Rating für ein Rezept berechnet
- **THEN** MUSS es den `cached_price_total` des Rezepts mit dem Durchschnittspreis aller Rezepte gleichen `recipe_type` vergleichen
- **THEN** MUSS das Rating 5 Inspi-Köpfe vergeben wenn der Preis im unteren Quartil liegt, 4 Inspi-Köpfe im zweiten Quartil, 3 im dritten, 2 im vierten und 1 wenn über dem 90. Perzentil

#### Scenario: Gesundheits-Rating berechnen
- **WHEN** das System das Gesundheits-Rating berechnet
- **THEN** MUSS es die `cached_nutri_class` des Rezepts direkt in Inspi-Köpfe umwandeln: Klasse 1 (A) = 5 Inspi-Köpfe, Klasse 2 (B) = 4, Klasse 3 (C) = 3, Klasse 4 (D) = 2, Klasse 5 (E) = 1
- **THEN** MUSS bei fehlender Nutri-Klasse `null` zurückgegeben werden

#### Scenario: Sättigungs-Rating berechnen
- **WHEN** das System das Sättigungs-Rating berechnet
- **THEN** MUSS es die Energiedichte pro Portion (`cached_energy_kj / servings`) mit dem DGE-Referenzwert für den Mahlzeitentyp vergleichen
- **THEN** MUSS das Rating 5 Inspi-Köpfe vergeben wenn das Verhältnis zwischen 0.9 und 1.1 liegt (optimal sättigend), abnehmend für Abweichungen in beide Richtungen

#### Scenario: Geschmacks-Rating berechnen
- **WHEN** das System das Geschmacks-Rating berechnet
- **THEN** MUSS es Geschmacksträger analysieren: Fettgehalt (Mundgefühl), Zuckergehalt (Süße), Salzgehalt (Würze) und Ballaststoffe (Komplexität)
- **THEN** MUSS das Rating einen gewichteten Composite-Score aus diesen Faktoren bilden, normalisiert auf 1-5 Inspi-Köpfe

### Requirement: Inspi-Score API-Endpunkt

Das System MUSS einen API-Endpunkt bereitstellen, der den vollständigen Inspi-Score für ein Rezept zurückgibt.

#### Scenario: Score abrufen
- **WHEN** ein GET-Request an `/api/recipes/{recipe_id}/inspi-score/` gesendet wird
- **THEN** MUSS die Response ein JSON-Objekt mit den Feldern `price` (object), `health` (object), `satiety` (object), `taste` (object) und `overall` (object) enthalten
- **THEN** MUSS jedes Dimensions-Objekt die Felder `score` (int 1-5), `label` (string, deutsch) und `details` (string, deutsch) enthalten

#### Scenario: Score bei unvollständigen Daten
- **WHEN** ein Rezept keine gecachten Nährwertdaten hat
- **THEN** MUSS das System für betroffene Dimensionen `score: null` zurückgeben mit einer erklärenden `details`-Nachricht

### Requirement: Inspi-Score Darstellung im Frontend

Das System MUSS den Inspi-Score prominent oben auf der Rezept-Detailseite anzeigen. Als visuelles Symbol MUSS der Inspi-Kopf (favicon.png) verwendet werden.

#### Scenario: Score-Anzeige auf Rezept-Detailseite
- **WHEN** ein User die Rezept-Detailseite öffnet
- **THEN** MUSS unter dem Rezeptbild eine Zeile mit 4 Rating-Boxen angezeigt werden
- **THEN** MUSS jede Box ein Dimensions-Icon, den Dimensionsnamen, die Inspi-Kopf-Anzeige (gefüllt/ausgegraut) und ein kurzes Label zeigen
- **THEN** MÜSSEN gefüllte Inspi-Köpfe das favicon.png als `<img>` Element verwenden
- **THEN** MÜSSEN leere/unerfüllte Positionen das gleiche favicon.png mit `opacity-25 grayscale` CSS-Klassen darstellen

#### Scenario: Tooltip mit Details
- **WHEN** ein User auf eine Rating-Box klickt oder hovert
- **THEN** MUSS ein Tooltip oder Popover die `details`-Erklärung und den Referenzwert-Vergleich anzeigen

#### Scenario: Gesamt-Score Anzeige
- **WHEN** die Score-Komponente gerendert wird
- **THEN** MUSS unterhalb der 4 Dimensionen eine Gesamt-Zeile mit dem Overall-Score in Inspi-Köpfen angezeigt werden

### Requirement: Nutri-Score-Verbesserungsvorschläge

Das System MUSS unter der Gesundheits-Analyse 3 konkrete Vorschläge anzeigen, wie das Rezept einen Nutri-Score-Klasse besser erreichen kann.

#### Scenario: Verbesserungsvorschläge berechnen
- **WHEN** ein GET-Request an `/api/recipes/{recipe_id}/nutri-improvements/` gesendet wird
- **THEN** MUSS das System für jeden Nutri-Score-Parameter simulieren, welche Änderung den Score am meisten verbessert
- **THEN** MUSS es die 3 wirksamsten Parameteränderungen zurückgeben, jeweils mit: Parameter-Name, aktuellem Wert, Zielwert, betroffene Zutaten (die am meisten zu dem Parameter beitragen) und erwarteter neuer Nutri-Score-Klasse

#### Scenario: Rezept hat bereits Nutri-Score A
- **WHEN** ein Rezept bereits Nutri-Score-Klasse A (1) hat
- **THEN** MUSS das System eine leere Liste zurückgeben mit einer Nachricht „Dieses Rezept hat bereits die beste Nutri-Score-Klasse"

#### Scenario: Darstellung im Frontend
- **WHEN** die Gesundheits-Analyse-Sektion auf der Rezept-Detailseite aufgeklappt wird
- **THEN** MÜSSEN die 3 Vorschläge als interaktive Karten angezeigt werden
- **THEN** MUSS jede Karte den Parameter, die Änderungsrichtung (weniger/mehr), die betroffene(n) Zutat(en) und einen „Anwenden"-Button enthalten

### Requirement: Referenzwert-Vergleiche

Das System MUSS alle Nährwertanzeigen im Kontext von DGE-Referenzwerten darstellen.

#### Scenario: Nährwert mit Referenz anzeigen
- **WHEN** ein Nährwert auf der Rezept-Detailseite angezeigt wird
- **THEN** MUSS neben dem absoluten Wert auch der prozentuale Anteil am DGE-Tagesbedarf angezeigt werden (basierend auf der Norm-Person: 15 Jahre, männlich, PAL 1.5)
- **THEN** MUSS die Darstellung farbcodiert sein: grün (≤50% des Tagesbedarfs), gelb (50-80%), rot (>80%) für Nährstoffe die begrenzt werden sollen (Zucker, Salz, ges. Fett) und invertiert für Nährstoffe die ausreichend vorhanden sein sollen (Ballaststoffe, Protein)


---

# Recipe Magic Buttons

## Requirements

### Requirement: Klickbare Verbesserungsvorschläge

Das System MUSS Verbesserungsvorschläge (RecipeHints) als klickbare Elemente darstellen, die eine Detailanalyse öffnen.

#### Scenario: Hint anklicken öffnet Detail-Modal
- **WHEN** ein User auf einen Verbesserungsvorschlag in der Rezept-Detailseite klickt
- **THEN** MUSS ein Modal/Sheet geöffnet werden mit: dem Hinweis-Text, der betroffenen Zutat(en) die am meisten zu dem Problem beitragen, einer konkreten Empfehlung welche Zutat erhöht oder reduziert werden muss, und einem „Anwenden"-Button

#### Scenario: Zutat-Identifikation im Hint-Detail
- **WHEN** das Hint-Detail-Modal geöffnet wird
- **THEN** MUSS das System die Zutaten des Rezepts analysieren und diejenige(n) identifizieren, die am stärksten zum betroffenen Nährwertparameter beitragen
- **THEN** MUSS die Analyse den prozentualen Beitrag jeder relevanten Zutat zum Gesamtwert des Parameters anzeigen

### Requirement: LLM-Zutatentipps

Das System MUSS per LLM (Gemini Flash-Lite) 3 kreative Zutatentipps generieren können, die zu einem bestimmten Verbesserungsziel passen.

#### Scenario: LLM-Vorschläge für einen Hint anfordern
- **WHEN** ein User im Hint-Detail-Modal auf „KI-Vorschläge anfordern" klickt
- **THEN** MUSS ein POST-Request an `/api/recipes/{recipe_id}/suggestions/` gesendet werden mit dem Ziel-Parameter (z.B. „mehr Ballaststoffe")
- **THEN** MUSS die Response 3 Vorschläge enthalten, jeweils mit: Zutatname, empfohlene Menge, Begründung warum diese Zutat zum Rezept passt, und erwartete Nährwert-Verbesserung

#### Scenario: Vorschlag anwenden
- **WHEN** ein User auf „Hinzufügen" bei einem LLM-Vorschlag klickt
- **THEN** MUSS die Zutat zum Frontend-State des modifizierten Rezepts hinzugefügt werden (NICHT zur Datenbank)
- **THEN** MÜSSEN alle Nährwertanzeigen, das Apfel-Rating und die Hints neu berechnet werden basierend auf dem modifizierten Zustand

#### Scenario: LLM-Vorschläge Caching
- **WHEN** LLM-Vorschläge für dasselbe Rezept und denselben Zielparameter innerhalb von 24 Stunden erneut angefordert werden
- **THEN** MUSS das System die gecachte Response zurückgeben

#### Scenario: Rate-Limiting
- **WHEN** ein authentifizierter User mehr als 10 Suggestions-Requests pro Stunde sendet
- **THEN** MUSS das System einen 429-Statuscode zurückgeben mit der Nachricht „Zu viele Anfragen. Bitte warte etwas."
- **WHEN** ein nicht-authentifizierter User Suggestions anfordert
- **THEN** MUSS das System einen 401-Statuscode zurückgeben

### Requirement: Automatische Portions-Normalisierung

Das System MUSS erkennen wenn eine Rezept-Portion zu groß ist und eine automatische Normalisierung anbieten.

#### Scenario: Zu große Portion erkennen
- **WHEN** die Energie pro Portion eines Rezepts mehr als 150% des DGE-Referenzwerts für den Mahlzeitentyp beträgt
- **THEN** MUSS ein Hinweis angezeigt werden: „Diese Portion ist größer als eine Normportion. Auf Normportion skalieren?"

#### Scenario: Normalisierung durchführen
- **WHEN** ein User den „Auf Normportion skalieren"-Button klickt
- **THEN** MÜSSEN alle Zutatmengen gleichmäßig um den Normalisierungsfaktor reduziert werden
- **THEN** MUSS die Änderung nur im Frontend-State erfolgen (NICHT in der Datenbank)
- **THEN** MUSS die Anzahl der Portionen auf 1 gesetzt werden

### Requirement: Frontend-Only Rezeptänderungen

Alle Magic-Button-Anpassungen MÜSSEN ausschließlich im Frontend-State gehalten werden, ohne die Datenbank zu ändern.

#### Scenario: Rezept modifizieren
- **WHEN** ein User eine Magic-Button-Aktion ausführt (Zutat hinzufügen, Menge ändern, Portion normalisieren)
- **THEN** MUSS die Änderung in einem Zustand-Store gespeichert werden
- **THEN** MUSS ein visueller Indikator anzeigen, dass das Rezept modifiziert wurde (z.B. Badge „Modifiziert" oder farblicher Rahmen)
- **THEN** MUSS ein „Zurücksetzen"-Button verfügbar sein, der alle Änderungen rückgängig macht

#### Scenario: Modifiziertes Rezept verlassen
- **WHEN** ein User die Rezept-Detailseite verlässt während Modifikationen vorhanden sind
- **THEN** MUSS eine Bestätigungsdialog angezeigt werden: „Du hast Änderungen am Rezept. Möchtest du sie verwerfen oder als persönliches Rezept speichern?"

#### Scenario: Nährwerte nach Modifikation aktualisieren
- **WHEN** eine Zutat hinzugefügt, entfernt oder in der Menge geändert wird
- **THEN** MÜSSEN alle Frontend-Berechnungen (Nährwerte, Apfel-Rating, Hints) im Frontend basierend auf den modifizierten Daten neu berechnet werden
- **THEN** MUSS dabei die Nährwertdaten der betroffenen Zutaten verwendet werden (per-100g-Werte aus dem Ingredient-Schema)


---

# Recipe Portion Scaling

## Requirements

### Requirement: Normportionen-basierte Rezeptmengen
Alle RecipeItem-Mengen (`quantity`) SHALL immer für exakt 1 Normportion gespeichert werden. Das `servings`-Feld auf Recipe SHALL den Default-Wert 1 haben und als reine Referenz dienen.

#### Scenario: RecipeItem-Mengen für 1 Normportion
- **WHEN** ein RecipeItem erstellt oder bearbeitet wird
- **THEN** SHALL die `quantity` die Menge für 1 Normportion repräsentieren
- **THEN** SHALL die API die Menge unverändert für 1 Portion zurückgeben

#### Scenario: Bestehende Rezepte migrieren
- **WHEN** die Data-Migration ausgeführt wird
- **THEN** SHALL jede RecipeItem.quantity durch das zugehörige Recipe.servings dividiert werden
- **THEN** SHALL Recipe.servings auf 1 gesetzt werden

### Requirement: Interaktiver Portionsrechner
Die Rezeptdetailseite SHALL einen interaktiven Skalierungsrechner anzeigen, mit dem Nutzer die Personenzahl anpassen können. Alle Mengen SHALL in Echtzeit clientseitig skaliert werden.

#### Scenario: Portionsrechner auf Rezeptdetailseite
- **WHEN** ein Nutzer die Rezeptdetailseite aufruft
- **THEN** SHALL ein Portionsrechner mit Slider oder +/- Buttons angezeigt werden
- **THEN** SHALL der Standard-Wert 1 Portion sein
- **THEN** SHALL der Bereich von 1 bis 100 Portionen reichen

#### Scenario: Mengen skalieren bei Portionsänderung
- **WHEN** ein Nutzer die Portionszahl im Rechner ändert (z.B. auf 4)
- **THEN** SHALL jede RecipeItem-Menge mit dem Faktor multipliziert werden (quantity * 4)
- **THEN** SHALL die Anzeige sofort aktualisiert werden (kein API-Call)

#### Scenario: Portionsrechner in MealEvent-Kontext
- **WHEN** ein Rezept im Kontext eines MealEvents angezeigt wird
- **THEN** SHALL der Portionsrechner den MealEvent-Skalierungsfaktor (norm_portions * activity_factor * reserve_factor * meal_item.factor) als Default verwenden

### Requirement: Intelligente Einheiten-Umrechnung
Das System SHALL skalierte Mengen in sinnvolle Einheiten umrechnen mit kontextgerechter Rundung.

#### Scenario: Gramm zu Kilogramm
- **WHEN** eine Menge >= 1000g beträgt
- **THEN** SHALL sie in Kilogramm angezeigt werden (z.B. "1,2 kg" statt "1200 g")

#### Scenario: Milliliter zu Liter
- **WHEN** eine Menge >= 1000ml beträgt
- **THEN** SHALL sie in Liter angezeigt werden (z.B. "1,5 l" statt "1500 ml")

#### Scenario: Sinnvolle Rundung
- **WHEN** eine Menge unter 100g liegt
- **THEN** SHALL auf 5g-Schritte gerundet werden
- **WHEN** eine Menge zwischen 100g und 1000g liegt
- **THEN** SHALL auf 10g-Schritte gerundet werden
- **WHEN** eine Menge über 1000g liegt
- **THEN** SHALL auf 50g-Schritte gerundet werden

#### Scenario: Default-Einheit basierend auf Zutat
- **WHEN** eine Zutat `physical_viscosity` = "solid" hat
- **THEN** SHALL die Primäreinheit Gewicht (g/kg) sein
- **WHEN** eine Zutat `physical_viscosity` = "beverage" hat
- **THEN** SHALL die Primäreinheit Volumen (ml/l) sein

#### Scenario: Umrechnung zwischen Gewicht und Volumen
- **WHEN** eine Zutat `physical_density` gesetzt hat und die Zieleinheit Volumen ist
- **THEN** SHALL die Umrechnung über die Dichte erfolgen: ml = g / density
- **WHEN** eine Zutat keine `physical_density` hat
- **THEN** SHALL keine Umrechnung zwischen g und ml angeboten werden

### Requirement: Natürliche Portionsanzeige
Neben der Gewichts/Volumen-Anzeige SHALL das System natürliche Portionsdarstellungen anzeigen, basierend auf den verfügbaren `Portion`-Einträgen einer Zutat.

#### Scenario: Alle Portionen anzeigen
- **WHEN** eine Zutat in einem Rezept angezeigt wird und die skalierte Menge berechnet ist
- **THEN** SHALL neben der Gewichtsangabe die natürliche Portionsanzeige erscheinen (z.B. "1,2 kg Äpfel (ca. 8 Stück)")
- **THEN** SHALL alle verfügbaren Portionen einer Zutat angezeigt werden können (z.B. "1,2 kg = ca. 8 Stück = ca. 3 Beutel")

#### Scenario: Portions-Priorität bestimmt Anzeige
- **WHEN** eine Zutat mehrere Portionen hat
- **THEN** SHALL die Portion mit `is_default=True` als erste neben der Gewichtsangabe angezeigt werden
- **THEN** SHALL die restlichen Portionen nach `priority` sortiert (höchste zuerst) in einer erweiterten Ansicht verfügbar sein

#### Scenario: Natürliche Portion berechnen
- **WHEN** die skalierte Menge in Gramm bekannt ist und eine Portion `weight_g` hat
- **THEN** SHALL die Anzahl natürlicher Portionen berechnet werden als: `skalierte_menge_g / portion.weight_g`
- **THEN** SHALL das Ergebnis mit "ca." prefixed und sinnvoll gerundet werden (auf 0,5 oder ganze Zahlen)

### Requirement: Portionsanzeige in Einkaufslisten
Einkaufslisten SHALL ebenfalls die natürliche Portionsanzeige unterstützen.

#### Scenario: Natürliche Portionen in Einkaufsliste
- **WHEN** ein Item in einer Einkaufsliste angezeigt wird und die Zutat Portionen hat
- **THEN** SHALL neben der Gewichtsangabe die natürliche Portionsanzeige erscheinen
- **THEN** SHALL die Default-Portion der Zutat verwendet werden

### Requirement: MealEvent-Skalierungsintegration
Der Portionsrechner SHALL sich nahtlos in das bestehende MealEvent-Skalierungssystem integrieren.

#### Scenario: MealEvent Shopping-List mit Skalierung
- **WHEN** eine Einkaufsliste aus einem MealEvent exportiert wird
- **THEN** SHALL der MealEvent-Skalierungsfaktor angewendet werden
- **THEN** SHALL die Einheiten-Umrechnung auf die skalierten Mengen angewendet werden

#### Scenario: Skalierung im MealEvent anpassen
- **WHEN** ein Nutzer auf der MealEvent-Detailseite `norm_portions`, `activity_factor` oder `reserve_factor` ändert
- **THEN** SHALL die Shopping-List-Mengen sofort aktualisiert werden

### Requirement: Portions-Skalierung mit Magic-Button-Integration

Die bestehende Portions-Skalierung MUSS mit dem Magic-Button-System integriert werden, sodass die Normalisierungs-Funktion den gleichen Zustand-Store nutzt.

#### Scenario: Skalierung über PortionScaler
- **WHEN** ein User den PortionScaler nutzt um die Portionenzahl zu ändern
- **THEN** MÜSSEN die Zutatmengen proportional skaliert werden
- **THEN** MUSS die Änderung im gleichen Zustand-Store wie Magic-Button-Änderungen gespeichert werden
- **THEN** MUSS die Skalierung als eigenständige Modification im Änderungs-Log erscheinen

#### Scenario: Skalierung nach Magic-Button-Änderung
- **WHEN** ein User zuerst eine Magic-Button-Änderung (z.B. Zutat hinzufügen) und dann eine Portions-Skalierung vornimmt
- **THEN** MUSS die Skalierung auf den modifizierten Mengen basieren (nicht den Originalmengen)
- **THEN** MUSS das System beide Änderungen korrekt nacheinander anwenden

#### Scenario: Auto-Normalisierung
- **WHEN** das System erkennt, dass eine Portion zu groß ist (>150% DGE-Referenz)
- **THEN** MUSS es den bestehenden PortionScaler nutzen um den Normalisierungsfaktor anzuwenden
- **THEN** MUSS der PortionScaler-Wert auf 1 gesetzt werden nach der Normalisierung


---

# Personal Recipes

## Requirements

### Requirement: Rezept als persönliche Kopie speichern

Das System MUSS es authentifizierten Usern ermöglichen, ein (ggf. modifiziertes) Rezept als persönliche Kopie zu speichern.

#### Scenario: Modifiziertes Rezept speichern
- **WHEN** ein User auf „Als persönliches Rezept speichern" klickt
- **THEN** MUSS ein POST-Request an `/api/recipes/{recipe_id}/fork/` gesendet werden mit den modifizierten RecipeItems
- **THEN** MUSS das Backend eine Kopie des Rezepts erstellen mit `owner=current_user`, `forked_from=original_recipe`, `visibility=private`
- **THEN** MÜSSEN alle RecipeItems des Originals kopiert und mit den modifizierten Mengen/Zutaten überschrieben werden
- **THEN** MUSS der User zur neuen persönlichen Rezeptseite weitergeleitet werden

#### Scenario: Unmodifiziertes Rezept speichern
- **WHEN** ein User ein Rezept ohne Änderungen als persönliches Rezept speichern möchte
- **THEN** MUSS das System eine 1:1-Kopie erstellen mit `forked_from`-Referenz zum Original
- **THEN** MUSS ein Hinweis angezeigt werden: „Rezept wurde als persönliche Kopie gespeichert"

#### Scenario: Nicht-authentifizierter User
- **WHEN** ein nicht-authentifizierter User „Als persönliches Rezept speichern" klickt
- **THEN** MUSS das System zum Login weiterleiten mit Redirect zurück zur Rezeptseite

### Requirement: Persönliche Rezepte Sichtbarkeit

Das Recipe-Modell MUSS um Felder für Ownership und Sichtbarkeit erweitert werden.

#### Scenario: Recipe-Modell-Erweiterung
- **WHEN** ein neues Rezept mit `owner` erstellt wird
- **THEN** MUSS das Rezept die Felder `owner` (FK zu User, nullable), `forked_from` (FK zu Recipe, nullable, self-referential), und `visibility` (CharField: private/group/public, default=private) haben

#### Scenario: Standard-Sichtbarkeit
- **WHEN** ein persönliches Rezept erstellt wird
- **THEN** MUSS die Standard-Sichtbarkeit `private` sein
- **THEN** MUSS das Rezept nur für den Owner sichtbar sein in Listen und Suche

### Requirement: Sichtbarkeit ändern

Das System MUSS es dem Owner ermöglichen, die Sichtbarkeit seines persönlichen Rezepts zu ändern.

#### Scenario: Rezept öffentlich setzen
- **WHEN** ein Owner die Sichtbarkeit auf `public` setzt
- **THEN** MUSS das Rezept den `status=submitted` erhalten (Moderation nötig)
- **THEN** MUSS das Rezept erst nach Freigabe (`status=approved`) für andere User sichtbar sein

#### Scenario: Rezept für Gruppe freigeben
- **WHEN** ein Owner die Sichtbarkeit auf `group` setzt
- **THEN** MUSS das Rezept für alle Mitglieder der Gruppen des Owners sichtbar sein
- **THEN** MUSS kein Moderations-Workflow nötig sein

#### Scenario: Rezept privat setzen
- **WHEN** ein Owner die Sichtbarkeit auf `private` setzt
- **THEN** MUSS das Rezept sofort aus allen Listen und Suchen anderer User verschwinden

### Requirement: Rezept-Kategorisierung und Badges

Das System MUSS Rezepte visuell nach ihrer Herkunft kategorisieren.

#### Scenario: Verified-by-Inspi Badge
- **WHEN** ein Rezept `owner=null` und `status=approved` hat
- **THEN** MUSS ein grüner „Inspi-verifiziert" Badge angezeigt werden (in Listen und Detailseite)

#### Scenario: Community-Rezept Badge
- **WHEN** ein Rezept `owner != null`, `visibility=public` und `status=approved` hat
- **THEN** MUSS ein blauer „Community" Badge angezeigt werden

#### Scenario: Persönliches Rezept Badge
- **WHEN** ein Rezept `owner=current_user` hat
- **THEN** MUSS ein gelber „Mein Rezept" Badge angezeigt werden mit dem Hinweis „Basiert auf [Original-Name]" wenn `forked_from` gesetzt ist

### Requirement: Persönliche Rezepte Liste

Das System MUSS eine eigene Seite für persönliche Rezepte bereitstellen.

#### Scenario: Persönliche Rezepte anzeigen
- **WHEN** ein authentifizierter User `/recipes/my-recipes/` aufruft
- **THEN** MUSS eine paginierte Liste aller Rezepte mit `owner=current_user` angezeigt werden
- **THEN** MUSS die Liste nach `created_at` absteigend sortiert sein

#### Scenario: API-Endpunkt für persönliche Rezepte
- **WHEN** ein GET-Request an `/api/recipes/my-recipes/` gesendet wird
- **THEN** MUSS das System nur Rezepte zurückgeben wo `owner=current_user`
- **THEN** MUSS die Response das Standard-Paginierungsformat verwenden: `{ items, total, page, page_size, total_pages }`

#### Scenario: Nicht-authentifizierter Zugriff
- **WHEN** ein nicht-authentifizierter User `/recipes/my-recipes/` aufruft
- **THEN** MUSS ein 401-Statuscode zurückgegeben werden

### Requirement: Rezept-Filter Erweiterung

Die Rezeptliste MUSS um Filter für Rezept-Herkunft erweitert werden.

#### Scenario: Nach Herkunft filtern
- **WHEN** ein User den Filter „Herkunft" auf der Rezeptliste nutzt
- **THEN** MUSS er zwischen „Alle", „Inspi-verifiziert", „Community" und „Meine Rezepte" wählen können
- **THEN** MUSS der Filter als URL-Parameter `origin` gesetzt werden (Werte: `all`, `verified`, `community`, `mine`)

### Requirement: Cooking Mode für Rezept-Detailseite

The system SHALL provide a fullscreen cooking mode on the recipe detail page activated via URL parameter `mode=cooking`, featuring step-by-step navigation, enlarged typography, and screen wake lock.

#### Scenario: Cooking Mode aktivieren

- **WHEN** die URL `/recipes/{slug}?mode=cooking` geladen wird
- **THEN** MUSS eine Vollbild-Ansicht gerendert werden, die App-Header, Sidebar, Bottom-Action-Bar und Standard-Detailinhalte verbirgt
- **THEN** MUSS die Ansicht zwei Bereiche enthalten: eine Zutatenliste mit aktuellem Skalierungs-Zustand und den aktuellen Zubereitungsschritt in großer Schrift (`text-lg` oder größer)
- **THEN** MUSS ein Exit-Button (X-Icon) oben rechts sichtbar sein

#### Scenario: Schritt-Parsing

- **WHEN** die Markdown-`description` des Rezepts Überschriften der Ebene 2 oder 3 enthält
- **THEN** MUSS der Parser an diesen Überschriften splitten und jeden Abschnitt als eigenen Schritt behandeln
- **WHEN** keine Überschriften vorhanden sind, aber eine nummerierte Liste (Zeilen beginnen mit `1. `, `2. `, …)
- **THEN** MUSS jedes Listenelement ein Schritt sein
- **WHEN** weder Überschriften noch nummerierte Liste vorhanden sind
- **THEN** MUSS der gesamte Markdown-Block als ein einziger Schritt behandelt werden

#### Scenario: Schritt-Navigation

- **WHEN** der Nutzer im Cooking Mode den „Weiter"-Button klickt
- **THEN** MUSS die URL um einen Schritt erhöht werden (`?mode=cooking&step=N+1`) mit `replace: true`
- **WHEN** der Nutzer „Zurück" klickt oder bereits beim letzten Schritt „Weiter" deaktiviert ist
- **THEN** MUSS der Button entsprechend deaktiviert sein
- **WHEN** die URL `?mode=cooking&step=3` direkt aufgerufen wird
- **THEN** MUSS Schritt 3 initial angezeigt werden (falls vorhanden; sonst letzter gültiger Schritt)

#### Scenario: Screen Wake Lock

- **WHEN** der Cooking Mode gemountet wird und `navigator.wakeLock` verfügbar ist
- **THEN** MUSS ein `screen`-Wake-Lock angefordert werden
- **WHEN** der Nutzer den Tab wechselt und zurückkehrt (`visibilitychange` → `visible`)
- **THEN** MUSS der Wake-Lock erneut angefordert werden, falls inzwischen released
- **WHEN** der Cooking Mode unmountet wird
- **THEN** MUSS der Wake-Lock explizit released werden

#### Scenario: Wake Lock nicht verfügbar

- **WHEN** der Browser keine Wake-Lock-API unterstützt
- **THEN** MUSS der Cooking Mode ohne Fehler oder Warnung funktionieren (Bildschirm kann einschlafen)

#### Scenario: Exit aus Cooking Mode

- **WHEN** der Nutzer den Exit-Button klickt oder die `Escape`-Taste drückt
- **THEN** MÜSSEN die URL-Parameter `mode` und `step` entfernt werden
- **THEN** MUSS die normale Rezept-Detailseite erscheinen

#### Scenario: Einstieg aus Sidebar und Bottom-Bar

- **WHEN** der Nutzer in der Desktop-Sidebar den Button „Kochen starten" klickt
- **THEN** MUSS zur URL `?mode=cooking&step=0` navigiert werden
- **WHEN** der Nutzer im Mobile-Overflow-Menu „Kochen" auswählt
- **THEN** MUSS ebenfalls zur URL `?mode=cooking&step=0` navigiert werden

### Requirement: Print-Optimierte Rezept-Ansicht

The system SHALL provide a print-optimized version of the recipe detail page, activatable both via URL parameter `mode=print` (on-screen preview) and through the native `window.print()` flow.

#### Scenario: Print-CSS beim Drucken

- **WHEN** der Nutzer `window.print()` auslöst (via Drucken-Button oder Browser-Shortcut)
- **THEN** MÜSSEN Header, Sidebar, Bottom-Action-Bar, Kommentare, Improvements-Liste, Aktions-Buttons und Hero-Bild in der Druckausgabe ausgeblendet sein
- **THEN** MÜSSEN Titel, kompakte Metadaten (Rezepttyp, Zubereitungszeit, Portionen), Zutatenliste mit aktueller Skalierung, Zubereitungsschritte und Nutri-Score-Buchstabe in schwarz-weiß gedruckt werden
- **THEN** MUSS das Seiten-Layout einspaltig sein mit A4-Margins (`@page { margin: 2cm }`)

#### Scenario: Print-Vorschau am Bildschirm

- **WHEN** die URL `/recipes/{slug}?mode=print` geladen wird
- **THEN** MUSS die Print-CSS-Sicht auch ohne aktiven Druck-Dialog am Bildschirm gerendert werden
- **THEN** MUSS ein „Drucken"-Button am oberen Rand sichtbar sein, der `window.print()` triggert
- **THEN** MUSS ein „Zurück"-Button zur Standard-Detail-Ansicht führen (URL ohne `mode`)

#### Scenario: Zutatenliste respektiert Skalierung

- **WHEN** der Nutzer zuvor den PortionScaler genutzt hat (z.B. auf 8 Portionen)
- **THEN** MUSS die Print-Ansicht die Zutaten für 8 Portionen drucken
- **THEN** MUSS die Portionenzahl in der Metadaten-Zeile gedruckt sein

#### Scenario: Page-Break-Regeln

- **WHEN** die Druckausgabe generiert wird
- **THEN** DARF ein Page-Break nicht innerhalb einer Zutaten-Zeile oder eines Zubereitungsschritts erfolgen (CSS `break-inside: avoid`)
- **THEN** MUSS nach dem Titel-Block kein Page-Break direkt folgen (keine „Waise" auf erster Seite)

#### Scenario: Einstieg aus Sidebar

- **WHEN** der Nutzer in der Desktop-Sidebar den Button „Drucken" klickt
- **THEN** MUSS `window.print()` direkt im aktuellen Modus aufgerufen werden (ohne Umweg über `?mode=print`)
