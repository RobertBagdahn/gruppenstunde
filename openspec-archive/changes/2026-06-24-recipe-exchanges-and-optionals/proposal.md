## Why

Gruppen mit gemischten Ernährungsweisen (vegan/nicht-vegan, mit/ohne Allergene, scharf/mild) müssen heute für jede Variante eines Gerichts ein separates Rezept anlegen. Das führt zu doppelter Pflege und fehleranfälligen Plänen. Rezepte sollen stattdessen Austausch-Ketten und optionale Zutaten definieren, die beim Einplanen in den Essensplan mit einem Portionen-Split konfiguriert werden.

## What Changes

- `RecipeItem` bekommt ein `is_optional`-Feld: Zutaten können als optional markiert werden
- Neues Modell `RecipeItemExchangeGroup`: Gruppiert RecipeItems einer Austausch-Kette (z.B. Parmesan ↔ Hefeflocken ↔ Cashew-Creme)
- `RecipeItem` bekommt ein `exchange_group`-FK + `exchange_position`-Feld: Position in der Kette (0 = Default/Original)
- Neues Modell `MealItemSplit`: Speichert Portionen-Anteile pro Exchange-Gruppe oder optionaler Zutat für ein MealItem
- Portionen-Split als Anteil (float 0.0–1.0) mit Largest-Remainder-Rundung auf ganze Normportionen (`effective_portions`, ohne Reserve)
- Reserve-Faktor bleibt im bestehenden `meal_scaling` und wird NICHT zusätzlich auf den Split angewendet (keine Doppelskalierung)
- Einkaufslisten-Berechnung aggregiert Zutaten varianten-bewusst (Menge × Anteil pro RecipeItem)
- Nährwertberechnung für MealItems mit Splits: Delta-Ansatz (Rezept-Cache + Korrektur pro getauschtem Glied), live berechnet
- Kochplan-Druck: bestehender `meal-plan-export` (PDF via WeasyPrint) wird erweitert — pro Exchange-Split zwei vollständige Zutatenlisten
- Rezept mit aktiven Splits in Essensplänen ist nicht löschbar (HTTP 409)
- Rezeptansicht zeigt Alternativen in Klammern: `Parmesan (oder: Hefeflocken / Cashew-Creme)`
- Rezept-Editor: "Alternativen"-Button direkt an der Zutat, Kette wächst darunter
- Einplanen-Dialog: erscheint sofort beim Hinzufügen, zeigt alle Exchanges und Optionals
- **BREAKING**: `MealItemVariantAllocation` aus `rezeptvarianten.md` wird nicht gebaut — das Konzept wird durch `MealItemSplit` ersetzt

## Capabilities

### New Capabilities

- `recipe-exchanges`: Exchange-Gruppen an RecipeItems — Autor definiert austauschbare Zutaten-Ketten; Planer wählt Portionen-Split pro Kette beim Einplanen
- `recipe-optional-items`: Optionale Zutaten an RecipeItems — Autor markiert Zutaten als optional; Planer entscheidet beim Einplanen mit Portionen-Split (mit/ohne)
- `meal-item-splits`: Portionen-Split-Modell für MealItems — speichert Anteile (float) pro Exchange-Gruppe oder optionaler Zutat; Constraint: Σ = 1.0 pro Gruppe

### Modified Capabilities

- `recipe`: RecipeItem bekommt `is_optional` und `exchange_group`-FK; neue Felder in Pydantic-Schema und Zod-Schema; Migration erforderlich; Rezept-Löschschutz bei aktiven Splits
- `meal-item-overrides`: Bleibt für ad-hoc Mengen-Korrekturen; `set_meal_item_overrides` wird erweitert — Override auf optionale/Exchange-Zutaten wird abgelehnt (HTTP 400)
- `meal-plan`: Einkaufslisten-Berechnung und Nährwert-Aggregation müssen Splits berücksichtigen; API-Endpunkte für Splits ergänzen
- `meal-plan-export`: PDF-Export rendert Exchange-Splits als getrennte vollständige Zutatenblöcke

## Impact

**Backend (Django Apps):**
- `recipe/models/items.py`: `RecipeItem` erweitert (`is_optional`, `exchange_group`, `exchange_position`) + neues Modell `RecipeItemExchangeGroup`
- `recipe/schemas/items.py`: `RecipeItemOut`/`RecipeItemUpdateIn` erweitern, `RecipeItemExchangeGroup`-Schema
- `recipe/api/items.py`: CRUD für `RecipeItemExchangeGroup`; `update_recipe_item`/`delete_recipe_item` erweitern
- `planner/models/meal_plan.py`: neues Modell `MealItemSplit`
- `planner/schemas/meal_plan.py`: Pydantic-Schemas für `MealItemSplit`
- `planner/api/meal_plan.py`: Split-CRUD; `set_meal_item_overrides` erweitern; Einkaufslisten-/Nährwert-Aggregation
- `supply/services/shopping_service.py`: Einkaufsliste split-aware
- Migrations in `recipe/` und `planner/`
- **Lösch-Schutz:** Django PROTECT auf `MealItemSplit → RecipeItem` (Ketten-Glied nicht löschbar bei aktiven Splits) UND explizite API-Prüfung bei Rezept-Löschung (HTTP 409, da `MealItem → recipe` CASCADE den PROTECT sonst umgeht)

**Frontend (React, `frontend-food/`):**
- Zod-Schemas synchron zu Pydantic (1:1)
- TanStack Query Hooks für Exchange-CRUD und Split-CRUD
- Rezept-Editor: Alternativen-Button an RecipeItem
- Rezeptansicht: Alternativen in Klammern
- Einplanen-Dialog: Split-Konfiguration beim Hinzufügen
- Kochplan-Druckversion: zwei vollständige Blöcke pro Exchange-Split

**Keine Auswirkung auf:**
- Auth, Events, Packlisten, Heimabend-Planung
- `MealItem.factor` und `MealPlan.scaling_factor` (bleiben unverändert; Split arbeitet orthogonal dazu)

**Berührt, aber nicht ersetzt:**
- `MealItemOverride`-Modell selbst unverändert, aber `set_meal_item_overrides` bekommt Validierung
- `fork_recipe` wird erweitert (kopiert Exchanges/Optionals mit)
