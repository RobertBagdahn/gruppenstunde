## Why

Gruppen mit gemischten Ernährungsweisen (vegan/nicht-vegan, mit/ohne Allergene, scharf/mild) müssen heute für jede Variante eines Gerichts ein separates Rezept anlegen. Das führt zu doppelter Pflege und fehleranfälligen Plänen. Rezepte sollen stattdessen Austausch-Ketten und optionale Zutaten definieren, die beim Einplanen in den Essensplan mit einem Portionen-Split konfiguriert werden.

## What Changes

- `RecipeItem` bekommt ein `is_optional`-Feld: Zutaten können als optional markiert werden
- Neues Modell `RecipeItemExchangeGroup`: Gruppiert RecipeItems einer Austausch-Kette (z.B. Parmesan ↔ Hefeflocken ↔ Cashew-Creme)
- `RecipeItem` bekommt ein `exchange_group`-FK + `exchange_position`-Feld: Position in der Kette (0 = Default/Original)
- Neues Modell `MealItemSplit`: Speichert Portionen-Anteile pro Exchange-Gruppe oder optionaler Zutat für ein MealItem
- Portionen-Split als Anteil (float 0.0–1.0) mit Largest-Remainder-Rundung auf ganze Normportionen
- Reserve-Faktor wird proportional auf alle Split-Anteile angewendet
- Einkaufslisten-Berechnung aggregiert Zutaten varianten-bewusst (Menge × Portionen pro Anteil)
- Nährwertberechnung für MealItems mit Splits: gewichteter Durchschnitt, live berechnet (kein Cache)
- Kochplan-Druckversion (FEAT-019) zeigt pro Exchange-Split zwei vollständige Zutatenlisten
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

- `recipe`: RecipeItem bekommt `is_optional` und `exchange_group`-FK; neue Felder in Pydantic-Schema und Zod-Schema; Migration erforderlich
- `meal-item-overrides`: Bleibt für ad-hoc Mengen-Korrekturen; wird nicht ersetzt; klare Abgrenzung zu MealItemSplit im UI
- `meal-plan`: Einkaufslisten-Berechnung und Nährwert-Aggregation müssen Splits berücksichtigen; API-Endpunkte für Splits ergänzen

## Impact

**Backend (Django Apps):**
- `recipe/models/`: `RecipeItem` + neue Modelle `RecipeItemExchangeGroup`, `MealItemSplit`
- `recipe/schemas/`: Pydantic-Schemas für `RecipeItem`, `RecipeItemExchangeGroup`
- `planner/models/`: `MealItemSplit`-Modell
- `planner/schemas/`: Pydantic-Schemas für `MealItemSplit`
- `planner/api/`: Endpunkte für CRUD auf `MealItemSplit`, angepasste Einkaufslisten- und Nährwertberechnung
- `recipe/api/`: Endpunkte für CRUD auf `RecipeItemExchangeGroup`
- Migrations in `recipe/` und `planner/`
- Django PROTECT auf `MealItemSplit → RecipeItem` (Ketten-Glied kann nicht gelöscht werden, solange aktive Splits existieren)

**Frontend (React, `frontend-food/`):**
- Zod-Schemas synchron zu Pydantic (1:1)
- TanStack Query Hooks für Exchange-CRUD und Split-CRUD
- Rezept-Editor: Alternativen-Button an RecipeItem
- Rezeptansicht: Alternativen in Klammern
- Einplanen-Dialog: Split-Konfiguration beim Hinzufügen
- Kochplan-Druckversion: zwei vollständige Blöcke pro Exchange-Split

**Keine Auswirkung auf:**
- `MealItemOverride` (bleibt unverändert)
- `Recipe.forked_from` (Fork kopiert Exchanges vollständig mit)
- Auth, Events, Packlisten, Heimabend-Planung
