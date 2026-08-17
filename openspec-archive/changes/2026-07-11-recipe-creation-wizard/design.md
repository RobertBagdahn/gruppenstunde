## Context

Die Rezept-Erstellung verwendet aktuell den generischen `ContentStepper` (3-Step Wizard: Describe → Edit → Preview). Der `ContentStepper` ist für alle Content-Typen gleich und bietet keine Rezept-spezifischen Funktionen — insbesondere keinen Zutaten-Editor und keinen Step-Editor.

Zutaten (`InlineIngredientEditor`) und strukturierte Schritte (`StepEditor`) existieren ausschließlich auf der Rezept-Detailseite (`RecipeDetailPage`) und werden über URL-Parameter (`?edit=ingredients`, `?mode=steps`) aktiviert. Nach der Rezept-Erstellung wird der Nutzer dorthin weitergeleitet, was einen fragmentierten Workflow aus Erstellen → Zutaten-Nachtragen → Steps-Nachtragen erzwingt.

Die Komponenten `InlineIngredientEditor` und `StepEditor` sind tief in `RecipeDetailPage` eingebettet und nicht als standalone-Komponenten nutzbar. Sie müssen extrahiert werden, um im Wizard zu funktionieren.

## Goals / Non-Goals

**Goals:**
- Neuer, Rezept-spezifischer 5-Step Wizard, der `ContentStepper` in `CreateRecipePage` ersetzt
- `InlineIngredientEditor` und `StepEditor` als standalone-Komponenten extrahieren, die sowohl im Wizard als auch auf der Detail-Seite funktionieren
- Frühe Draft-Erstellung in Step 1 mit inkrementellem Speichern zwischen Steps
- Methoden-Wahl (Manuell/KI/URL) als Step 0
- Vollständige Rezept-Erstellung im Wizard abschließbar (kein Nachtragen nötig)
- Drafts erscheinen nicht in öffentlichen Listings (Backend bereits korrekt)

**Non-Goals:**
- `ContentStepper` für andere Content-Typen ändern
- `EditRecipePage` oder Detail-Seiten-Edit-Modi verändern
- Wizard für Bearbeitung existierender Rezepte (nur Creation)
- Neue API-Endpoints erstellen (alle existieren bereits)
- AI-Generierung für Steps im Wizard (existiert bereits im StepEditor)
- `RecipeUpdateIn` Pydantic-Schema strukturell ändern (nur Server-Logik anpassen)

## Decisions

### Decision 1: Eigener RecipeWizard statt ContentStepper-Erweiterung

**Gewählt:** Neuer `RecipeWizard` als React-Komponente, die `ContentStepper` in `CreateRecipePage` ersetzt.

**Begründung:**
- `ContentStepper` hat 3 generische Steps (Describe/Edit/Preview) — der Recipe-Wizard braucht 5 spezifische Steps
- `ContentStepper` arbeitet mit `ContentFormData` — der Recipe-Wizard arbeitet mit echten DB-Objekten (Recipe, RecipeItems, Steps)
- `ContentStepper` speichert erst am Ende — der Recipe-Wizard speichert inkrementell zwischen Steps
- Änderungen an `ContentStepper` würden andere Content-Typen (GroupSession, Blog, Game) riskieren

**Alternativen verworfen:**
- `ContentStepper` mit Slot-API erweitern: Überkompliziert für einen Content-Typ, der fundamental andere Anforderungen hat
- `CreateRecipePage` komplett ersetzen durch eine Single-Page-Edit-Ansicht: Weniger Guidance für neue Nutzer, höhere kognitive Last

### Decision 2: Wizard speichert inkrementell zwischen Steps

**Gewählt:** Jeder "Weiter"-Klick persistiert die Daten des aktuellen Steps via API.

**Begründung:**
- Step-Editor in Step 3 benötigt echte `RecipeItem`-IDs — diese existieren nur, wenn Zutaten bereits in der DB sind
- Bei Abbruch geht nur der aktuelle, ungespeicherte Step verloren — nicht das ganze Rezept
- Nutzer können den Wizard verlassen und später über "Meine Rezepte" weitermachen
- Ermöglicht paralleles Arbeiten (wenn auch nicht aktiv unterstützt)

**Alternativen verworfen:**
- Client-seitige Pseudo-IDs: Komplexe Auflösungslogik beim finalen Save, fehleranfällig
- Nur am Ende speichern: Step-Editor kann nicht mit Pseudo-IDs arbeiten (FK-Constraints)

### Decision 3: PATCH-Endpoint-Verhalten anpassen

**Gewählt:** `PATCH /api/recipes/{id}/` ersetzt `recipe_items` nur, wenn das Feld explizit im Request-Body enthalten ist. Bei reinen Metadaten-Updates (ohne `recipe_items` im Body) bleiben existierende RecipeItems unverändert.

**Begründung:**
- Step 2 (Metadaten) sendet `PATCH` ohne `recipe_items` — würde sonst alle Zutaten aus Step 1 löschen
- Bestehendes API-Verhalten (replace-all bei Angabe von `recipe_items`) bleibt erhalten
- Minimale Änderung: Nur die Existenz des Keys prüfen, nicht das Schema ändern

**Implementierung:**
```python
# In recipe/api/recipes.py, update_recipe():
if "recipe_items" in payload_data:
    # Bestehendes Verhalten: delete all + bulk create
    recipe.recipe_items.all().delete()
    ...
# Wenn "recipe_items" nicht im Body → nichts tun mit recipe_items
```

**Alternative verworfen:**
- Separater Metadaten-Endpoint: Fragmentiert die Recipe-API unnötig für einen Edge Case
- Frontend sendet immer alle recipe_items mit: N+1 Problem, da alle Zutaten neu geladen und gesendet werden müssten

### Decision 4: InlineIngredientEditor als standalone Komponente

**Gewählt:** `InlineIngredientEditor` wird aus `RecipeDetailPage` in eine eigene Datei unter `src/components/recipe/` extrahiert. Er akzeptiert `recipeId` und `recipeSlug` als Props und managed seinen eigenen State (bestehende TanStack Query Hooks). Die `RecipeDetailPage` rendert ihn unverändert, der Wizard rendert ihn in Step 1.

**Begründung:**
- `InlineIngredientEditor` ist bereits eine React-Komponente innerhalb von `RecipeDetailPage` — sie muss nur in eine eigene Datei verschoben werden
- Die Props `recipeId` und `recipeSlug` kommen im Wizard vom existierenden Draft (`POST /api/recipes/` response)
- Alle API-Hooks (`useCreateRecipeItem`, `useUpdateRecipeItem`, `useDeleteRecipeItem`) arbeiten mit `recipeId` — unabhängig vom Rendering-Kontext

**Herausforderungen:**
- Der Editor ist ~1300 Zeilen lang und eng mit `RecipeDetailPage`-State (Portion-Scaling, Zustand-Stores) verwoben
- `PortionScaler` und Portion-Normalisierung sind teilweise in `RecipeDetailPage` dupliziert
- Extraktion erfordert sorgfältige Prop-Dekomposition

### Decision 5: StepEditor als standalone Komponente

**Gewählt:** `StepEditor` wird aus `RecipeDetailPage` in eine eigene Datei extrahiert. Er akzeptiert `slug` und `availableRecipeItems` als Props. Der State wird über `useRecipeStepStore` (Zustand) verwaltet.

**Begründung:**
- `StepEditor` ist bereits eine gut abgegrenzte Komponente innerhalb von `RecipeDetailPage`
- Der Zustand-Store (`useRecipeStepStore`) ist unabhängig von `RecipeDetailPage`
- Im Wizard-Kontext: `availableRecipeItems` sind die echten RecipeItems aus Step 1 (existieren in DB)

**Herausforderungen:**
- `RecipeDetailPage` ruft `useRecipeSteps(slug)` auf und übergibt das Ergebnis → der StepEditor könnte diesen Hook selbst aufrufen müssen
- Die `availableRecipeItems` kommen im Wizard von `useRecipe(slug)?.recipe_items`, auf der Detail-Seite vom gleichen Hook

### Decision 6: Draft-Erstellung in Step 1

**Gewählt:**
- **Manuell**: Draft wird via `POST /api/recipes/` erstellt, sobald Titel + RecipeType + ≥1 Zutat vorhanden sind. Der `useCreateRecipe` Hook wird aufgerufen.
- **KI**: `POST /api/recipes/ai-create/` erstellt den Draft. Response enthält vollständigen Recipe-Datensatz inkl. ID und Slug.
- **URL**: `POST /api/recipes/import-from-url-enhanced/` returns preview. Nach Bestätigung: `POST /api/recipes/` erstellt Draft.

**Begründung:**
- `ai-create` erstellt bereits einen vollständigen Draft — kein Grund, das zu ändern
- `import-from-url` returned preview data — der Nutzer soll erst bestätigen, bevor persistiert wird
- Manuelle Erstellung braucht den flexibelsten Trigger: automatisch bei "genug Daten"

### Decision 7: Komponenten-Architektur

```
src/
├── components/
│   └── recipe/
│       ├── RecipeWizard.tsx              ← NEU: Wizard Container
│       ├── WizardStepMethod.tsx          ← NEU: Step 0
│       ├── WizardStepIngredients.tsx     ← NEU: Step 1 (Wrapper)
│       ├── WizardStepMetadata.tsx        ← NEU: Step 2
│       ├── WizardStepSteps.tsx           ← NEU: Step 3 (Wrapper)
│       ├── WizardStepPreview.tsx         ← NEU: Step 4
│       ├── InlineIngredientEditor.tsx    ← EXTRAHIERT aus RecipeDetailPage
│       ├── StepEditor.tsx               ← EXTRAHIERT aus RecipeDetailPage
│       └── ... (bestehende Komponenten)
└── pages/
    └── recipes/
        ├── CreateRecipePage.tsx          ← GEÄNDERT: Nutzt RecipeWizard
        └── RecipeDetailPage.tsx          ← GEÄNDERT: Importiert extrahierte Komponenten
```

## Risks / Trade-offs

### Risk 1: InlineIngredientEditor-Extraktion ist komplex
Der Editor ist tief mit `RecipeDetailPage` verwoben (Portion-Scaling-State, AI-Buttons, Staff-Only-Features). Die Extraktion könnte unbeabsichtigte Regressionen auf der Detail-Seite verursachen.

**Mitigation:**
- Extraktion in eigenem Commit/PR, isoliert testbar
- `RecipeDetailPage`-Tests (falls vorhanden) vorher und nachher ausführen
- Feature-Flag oder separater Branch, bis stabil

### Risk 2: PATCH-Endpoint-Änderung betrifft bestehende Clients
Die `PATCH /api/recipes/{id}/`-Änderung (recipe_items nur ersetzen, wenn explizit gesendet) ändert das API-Verhalten. Bestehende Clients, die immer `recipe_items` mitsenden, sind nicht betroffen. Aber Clients, die sich darauf verlassen, dass ein fehlendes `recipe_items` die Zutaten löscht, würden brechen.

**Mitigation:**
- Code-Audit aller Stellen, die `PATCH /api/recipes/{id}/` aufrufen
- Im Frontend wird `PATCH` aktuell nur von `EditRecipePage` genutzt (sendet keine `recipe_items`) — kein Impact
- Im Frontend-Food: `useUpdateRecipe` wird für Metadaten-Updates auf der Detail-Seite verwendet — prüfen, ob `recipe_items` mitgesendet wird

### Risk 3: Wizard-State geht bei Reload verloren
Der Wizard speichert zwischen Steps, aber wenn der Nutzer den Browser während der Eingabe in einem Step refreshed, gehen ungespeicherte Eingaben verloren. Nur bereits persistierte Daten bleiben erhalten.

**Mitigation:**
- Klare UX: "Deine Änderungen werden beim Klick auf 'Weiter' gespeichert"
- Der Draft persistiert in der DB und ist über "Meine Rezepte" erreichbar
- Auto-Save (Debounced) als zukünftige Verbesserung denkbar, aber nicht in Scope

### Risk 4: AI-Create erstellt Draft, den Nutzer nie fertigstellt
Bei "KI-Hilfe" erstellt `POST /api/recipes/ai-create/` sofort einen Draft. Wenn der Nutzer den Wizard abbricht, bleibt ein unvollständiger Draft in der DB.

**Mitigation:**
- Drafts sind nur für den Owner sichtbar (nicht in öffentlichen Listings)
- Akzeptiertes Verhalten — der Nutzer kann Drafts später löschen
- Optional: "Verwaiste Drafts"-Cleanup-Cronjob (nicht in Scope)

### Risk 5: Step 3 (Steps) lädt Daten, die noch nicht existieren
Wenn der Nutzer Step 3 betritt, bevor Steps generiert wurden, zeigt der StepEditor einen leeren Zustand. Das ist erwartet — der "Aus Zutaten generieren"-Button existiert bereits.

**Mitigation:**
- StepEditor behandelt leere Step-Arrays korrekt (bestätigt)
- Kein Fehlerzustand, sondern "Noch keine Schritte"-Leerzustand
