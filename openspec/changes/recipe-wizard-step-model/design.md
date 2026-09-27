## Context

Aufbau heute (`components/recipe/RecipeWizard.tsx`):

```
state.currentStep: number        ← Index, verschiebt sich mit hasReviewStep
BASE_STEP_LABELS (6) / +„Zutaten prüfen“ (7)
handleNext():
  step 0 → methodStepRef.primaryAction()      (KI-Analyse)
  step 1 → basisStepRef.save()                (verlangt KI-Ergebnis)
  step 2 & review → createRecipe(quantity / servings)   ← einziger Anlegepunkt
  step ingredientStep → ingredientsStepRef.save() + PATCH
  step 3 → (toter Zweig, kollidiert)
  step metadataStep → PATCH metadata + stepsStepRef.save()
render: Objekt {0: …, 1: …, 2: hasReviewStep ? … : …, 3: …}
```

Zustand verteilt auf `useState` (Wizard), `useRecipeIngredientReviewStore` (Zustand), `metadataRef`, 5 Refs sowie lokalen State in jedem Schritt.

Folgen:
- Der Pfad ohne Review-Schritt legt kein Rezept an.
- Ein Neuladen verliert alles.
- Jeder neue Schritt erfordert Index-Arithmetik an ca. 6 Stellen.

### Abhängigkeit zu `ingredient-status-visibility-unification`
ISVU ändert dieselbe Funktion `create_recipe` (`recipe/api/recipes.py:775`: neue Zutaten mit `status=draft` und `created_by`) und reicht den Nutzer an den Zutaten-Matcher der Review-Vorschau durch. Beides ist unabhängig von der Mengen-Normierung; dieser Change baut auf dem ISVU-Stand auf und ändert nur die Mengen sowie `source_servings`. Die Review-Vorschau (`/ingredient-review/preview/`) bleibt unverändert.

## Goals / Non-Goals

**Goals:**
- Schritte deklarativ und über IDs; neue Schritte ohne Index-Arithmetik.
- Ein Anlegepunkt, ein Speichermuster.
- Wiederaufnahme über die URL.
- Rezepte auch ohne KI anlegbar.
- Normierung pro Portion an einer Stelle (Backend).

**Non-Goals:**
- Zusammenführen von Wizard, `/edit` und Inline-Editor (Audit-Vorschlag 13, eigener Change).
- Neue Felder oder Schritte.
- Persistenz des Zustands vor dem Anlegen (Eingabetext, KI-Ergebnis).
- Überarbeitung der Review-UI (Audit-Befund 17).

## Decisions

### D1: Deklaratives Schritt-Array
```ts
// components/recipe/wizardSteps.ts
type WizardStepId = 'input' | 'basis' | 'review' | 'ingredients' | 'materials' | 'preparation' | 'preview';
interface WizardStepDef {
  id: WizardStepId;
  label: string;           // „Zutaten prüfen“
  help: string;            // deutscher Hilfetext
  isVisible: (ctx: WizardCtx) => boolean;   // review: ctx.reviewRows.length > 0
  requiresDraft: boolean;  // ingredients, materials, preparation, preview
  Component: React.ComponentType;
}
export const WIZARD_STEPS: WizardStepDef[] = [...];
```
`visibleSteps = WIZARD_STEPS.filter(s => s.isVisible(ctx))`. Navigation über `visibleSteps.indexOf(current)`. Der Anlegepunkt ergibt sich als „letzter sichtbarer Schritt mit `requiresDraft=false`“, also ohne Sonderfall.
*Alternative*: State-Machine (XState). Verworfen, weil das für einen linearen Ablauf mit einem optionalen Schritt eine neue Abhängigkeit ohne Mehrwert wäre.

### D2: `WizardStepContext` statt Ref-Handles
```ts
const { registerLeave } = useWizardStep();
useEffect(() => registerLeave(async (direction) => { …; return true; }), [deps]);
```
Der Wizard hält pro Schritt-ID genau einen Handler und ruft ihn vor jedem Wechsel auf. Damit entfallen `forwardRef`/`useImperativeHandle` in `WizardStepMethod`, `WizardStepBasis`, `WizardStepIngredients`, `WizardStepSteps` und `WizardStepPreview`. Den Metadaten-Snapshot (`metadataRef`) registriert `WizardStepMetadata` ebenfalls als Leave-Handler.
Der Handler für das Anlegen gehört dem Wizard (nicht einem Schritt): Nach dem Leave-Handler des Anlegepunkt-Schritts ruft der Wizard `createDraft(ctx)` auf.

### D3: URL-State
- `useSearchParams`: `draft` (Zahl), `step` (`WizardStepId`, per Zod-Enum validiert).
- Schrittwechsel: `setSearchParams({draft, step})` **mit** History-Eintrag, damit der Browser-Zurück-Button Schritte zurückgeht. Der Leave-Handler des verlassenen Schritts läuft auch dabei (über den `popstate`-Pfad: Wechsel erkennen, dann Handler aufrufen; bei `false` die URL per `replace` zurücksetzen).
- Mit `draft`: `useRecipeById(draft)` lädt den Entwurf; Titel, Typ und `source_servings` kommen aus der Antwort. Die Schritte ab `ingredients` lesen ohnehin vom Server (per Slug), das bleibt so.
- Route bleibt `/recipes/new` (keine neue Route; kein Konflikt mit `/recipes/:slug`).

### D4: Manueller Einstieg
`WizardStepMethod` bekommt den Link „Ohne KI manuell beginnen“. Er setzt `ctx.creationMethod = 'manual'` und springt zu `basis`. `WizardStepBasis` validiert im manuellen Modus nicht mehr auf `result` und belegt nichts vor. Der Schritt `review` ist unsichtbar; der Entwurf wird beim Verlassen von `basis` ohne Zutaten angelegt.

### D5: Normierung im Backend
- Modell: `Recipe.source_servings = PositiveSmallIntegerField(null=True, blank=True)`. Das flüchtige Klassenattribut `input_servings` (`recipe/models/recipe.py:223`) entfällt; `RecipeDetailOut` liefert `source_servings` (das Feld `input_servings` wird entfernt, der Frontend-Zod wird angepasst).
- `RecipeCreateIn.input_servings: int | None = Field(None, ge=1, le=100)`. Bei Zutaten oder Review-Zeilen ohne diesen Wert antwortet die API mit 422.
- `create_recipe` (`recipe/api/recipes.py:681`) teilt `recipe_items[].quantity` und `ingredient_review_rows[].quantity` durch `input_servings`, bevor Items erzeugt werden, setzt `portions=1` und `source_servings=input_servings`.
- `PATCH /api/recipes/{id}/` akzeptiert `source_servings` (nur Anzeige-Kontext, keine Umrechnung).
- Der Wizard sendet die Review-Zeilen unverändert (Gesamtmengen) mit `input_servings`.

### D6: Toasts
Der Wizard zeigt pro Aktion höchstens einen Toast. Das Erfolgs-Toast „Rezept fertiggestellt!“ erscheint nur, wenn der Leave-Handler von `preview` `true` liefert. Fehler-Toasts werden zentral im Wizard aus Exceptions erzeugt, nicht zusätzlich in den Schritten.

## Risks / Trade-offs

- [Abgebrochene Entwürfe sammeln sich an] → Bereits heute so, sobald das Rezept angelegt ist. `MyRecipesPage` zeigt Entwürfe; ein Aufräumen verwaister Entwürfe ist ein eigenes Thema.
- [Browser-Zurück über den Anlegepunkt hinweg (zu `review`) zeigt einen Schritt ohne Client-Zustand] → Schritte vor dem Anlegepunkt sind mit `draft` nicht erreichbar; `step=basis|review|input` mit `draft` öffnet `ingredients` (Spec). Der Zurück-Button in `ingredients` ist deaktiviert und zeigt einen Hinweis „Titel und Typ kannst du in der Vorschau ändern“.
- [Andere Aufrufer von `POST /api/recipes/` senden Mengen ohne `input_servings`] → Vor der Umsetzung alle Aufrufer prüfen (Frühstücks-Modals `CreateRecipeModal.tsx`, Fork, Import, Tests); Aufrufer mit Pro-Portion-Mengen senden `input_servings=1`.
- [Umbau eines 566-Zeilen-Kernflows] → Bestehende `RecipeWizard.test.tsx` zuerst als Regressionsnetz grün halten; Umbau schrittweise (erst Schritt-Array + Context, dann URL, dann Backend-Normierung).

## Migration Plan

1. Backend-Migration `recipe/00xx_recipe_source_servings` (neues Feld, null erlaubt; keine Datenmigration).
2. Backend und Frontend im selben Release deployen. Es gibt keine Rückwärtskompatibilität und kein Feature-Flag (Projektregel). Ein kurzzeitig geöffneter alter Tab bekommt beim Anlegen 422 und muss neu laden.

## Open Questions

- Soll `source_servings` auch im Rezeptdetail angezeigt werden („Originalrezept für 6 Personen“)? Vorerst nur im Wizard.
