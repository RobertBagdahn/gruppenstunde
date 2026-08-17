## Why

Nach Changes #1–#3 ist die Gesundheits-Sektion strukturell klar, aber inhaltlich einseitig negativ: Sie zeigt, **was schlecht ist** (Improvements, rote Ampeln), aber nicht **was gut ist**. Ein Rezept mit viel Ballaststoffen, hohem Protein-Anteil und niedrigem gesättigten Fett wird nicht explizit gelobt — positive Aspekte gehen im reinen Nutri-Score-Badge unter.

Gleichzeitig fehlt Transparenz darüber, **welche Zutaten welchen Parameter dominieren**. Der Improvements-Endpoint (Change #2) liefert bereits „Top-3-beitragende-Zutaten pro Vorschlag", aber diese Info bleibt innerhalb der Verbesserungs-Karten. Für positive Parameter (z.B. „Warum ist das Rezept ballaststoffreich?") existiert keine analoge Sichtbarkeit.

Ziel: Zwei komplementäre Features zur Gesundheits-Sektion:
1. **Health-Badges** für positive Eigenschaften (ballaststoffreich, eiweißreich, salzarm, fettarm, ausgewogen)
2. **Zutaten-Contribution-Panel**: Pro Nutri-Parameter eine expandable Liste mit Top-beitragenden Zutaten

## What Changes

### Positive Health-Badges
- Neue Badge-Kategorie: `positive_traits` — berechnet auf Basis der gecachten Nährwerte
- Badges: `high_fiber` (≥6g/100g), `high_protein` (≥20% Energie aus Protein), `low_salt` (<1g/100g), `low_sat_fat` (<1,5g/100g), `low_sugar` (<5g/100g), `balanced` (alle Nutri-Punkte in mittlerem Bereich)
- Thresholds aus DGE-Empfehlungen, hardcoded im Service (nicht admin-konfigurierbar, weil Fakten-basiert)
- Rendern als Chip-Reihe in Gesundheits-Sektion, grüner Akzent, Icon + deutsche Bezeichnung

### Zutaten-Contribution-Panel
- Erweiterung des bestehenden Nutrition-Breakdown: Pro Makronährstoff (Energie, Protein, Fett, Kohlenhydrate, Zucker, Salz, Ballaststoffe, gesättigte Fette) eine expandable Section
- Beim Expand: Ranked Liste der Zutaten, die am meisten zu diesem Parameter beitragen (sortiert nach `contribution_g` bzw. `contribution_kJ` desc)
- Jede Zeile: Zutat-Name, absolute Menge, prozentualer Anteil am Rezept-Gesamtwert für diesen Parameter, kleiner Balken zur Visualisierung
- Limit: Top-5 Zutaten pro Parameter, Rest in „+N weitere" Toggle

### API
- Response von `GET /api/recipes/{id}/nutrition-breakdown/` wird erweitert:
  - Neues Feld `positive_traits: string[]` (Enum-Keys)
  - Bestehendes `items`-Array pro RecipeItem hat bereits Micro-Nutrient-Daten (siehe bestehender Requirement „Extended nutrition breakdown with DGE coverage"); wird um `contributions: { parameter: string, absolute: float, percent_of_recipe: float }[]` pro Zutat erweitert — so kann Frontend die Ranking-Listen lokal berechnen ohne zusätzlichen Roundtrip

### Alternativer Ansatz (verworfen)
- Separater Endpoint `/contributions/` → zusätzliche Requests, während die Daten bereits beim Breakdown vorliegen

## Capabilities

### Modified Capabilities
- `recipe`: Requirement „Extended nutrition breakdown with DGE coverage" wird erweitert (zusätzliche `contributions`-Felder pro Item, neues `positive_traits`-Feld auf Top-Level). Neue Requirements für „Positive Health-Badges" und „Zutaten-Contribution-Panel".

## Impact

### Abhängigkeiten
- **Blockiert durch**: Changes #1, #2, #3. Insbesondere #3, weil der Sidebar-Umbau definiert, wo welche Inhalte leben — Positive Badges werden in der Gesundheits-Sektion der Hauptspalte gerendert, nicht in der Sidebar.

### Betroffene Backend-Dateien
- `backend/recipe/services/nutrition_breakdown_service.py` (bzw. bestehende Service-Datei) — Berechnung von `positive_traits` und `contributions`
- `backend/recipe/schemas/` — `RecipeNutritionBreakdownOut` erweitern um `positive_traits: list[str]`; `RecipeItemNutritionOut` erweitern um `contributions: list[ContributionOut]`; neues `ContributionOut`-Schema
- `backend/recipe/api/` — Endpoint liefert erweiterte Response; keine neue Route
- `backend/recipe/tests/` — neue Tests für Trait-Erkennung und Contribution-Berechnung

### Betroffene Frontend-Dateien
- `frontend/src/components/recipe/PositiveTraitsBadges.tsx` — **neu**
- `frontend/src/components/recipe/NutritionContributionPanel.tsx` — **neu**
- `frontend/src/pages/recipes/RecipeDetailPage.tsx` — Badges und Contribution-Panel in Gesundheits-Sektion einbinden
- `frontend/src/schemas/recipe.ts` — Zod-Schemas erweitern synchron zu Pydantic

### Keine Migrations
- Alle neuen Felder sind berechnet aus bestehenden gecachten Nährwerten.

### Performance
- Contribution-Berechnung ist O(items × parameters) — bei typisch 10 Items × 8 Parameter = 80 Ops, vernachlässigbar. Keine neuen DB-Queries.
