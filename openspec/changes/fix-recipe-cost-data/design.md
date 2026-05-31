## Context

Die Kostenberechnung im Essensplan zeigt fehlerhafte Werte wegen schlechter Legacy-Daten. Kartoffelsuppe kostet angeblich 305,79 € für 18 Personen, weil:
1. `recipe.servings = 1` (Skalierung 18× statt ~4×)
2. `quantity = 4680` für Öl mit `portion.weight_g = 1` (Legacy-Import-Fehler)
3. Die meisten Zutaten haben kein `price_per_kg` → "–" in der UI

Betroffene Dateien:
- `backend/recipe/models.py` — Recipe.servings, RecipeItem.quantity
- `backend/supply/models/ingredient.py` — Ingredient.price_per_kg
- `backend/supply/services/price_service.py` — Preisberechnung
- `frontend-food/src/pages/planning/CostDashboard.tsx` — Kostenanzeige

## Goals / Non-Goals

**Goals:**
- Fehlerhafte Rezeptmengen identifizieren und korrigieren (lokal + Prod)
- Fehlende `price_per_kg`-Werte für aktiv genutzte Zutaten ergänzen
- UX der Kostenanzeige verbessern: klar kommunizieren wenn Preise fehlen

**Non-Goals:**
- Automatischer Preis-Import aus externen Quellen (Supermarkt-APIs)
- Änderung der Kostenberechnungs-Logik selbst (die Formel ist korrekt)
- Neue API-Endpunkte oder Schema-Änderungen

## Decisions

### 1. Management Command `validate_recipe_data` statt manueller Fixes

**Rationale**: Reproduzierbar auf lokal und Prod ausführbar, dokumentiert was gefixt wurde.

**Ansatz**:
- Heuristiken für unrealistische Daten: `quantity * portion.weight_g > 5000g` pro Person (für `servings=1` Rezepte)
- Dry-Run-Modus (default) zeigt Probleme, `--fix` korrigiert
- Logging was geändert wurde

**Alternativen verworfen**:
- Manuelles SQL: Nicht reproduzierbar, fehleranfällig
- Data Migration: Zu starr, läuft nur einmal

### 2. Bestehenden `estimate_ingredient_prices` Command nutzen/erweitern

**Rationale**: Es gibt bereits `backend/supply/management/commands/estimate_ingredient_prices.py`. Diesen erweitern statt neu schreiben.

### 3. Frontend: Coverage-Indikator statt "–"

**Rationale**: Die API liefert bereits `priced_ingredients` und `total_ingredients`. Das Frontend muss nur besser damit umgehen.

**Ansatz**:
- Rezepte ohne Preise: "Keine Preise" in grauer Schrift statt "–"
- Summary-Cards: Hinweis "X von Y Zutaten mit Preis" wenn Coverage < 100%
- Tagesübersicht: "unvollständig" statt "0,00 €" wenn Preise teilweise fehlen

### 4. Prod-Fix via Cloud Run Job

**Rationale**: Management Command direkt auf Prod-DB ausführen via `gcloud run jobs`.

## Risks / Trade-offs

- **[Daten unwiederbringlich falsch gefixt]** → Dry-Run + Logging + vorheriges DB-Backup
- **[Heuristik korrigiert korrekte Daten]** → Konservative Schwellenwerte, nur offensichtliche Ausreißer
- **[Prod-DB Zugriff]** → Bestehende Cloud Run Job Infrastruktur nutzen, kein direkter DB-Zugriff
