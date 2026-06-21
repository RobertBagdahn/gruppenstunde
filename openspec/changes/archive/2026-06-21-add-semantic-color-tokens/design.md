## Context

Aktuell verwendet das Food Frontend 33+ hartcodierte Tailwind-Farbklassen (`bg-yellow-50`, `text-emerald-700`, `bg-amber-500`, etc.) obwohl `frontend-food/AGENTS.md` dies verbietet. Die `index.css` definiert nur `--primary` (grün), `--accent` (orange) und 5 Chart-Farben — aber keine semantischen Status-Token. Entwickler greifen daher zu rohen Tailwind-Palettenfarben.

Parallel ist der `servings`→`portions` Rename aus `unify-portions-vocabulary` nicht im Frontend-Food migriert. Betroffene Dateien überschneiden sich mit dem geplanten Rezept-Layout-Refactoring.

## Goals / Non-Goals

**Goals:**
- 4 neue semantische HSL-Token in `index.css`: `--success`, `--warning`, `--danger`, `--info`
- Tailwind-Config erweitern: `success`, `warning`, `danger`, `info` als Farb-Utilities
- `NUTRI_SCORE_COLORS` von 3 Kopien auf 1 Quelle in `@/schemas/supply` konsolidieren, Nutzung neuer Token
- Alle hardcodierten Farben in RecipeDetailPage, RecipeMetaCard, PortionScaler, RecipeRulesBox, HealthIndicator, NutrientCard, PriceRow durch Token ersetzen
- `servings`→`portions` in Schema, Komponenten, Hooks, Store umbenennen
- Styleguide unter `/styleguide` aktualisieren

**Non-Goals:**
- Dark Mode (separates Thema)
- Layout-Änderungen an der Rezept-Detailseite (kommt in Change 2)
- Backend-Änderungen (nur Frontend-Tokens + Rename)
- Neue Komponenten

## Decisions

### 1. Token-Werte an bestehendes Theme anpassen
- `--success`: `142 76% 36%` (identisch mit `--primary` — grün)
- `--warning`: `38 92% 50%` (identisch mit `--accent` — orange)
- `--danger`: `0 84% 60%` (identisch mit `--destructive` — rot)
- `--info`: `201 96% 32%` (identisch mit `--chart-3` — blau)

  **Rationale**: Keine neuen Farben einführen. Die semantischen Token sind Aliase für bereits existierende HSL-Werte. Entwickler nutzen dann `bg-success` statt `bg-primary`, was semantisch klarer ist und zukünftige Theme-Anpassungen erlaubt.

### 2. Tailwind-Registrierung als Referenz (nicht hardcoded)
  Die Tailwind-Config referenziert die HSL-Variablen via `hsl(var(--success))` statt festen Werten:
  ```ts
  success: { DEFAULT: 'hsl(var(--success))', foreground: 'white' },
  ```
  **Rationale**: Theme-Änderungen nur in `index.css`, keine Config-Änderung nötig.

### 3. `NUTRI_SCORE_COLORS` bleibt in `supply.ts`, nutzt Token
  Der Mapping bleibt in `@/schemas/supply` als einzige Quelle. Die Farb-Strings wechseln von `bg-green-600` zu `bg-success`, von `bg-lime-500`/`bg-yellow-400`/`bg-orange-500`/`bg-red-600` zu `bg-warning`/`bg-danger` abgestuft. Die Nutri-Score-Grenzen: A → success, B → warning, C/D/E → danger.

### 4. `servings`→`portions` als reines Frontend-Rename
  Backend-seitig ist der Rename bereits erfolgt (via `unify-portions-vocabulary` Change). Im Frontend-Food werden umbenannt:
  - `recipe.ts` Schema: `servings` → `portions`
  - `RecipeDetailPage.tsx`: alle `servings`-Vorkommen
  - `IngredientList.tsx`: prop `servings` → `portions`
  - `useRecipeModificationStore`: `modifiedServings` → `modifiedPortions`
  - API-Hooks: `useRecipeBySlug` etc. (wenn sie `servings` im Payload nutzen)
  - `PortionScaler.tsx`: `defaultServings` → `defaultPortions`
  - `RecipeSidebar.tsx`, `RecipeMetaCard.tsx`: entsprechende Props

### 5. Styleguide-Update im Change enthalten
  Die `/styleguide`-Page wird um eine Sektion "Semantische Status-Farben" erweitert, die die 4 neuen Token mit Beispiel-Komponenten demonstriert.

## Risks / Trade-offs

- **Token = Aliase**: Da `--success` identisch mit `--primary` und `--warning` identisch mit `--accent` ist, ändert sich visuell nichts. Der Wert liegt in der semantischen Klarheit und der Basis für zukünftige Theme-Anpassungen.
- **Risiko unvollständiger Ersetzung**: Bei 33+ Vorkommen können einzelne hartcodierte Farben übersehen werden. → Alle `bg-(farbe)-[0-9]` und `text-(farbe)-[0-9]` in recipe-Komponenten per grep validieren.
- **Kein Dark Mode geplant**: Die Token-Werte sind aktuell Light-Mode-optimiert. Dark Mode würde separate `@media (prefers-color-scheme: dark)` Blöcke erfordern — explizit Non-Goal.
