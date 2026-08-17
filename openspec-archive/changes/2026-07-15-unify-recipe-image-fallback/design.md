## Context

Rezeptbilder werden im Food-Frontend (`frontend-food/`) an mindestens 11
Stellen gerendert. Backendseitig gibt es dafür drei verschiedene Feldnamen
für dasselbe Konzept (`recipe.image.url`):

| Feldname | Schema | Verwendungsort (Frontend) |
|---|---|---|
| `image_url` | `ContentListOut`/`RecipeListOut` (generischer Content-Layer, `backend/content/schemas/base.py`) | `RecipeCard`, `RecipeTableRow`, `IngredientDetailPage.RecipesSection`, `ProfilePage`, `RecipeImportPage` |
| `recipe_image` | `MealItemOut`/`CookingScheduleRecipeBlockOut` (`backend/planner/schemas/meal_plan.py`) | `MealSlot.tsx` (×2) |
| `image` | Vier `response=dict`-Endpunkte ohne Pydantic-Schema (`backend/planner/api/meal_plan.py`: `popular_recipes`, `recently_used_recipes`, `search_recipes`, `intelligent_suggestions`) | `RecipePreviewInline`, `RecipePreviewDialog`, Recipe-Suche im Meal-Planner |

Alle drei Felder sind **live berechnete Resolver-Werte** aus
`recipe.image.url` — keine Denormalisierung, keine DB-Migration betroffen.
Zusätzlich existieren drei unterschiedliche Fallback-Strategien im Frontend
(Platzhalterbild `/images/inspi_cook.png`, Icon-in-Box, kein Fallback), was
zu inkonsistentem UX und potenziell kaputten Bild-Icons führt.

## Goals / Non-Goals

**Goals:**
- Ein einziges Feld `image_url` für das Rezeptbild in allen API-Responses, die ein Rezept (oder ein rezeptbezogenes Objekt) zurückgeben.
- Eine einzige Frontend-Komponente (`RecipeThumbnail`) für Bild + Fallback, genutzt von allen rezeptbild-rendernden Stellen im Food-Frontend.
- Die vier `response=dict`-Endpunkte in `planner/api/meal_plan.py` bekommen echte Pydantic-Schemas (Type-Safety-Prinzip aus AGENTS.md).
- Konsistenter Fallback (`/images/inspi_cook.png`) überall dort, wo aktuell kein Fallback existiert.
- `IngredientDetailPage.RecipesSection` nutzt die bestehende `RecipeCard`-Komponente statt einer eigenen Karten-Implementierung.

**Non-Goals:**
- Kein Umbau des Haupt-Frontends (`frontend/`) — dort existiert laut AGENTS.md kein Food-Code.
- Keine Änderung an der Bild-Upload-Pipeline, WebP-Konvertierung oder Speicherlogik (Google Cloud Storage) — nur an der Namensgebung des Response-Felds und dessen Frontend-Darstellung.
- Keine Vereinheitlichung weiterer Felder in den vier `dict`-Endpunkten über das Bild hinaus (z.B. `recipe_badge`, `price_per_serving` bleiben unverändert, auch wenn sie ebenfalls dupliziert vorkommen) — das wäre ein separates Refactoring.
- Keine Änderung der visuellen Aspect-Ratios/Größen der bestehenden Komponenten (`RecipeCard` bleibt `aspect-square`, `RecipeTableRow` bleibt `w-12 h-12` etc.) — `RecipeThumbnail` bildet diese Varianten nur ab, führt keine neue Optik ein.

## Decisions

### 1. `RecipeThumbnail` als variantenfähige Komponente statt fixer Größe

`RecipeThumbnail` bekommt Props `imageUrl: string | null | undefined`,
`title: string`, `size: 'xs' | 'sm' | 'md' | 'lg' | 'full'` (mapped auf
bestehende Tailwind-Klassen: `xs` → `w-10 h-10` (MealSlot), `sm` → `w-12 h-12`
(RecipeTableRow) / `w-16 h-16` (ProfilePage), `md` → `aspect-square`
(RecipeCard), `full` → `w-full max-h-[200px]`/`max-h-64` (Preview-Dialoge,
Import-Vorschau)) und optional `aspectRatio: 'square' | '16/9' | '4/3'`.

**Alternative verworfen:** Eine Komponente mit fixer Größe und mehreren
separaten Komponenten (`RecipeThumbnailSmall`, `RecipeThumbnailLarge`) —
verworfen, da das die gleiche Duplizierung nur auf Komponentenebene statt
Inline-JSX verschiebt.

Fallback ist immer `/images/inspi_cook.png` mit `object-contain p-4
bg-muted/30` (analog bestehendem `RecipeCard`-Verhalten), echtes Bild nutzt
`object-cover`. `loading="lazy"` ist Default, per Prop `eager?: boolean`
abschaltbar für above-the-fold-Fälle (z.B. `RecipePreviewDialog`).

### 2. Backend-Feldnamen: einheitlich `image_url`, auch wo es eine Präfix-Konvention bricht

`MealItemOut`/`CookingScheduleRecipeBlockOut` führen aktuell `recipe_title`,
`recipe_slug`, `image_url`, `ingredient_name`, `ingredient_slug`. Um ein
App-weit einziges Bildfeld zu erreichen, wird `recipe_image` zu `image_url`.

**Alternative verworfen:** `recipe_image` beibehalten (Konsistenz mit dem
lokalen Präfix-Schema) — verworfen auf Wunsch, da App-weite Konsistenz für
ein neu zu bauendes `RecipeThumbnail` schwerer wiegt als die lokale
Präfix-Symmetrie in einem einzelnen Schema. Das Risiko (Verwechslung mit
einem potenziellen künftigen `ingredient_image`) wird als gering
eingeschätzt, da `MealItem` aktuell kein Ingredient-Bild führt und `image_url`
im Kontext von `MealItemOut` eindeutig auf das verknüpfte Rezept verweist
(es gibt kein anderes Bild-Feld in diesem Schema).

### 3. Vier `dict`-Endpunkte bekommen dedizierte Pydantic-Schemas

Statt eines gemeinsamen generischen `RecipeSearchItemOut` für alle vier
Endpunkte (`popular_recipes`, `recently_used_recipes`, `search_recipes`,
`intelligent_suggestions`) werden **separate, endpunktspezifische Schemas**
erstellt, da die zurückgegebenen Felder pro Endpunkt leicht variieren (z.B.
`recently_used_recipes` liefert zusätzlich `slug` und `nutritional_tags`,
`popular_recipes` liefert `personal`/`community`-Split ohne `slug`).

**Alternative verworfen:** Ein gemeinsames Schema mit lauter optionalen
Feldern — verworfen, da das die Typsicherheit untergräbt (Frontend könnte
nicht mehr verlässlich wissen, welche Felder tatsächlich vorhanden sind) und
gegen das Prinzip "kein unnötiges Optional" verstößt.

Alle vier Schemas erhalten konsistent `image_url: str | None` statt `image`.

### 4. `IngredientDetailPage.RecipesSection` nutzt `RecipeCard` direkt

Statt einer eigenen, abgespeckten Karte (nur Titel + Schwierigkeit + Zeit)
wird `RecipeCard` (mit Badges, Nutri-Score, Like-Score) im 2-3-Spalten-Grid
der Ingredient-Detailseite gerendert. Das bedeutet mehr visuelle Dichte pro
Kachel als bisher, aber vollständige Konsistenz mit anderen Rezeptlisten
(z.B. `RecipeListPage`) und kein doppelt gepflegter Karten-Code.

**Alternative verworfen:** Minimalistische Karte beibehalten, nur
Bildlogik auf `RecipeThumbnail` umstellen — verworfen auf Wunsch des
Produktverantwortlichen zugunsten volle `RecipeCard`-Wiederverwendung.

### 5. Migrationsreihenfolge: Backend vor Frontend, `RecipeThumbnail` vor Consumer-Migration

1. Backend-Schemas anpassen (`image_url` überall), da Breaking Change ohne
   Rückwärtskompatibilitäts-Zwang (siehe AGENTS.md).
2. Zod-Schemas synchron nachziehen.
3. `RecipeThumbnail`-Komponente bauen und isoliert testen.
4. Bestehende Kernkomponenten (`RecipeCard`, `RecipeTableRow`,
   `IntelligentSuggestionsGrid`) auf `RecipeThumbnail` migrieren.
5. Verbleibende Consumer (`IngredientDetailPage`, `MealSlot`,
   `RecipePreviewInline/Dialog`, `ProfilePage`, `RecipeImportPage`) migrieren
   und gleichzeitig auf das neue `image_url`-Feld umstellen.

Diese Reihenfolge minimiert Zwischenzustände, in denen Frontend und Backend
unterschiedliche Feldnamen erwarten.

## Risks / Trade-offs

- **[Risk]** Breaking Change ohne Versionierung: alte Frontend-Bundles (falls durch Cache/Service-Worker noch aktiv) erwarten `recipe_image`/`image`, neues Backend liefert nur noch `image_url`. → **Mitigation**: Laut AGENTS.md ist Rückwärtskompatibilität nicht erforderlich; Deploy erfolgt atomar (Backend + Frontend im selben Release), kein schrittweises Rollout nötig.
- **[Risk]** `RecipeCard` in `IngredientDetailPage.RecipesSection` ist visuell dichter/größer als die bisherige minimalistische Karte — könnte im 2-3-Spalten-Grid auf Mobile (320px) zu eng wirken. → **Mitigation**: Mobile-Layout (Spaltenzahl, Grid-Gap) beim Umbau explizit auf 320px testen; ggf. Grid auf 1-2 Spalten für `RecipeCard`-Dichte anpassen statt bisherigem 2-3-Spalten-Layout.
- **[Risk]** Vier neue Pydantic-Schemas erhöhen den Wartungsaufwand leicht (vier Schema-Klassen statt implizitem `dict`). → **Mitigation**: Gemeinsame Basis-Felder (`id`, `title`, `image_url`, `recipe_type`) könnten künftig in einer gemeinsamen Mixin-Klasse gebündelt werden — als Folge-Optimierung außerhalb dieses Changes vermerkt.
- **[Risk]** `intelligent_suggestions`-Endpunkt (Zeile ~2317/2564) wurde in der Recherche nur oberflächlich betrachtet — muss vor Implementierung erneut geprüft werden, ob er ebenfalls ein Bildfeld führt und welches Namensschema er nutzt. → **Mitigation**: Erste Task in tasks.md ist eine vollständige Bestandsaufnahme aller vier Endpunkte inkl. `intelligent_suggestions`.
- **[Trade-off]** Separate Schemas pro Endpunkt (statt einem generischen) bedeuten mehr Code, aber bessere Typsicherheit — bewusst akzeptiert gemäß Projekt-Prinzip "Keine any, Type Hints für alle Funktionen".

## Migration Plan

1. Backend-Schemas + Endpunkte anpassen, lokale Tests (`uv run pytest planner/tests/`) grün.
2. Zod-Schemas synchron anpassen, Frontend-Typecheck (`tsc --noEmit`) grün.
3. `RecipeThumbnail` bauen, in Storybook/manuell isoliert prüfen (falls kein Storybook vorhanden: manuell in einer Testseite).
4. Consumer schrittweise migrieren (Kernkomponenten zuerst, dann restliche Seiten), nach jedem Schritt manuell auf Mobile (320px) und Desktop prüfen.
5. Kein gestuftes Rollback nötig, da Backend und Frontend im selben Deploy ausgeliefert werden (kein Docker/App Engine, Deploy via Cloud Run + OpenTofu gemäß Projekt-Infrastruktur). Rollback erfolgt durch Redeploy der vorherigen Cloud-Run-Revision.

## Open Questions

- Führt `intelligent_suggestions` (Zeile ~2564) ebenfalls ein Bildfeld? Muss vor Task-Umsetzung verifiziert werden (siehe Risk oben).
- Soll das Grid-Layout von `IngredientDetailPage.RecipesSection` bei Umstellung auf `RecipeCard` von 2-3 auf z.B. 1-2 Spalten reduziert werden, um der größeren Kartendichte gerecht zu werden? Entscheidung während Implementierung anhand visueller Prüfung auf 320px treffen.
</content>
