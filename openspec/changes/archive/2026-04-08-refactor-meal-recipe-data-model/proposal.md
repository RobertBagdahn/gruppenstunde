## Why

Das aktuelle Datenmodell für Mahlzeiten, Rezepte und Zutaten hat unnötige Indirektionen und lange Ketten (MealPlan → Meal → MealItem → Recipe → RecipeItem → Portion → Ingredient → Price). Preis- und Nährwertberechnungen erfordern tiefe Traversierungen, was sowohl die DB-Performance als auch die Wartbarkeit beeinträchtigt. Es fehlt ein Cockpit-artiges Dashboard mit Ampel-Indikatoren auf allen Ebenen (Event, Tag, Mahlzeit, Rezept, Zutat), um Handlungsbedarf bei Preis, Gesundheit und Sättigung sofort sichtbar zu machen.

## What Changes

### Datenmodell-Vereinfachung
- **BREAKING**: `Price`-Model entfernen — nur noch `price_per_kg` direkt auf `Ingredient`
- **BREAKING**: `MealPlan` umbenennen zu `MealEvent` — direkter FK zu `Event`, kein separates Konzept
- **BREAKING**: `Meal` erhält `start_datetime` und `end_datetime` statt `date` + `time_start`/`time_end` — MealDay wird nicht benötigt, Tagesgruppierung wird per Query berechnet
- `IngredientSynonym` (aktuell `IngredientAlias`) bleibt direkt an Ingredient
- `Portion` bleibt als Model mit FK zu `Ingredient` — RecipeItem referenziert optional Portion oder direkt Ingredient+Menge

### Denormalisierte Nährwerte auf Recipe
- Vorberechnete Felder auf `Recipe`: `cached_energy_kj`, `cached_protein_g`, `cached_fat_g`, `cached_carbohydrate_g`, `cached_sugar_g`, `cached_fibre_g`, `cached_salt_g`, `cached_nutri_class`, `cached_price_total`, `cached_at`
- Signal-basierte Invalidierung bei Änderungen an RecipeItem/Ingredient
- Nährwerte je Normportion vorgeladen, keine Laufzeitberechnung nötig

### Normportion-Simulationstool
- DGE-Referenzwerte als statische Python-Daten (Alter × Geschlecht × Aktivität → Kalorien/Nährstoffbedarf)
- Interaktive Graphen für m/w je Altersgruppe mit Aktivitätsfaktor
- Vergleich Ist vs. Soll auf MealEvent/Tag/Meal-Ebene

### Cockpit & Ampel-System
- Konfigurierbare `HealthRule`-Einträge in DB (Parameter, Schwellenwerte, Ampel-Farben)
- Ampel-Indikatoren auf allen Ebenen: MealEvent, Tag (berechnet), Meal, Recipe, Ingredient
- Dimensionen: Preis, Gesundheit (Nutri-Score), Sättigung, Nährstoffbalance
- Automatische Tipps nach festen Regeln (zu viel Zucker → konkreter Vorschlag)

## Capabilities

### New Capabilities
- `meal-cockpit`: Ampel-Dashboard mit Indikatoren auf allen Ebenen (MealEvent, Tag, Meal, Recipe) für Preis, Gesundheit, Sättigung und Nährstoffbalance. Konfigurierbare Regeln in DB. Automatische Tipps und Handlungsempfehlungen.
- `norm-portion-graphs`: Interaktive Graphen für den Normportion-Simulator mit DGE-Referenzwerten nach Alter, Geschlecht und Aktivität. Vergleich Ist vs. Soll über alle Planungsebenen.

### Modified Capabilities
- `meal-plan`: MealPlan wird zu MealEvent, direkter Event-FK, Meal mit Start/End-Datetime statt Date+Time, MealDay entfernt, Tagesberechnung per Query
- `recipe`: Denormalisierte Nährwert-Felder auf Recipe-Model, cached Nutri-Score und Preis
- `ingredient-database`: Price-Model entfernt, nur noch price_per_kg auf Ingredient. Synonyme und Nährwerte direkt an Zutat.
- `supply-base`: Price-Model wird entfernt, Portion bleibt aber mit FK direkt zu Ingredient
- `norm-portion-simulator`: DGE-Referenzwerte als statische Daten statt DB, erweitert um Graphen-Daten

## Impact

### Backend (Django)
- **Apps betroffen**: `planner` (MealPlan→MealEvent, Meal, MealItem), `recipe` (cached fields, RecipeHint), `supply` (Price entfernt, Ingredient vereinfacht), `event` (MealEvent-Integration)
- **Neue Models**: `HealthRule` (in `planner` oder `recipe`)
- **Entfernte Models**: `Price` (supply app)
- **Migrationen**: Destruktiv — Price-Daten in `Ingredient.price_per_kg` konsolidieren, MealPlan→MealEvent umbenennen, Meal-Felder ändern, Recipe-Cache-Felder hinzufügen
- **Services**: `price_service.py` vereinfachen (keine Kaskade mehr), `recipe_checks.py` auf Cache umstellen, neuer `cockpit_service.py`
- **Pydantic-Schemas**: MealPlanSchema→MealEventSchema, MealSchema (datetime statt date+time), RecipeSchema (cached fields), IngredientSchema (ohne Price-Relation), neue CockpitSchema/HealthRuleSchema

### Frontend (React)
- **Zod-Schemas**: Synchron mit Backend-Änderungen (mealPlan.ts→mealEvent.ts, recipe.ts, supply.ts)
- **API-Hooks**: mealPlans.ts refactoren zu mealEvents.ts, recipe-Hooks für cached fields
- **Pages**: MealPlanDetailPage→MealEventDetailPage mit Cockpit-Tab, NormPortionSimulator erweitern
- **Neue Komponenten**: CockpitDashboard, TrafficLightIndicator, NutritionGraphs, HealthTipCard
- **Entfernte Pages/Komponenten**: Keine Seiten entfernt, nur umbenannt/refactored
