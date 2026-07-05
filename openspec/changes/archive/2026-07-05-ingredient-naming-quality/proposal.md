## Why

Beim Anlegen und KI-gestützten Import von Zutaten entstehen systematisch unsaubere Stammdaten: Generische Namen wie „Nudeln" oder „Pfeffer" werden als eigenständige Zutaten gespeichert, Salz und Pfeffer werden pauschal weggelassen statt konkretisiert, und Singular/Plural-Varianten („Zwiebel" vs. „Zwiebeln") werden beim Matching nicht als dieselbe Zutat erkannt. Das führt zu Duplikaten, fehlenden Nährwerten und falscher Einkaufsplanung. Diese Punkte stammen direkt aus dem Stakeholder-Feedback (Cluster „KI & Import").

## What Changes

- **Generische Synonyme als eigenes Alias-Konzept** — `IngredientAlias` erhält ein `is_generic`-Flag. Generische Aliase (z.B. „Pfeffer", „Salz", „Nudeln") dürfen an **mehreren** konkreten Zutaten gleichzeitig hängen; echte (nicht-generische) Synonyme bleiben pro Name eindeutig. **BREAKING** für die bisherige Eindeutigkeits-Constraint auf `IngredientAlias`.
- **„Zu generisch"-Warnung beim Anlegen** — Beim manuellen Erstellen einer Zutat (Create-Stepper) und im Import-Review-Schritt wird gewarnt, wenn der eingegebene Name exakt einem generischen Begriff entspricht. Der Nutzer wird aufgefordert zu konkretisieren (z.B. „Fusilli trocken" statt „Nudeln").
- **Singular/Plural-robustes Matching** — Zutaten-Matching und Duplikat-Erkennung nutzen deutsches Stemming, sodass „Zwiebel" und „Zwiebeln" (auch unregelmäßige Fälle wie „Apfel"/„Äpfel") als dieselbe Zutat erkannt werden.
- **Konkretisierender Import-Prompt** — Der URL-Import-Prompt lässt Salz/Pfeffer/Wasser nicht mehr pauschal weg, sondern **konkretisiert** sie (z.B. „Salz" → „Jodsalz", „Pfeffer" → „Schwarzer Pfeffer gemahlen") und importiert sie regulär (zählen zu Nährwerten und Einkaufsliste). Jede Zutat wird einzeln und spezifisch verlangt.
- **Fallback im Import-Review** — Liefert die KI trotz Prompt einen generischen Namen, greift dieselbe „zu generisch"-Warnung im Review-Schritt, sodass der Nutzer eine konkrete Zutat wählen kann.

## Capabilities

### New Capabilities
- `ingredient-generic-aliases`: Generische, mehrfach verwendbare Aliase auf Zutaten (`is_generic`-Flag), inkl. Verwaltung und Verwendung beim Matching.
- `ingredient-name-validation`: „Zu generisch"-Erkennung und Warnung beim Anlegen/Importieren von Zutaten, basierend auf der Liste generischer Begriffe.
- `ingredient-plural-matching`: Singular/Plural-robustes Matching und Duplikat-Erkennung via deutsches Stemming.
- `ingredient-import-concretization`: Konkretisierung von Grundzutaten (Salz/Pfeffer/Wasser) beim KI-Import statt pauschalem Weglassen; jede Zutat einzeln und spezifisch.

### Modified Capabilities
<!-- Keine bestehende Capability ändert ihre Anforderungen auf Spec-Ebene; das Import-Verhalten wird als neue Capability `ingredient-import-concretization` erfasst. -->
- (keine)

## Impact

- **Backend-Apps**: `supply` (Modell `IngredientAlias`, Services `fuzzy_match`, Matching/Dedup, neue Stemming-Utility, Liste generischer Begriffe), `recipe` (Service `url_import_service`, `ai_ingredients_service`).
- **Frontend-Pages**: `frontend-food` — Create-Stepper (`CreateIngredientPage`), Import-Review (`RecipeImportPage`), ggf. Inline-Zutaten-Editor.
- **Pydantic-Schemas**: `supply/schemas/ingredients.py` (Alias mit `is_generic`, Validierungs-/Warn-Feld in Create-/Suggest-/Import-Responses).
- **Zod-Schemas**: `frontend-food/src/schemas/supply.ts` (1:1-Sync für `is_generic` und Warn-Felder).
- **Migration**: Neue Migration in `supply` für `IngredientAlias.is_generic` und Anpassung der Unique-Constraint (eindeutig nur für nicht-generische Aliase).
- **Dependency**: Neues Python-Paket für deutsches Stemming (Snowball/germalemma) in `backend/pyproject.toml`.
- **Daten**: Seed/Datenpflege einer initialen Liste generischer Begriffe (Salz, Pfeffer, Nudeln, …).
