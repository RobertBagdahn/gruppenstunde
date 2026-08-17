## Context

**Current State:**
- Rezepte haben `Content.description` als freies Markdown-TextField
- `RecipeItem` (Zutaten) sind separate Modelle mit `quantity`, `portion_name`
- Der Kochmodus (`RecipeCookingMode.tsx`) zeigt Zutaten und geparstes Markdown nebeneinander (heuristisch, brüchig)
- Keine Verknüpfung zwischen Schritten und Zutaten
- Portion-Skalierung ändert RecipeItem.quantity, nicht die Anleitung

**Stakeholder-Feedback:** „Zutaten links, Anleitung rechts pro Schritt. Strukturierte Schritt-für-Schritt-Ansicht."

**Constraints:**
- Keine Breaking Changes (alte Rezepte müssen funktionieren)
- <50 bestehende Rezepte → manuelle/KI-Migration OK
- 1 Person, Vollzeit, 4-6 Wochen
- KI-Nutzung nur bei explizitem User-Click (Kostenbudget)
- Deutsch-only UI

---

## Goals / Non-Goals

**Goals:**
- Strukturierte, semantische Rezeptanleitungen mit Zutatenverlinkung
- Step-Editor mit Drag-and-Drop (Desktop), Inline-Editing, Live-Vorschau
- KI-gestützte Step-Generierung und Ingredient-Zuordnung (Phase 1 MUST-HAVE)
- Robuste Platzhalter-Auflösung (`{ingredient_name}` → „500g Mehl")
- Backward-Kompatibilität (alte Rezepte mit Fallback)
- Einfaches Undo/Redo (nur letzte Aktion)

**Non-Goals:**
- Sektionen-Hierarchie (flach, optional nur als Gruppierungsfeld)
- CookLang-Import (wird nicht gebaut)
- Autocomplete/Snippet-Vorschläge während der Eingabe (Phase 2)
- Service-Worker Timer-Benachrichtigungen
- Mobile-vollständiger Editor (Desktop-first, Mobile: vereinfacht ohne DnD)
- Mehrsprachigkeit (Deutsch-only)
- Cookware-Tabelle
- KI-Split/Merge von Steps

---

## Decisions

### 1. **Datenmodell: Normalisiert mit ForeignKey (nicht Flat-Text)**

**Decision:** `RecipeStep` + `RecipeStepIngredient` sind Django-Modelle mit FK zu `RecipeItem`, nicht CookLang-Parser-Artefakte.

**Rationale:**
- SQL-Queries sind trivial (WHERE step_id = ... für eine Zutat)
- Portion-Skalierung: RecipeItem.quantity ändert sich → alle Steps zeigen neue Mengen automatisch
- Normalisierung = keine Daten-Duplikation
- Fallback-Markdown wird aus Steps generiert, nicht vice versa

**Alternative Rejected:**
- *CookLang als Speicherformat*: Bedeutet Parser-Abhängigkeit, Randfälle, keine echte Struktur in DB
- *Flat-Text in description mit Pattern-Matching*: Brüchig, nicht querybar, Part-Update unmöglich

---

### 2. **Platzhalter-Syntax: Beide ID + Name unterstützen (intern ID, UI Name)**

**Decision:** 
- Speicherung: `{recipe_item_id}` (robust, keine Name-Änderung breakage)
- Editor-Anzeige: `{Zwiebeln}` (lesbar)
- Parser: erkenne beide Syntaxen

**Rationale:**
- ID ist zukunftssicher (Rename von „Zwiebeln" auf „Rote Zwiebeln" bricht nichts)
- Name ist für Nutzer lesbar im Editor
- Frontend-Parser `resolveStepPlaceholders()` handhabt das Mapping (RecipeItems zur Laufzeit laden)

**Alternative Rejected:**
- *Nur Names*: Fehleranfällig bei Renames
- *Nur IDs*: Editor zeigt hässliche UUIDs, schwer zu verstehen

---

### 3. **Undo/Redo: Einfach (nur letzter Stand), nicht vollständige History**

**Decision:** 
- State: `{ steps: RecipeStep[], lastState: RecipeStep[] }`
- Button: nur „Rückgängig" + „Wiederherstellen", nicht unbegrenzte History
- Implementation: Zustand-Store mit two-state Tracking

**Rationale:**
- 90% Use-Case: Nutzer ändert was, möchte einen Schritt zurückgehen
- Full Command-History = komplexe State-Verwaltung mit Immer (aufwändig)
- KI-Calls ändern Steps → Historie-Verwaltung wird komplex
- Speichern geht sowieso sofort an DB (Server hat vollständigen Audit)

**Alternative Rejected:**
- *Full History (Command-Pattern)*: +2-3 PT, overkill für MVP
- *Kein Undo*: Bad UX, nutzt Editor verringert sich

---

### 4. **Frontend State: Zustand-Store (wie Rest der App)**

**Decision:** `useRecipeStepStore()` mit Zustand v5 für:
- Current Steps (Array, sortable)
- Selected Step
- Undo/Redo State
- Loading/Error States

**Rationale:**
- Consistency mit bestehender Codebase (Zustand überall)
- Einfacher als Context, simpler als Redux
- Zustand + Immer für Immutability

**Alternative Rejected:**
- *React Context*: Props-Drilling bei vielen Sub-Components
- *Local useState*: State-Lifting zu komplex, zu viele Prop-Bohrungen

---

### 5. **Drag-and-Drop: dnd-kit (nicht react-beautiful-dnd)**

**Decision:** `@dnd-kit/core` + `@dnd-kit/sortable` (+ utilities/sensors)

**Rationale:**
- `react-beautiful-dnd` ist eingestellt (legacy, keine Updates)
- `dnd-kit` ist aktiv maintained, Tree-Support für später (Sektionen Phase 2)
- Moderner, kleinerer Bundle
- Touchscreen-Support out-of-box

**Alternative Rejected:**
- *react-beautiful-dnd*: Legacy, keine Security-Updates später
- *Vanilla DnD Events*: Viel selbst-Code schreiben, Browser-Kompatibilität

---

### 6. **Backend KI-Service: Modularer Service-Layer (nicht direkt in API)**

**Decision:** 
```python
# recipe/services/step_ai_service.py
class AiStepService:
    @staticmethod
    def generate_steps_from_items(recipe_items) → list[RecipeStepInput]
    @staticmethod
    def suggest_ingredient_assignment(step, available_items) → list[SuggestedAssignment]
```

**Rationale:**
- Separiert Business-Logic von API-Routes
- Einfacher zu Testen (Unit-Tests ohne HTTP)
- Kann von Import-Service + API-Endpoint genutzt werden
- KI-Calls sind teuer → sollten gecacht/dedupliciert werden können

---

### 7. **API-Response: Vollständig Backward-Kompatibel**

**Decision:**
```json
GET /api/recipes/{slug}
{
  "id": "...",
  "description": "Aus Steps generiert ODER Fallback-Markdown",
  "steps": [ { "instruction": "{Mehl} mit {Wasser}...", ... } ],
  "has_structured_steps": true|false
}
```

**Rationale:**
- Alte Clients funktionieren mit `description` (Markdown)
- Neue Clients nutzen `steps`-Array
- `has_structured_steps` signalisiert neue Struktur
- Keine Client-Breaking

**Alternative Rejected:**
- *description entfernen*: Bricht alte Clients, SEO
- *description nur Intro + Steps*: Unterstützt noch nicht finalisierte API

---

### 8. **Validation: Locker (Steps sind optional)**

**Decision:**
- Ein Rezept kann Steps haben ODER nicht
- Wenn Steps: mindestens 1 Step
- `instruction` nie leer
- Jeder Platzhalter MUSS auf Recipe.items FK verweisen (Validierung)

**Rationale:**
- Alte Rezepte ohne Steps sind OK (Fallback)
- Neue Rezepte mit Steps sind modern
- Strict Validierung (FK-Check) verhindert verwaiste Referenzen

---

### 9. **Migration: Optional (Nutzer triggert manuell über KI-Button)**

**Decision:**
- Bestehende Rezepte: `description` bleibt, `steps` ist leer
- Nutzer klickt Button: „Aus Beschreibung Schritte generieren"
- KI parsed `description` → neue RecipeStep + RecipeStepIngredient
- Nutzer korrigiert im Editor, speichert

**Rationale:**
- <50 Rezepte: kein Migrations-Problem
- Nutzer hat Kontrolle (KI-Fehler werden nicht blind übernommen)
- Batch-Migration wäre komplex/fehleranfällig bei vielen Rezepten

**Alternative Rejected:**
- *Auto-Migration aller Rezepte*: Könnten Fehler enthalten, QA-Albtraum
- *Keine Migration*: Alte Rezepte sehen blöd aus

---

### 10. **description-Feld nach Migration: Fallback (generiert wenn Steps existieren)**

**Decision:**
- Wenn RecipeStep existieren: `description` wird ignoriert in UI
- Backend generiert `description` aus Steps (für SEO/Export)
- Alte Rezepte zeigen `description` wie bisher

**Rationale:**
- Clean: Steps sind source of truth, description ist Output
- Portion-Skalierung: nur Steps updaten, description auto-regeneriert
- SEO: `description` wird in API-Response geliefert (auch wenn aus Steps generiert)

---

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| **KI-Kosten bei Generierung + Zuordnung hoch** | Nur bei explizitem Button-Click, nicht automatisch. Caching von häufigen Zutaten |
| **Platzhalter-Parser-Fehler (beide Syntaxen)** | Umfassende Unit-Tests, Fallback auf Rohtext wenn keine Zuordnung |
| **DnD-Performance bei 50+ Steps** | Virtualisierung später (Phase 2), MVP wahrscheinlich <20 Steps pro Rezept |
| **Undo nur einfach — Nutzer Frustration?** | Kommunikation in UI: „Ein Level Undo/Redo", aber Server speichert alles (DB-History) |
| **Mobile-Editor ohne DnD** | Akzeptabler Trade-off: Editing am Handy ist Nische, Desktop ist Primary |
| **FK-Validierung strict: Was wenn User löscht Zutat?** | Cascade-Delete in RecipeStepIngredient (wenn RecipeItem gelöscht, verschwinden auch step-Referenzen) |
| **Portion-Skalierung wirkt sofort in allen Steps** | Feature oder Bug? → Dokumentieren, UX-Feedback sammeln (Phase 2 Refinement) |
| **Alte Rezepte mit description aber keine steps zeigen ohne Struktur** | Fallback-Parser zeigt Steps wie bisher (heuristisch), OK für MVP |

---

## Migrations-Plan

### Phase 0: Backend Setup
1. Django Modelle (`recipe/models/steps.py`) + Migrationen
2. Pydantic Schemas + API Serializer
3. `AiStepService` Implementation
4. API Routen testen (lokal)

### Phase 1: Frontend Editor + Rendering
1. Zod-Schemas + Zustand-Store
2. `StepEditor` Komponente (mit dnd-kit)
3. `RecipeDetailPage` aktualisieren (Steps-Section anzeigen)
4. `RecipeCookingMode` aktualisieren (schritt-relevante Zutaten)

### Phase 2: KI-Integration
1. Frontend-Hook für Generierung + Zuordnung
2. KI-Buttons im Editor
3. Backend-Integration mit Gemini

### Phase 3: Testing + Druck
1. Unit + E2E Tests
2. Print-Layout aktualisieren
3. QA + Bugfixes

### Rollback-Strategie
- Feature-Flag (Django Setting): `ENABLE_STRUCTURED_STEPS = False` → Editor wird ausgeblendet, nur alte description
- DB-Rollback: Migration ist reversible (neue Tabellen, keine Spalten-Änderungen an Recipe)

---

## Open Questions

1. **KI-Latenz für Zuordnung**: Sollte `suggest_ingredient_assignment()` parallel für alle unzugeordneten Zutaten aufgerufen werden oder sequenziell? (Batching vs. Streaming)
2. **Portion-Skalierung UX**: Wenn Nutzer Portion ändern, sollten die Step-Texte automatisch neu gerendert werden mit neuen Mengen? Oder nur die Zutatenliste?
3. **Editieren von step_ingredients.preparation**: Soll der Nutzer im Editor die Vorbereitung pro Step editieren können, oder nur global in RecipeItem.note?
4. **Fehlerbehandlung**: Wenn ein RecipeItem gelöscht wird, das noch in step_ingredients referenziert ist — Cascade-Delete oder Soft-Delete mit Fehlermeldung?
5. **API Pagination**: Falls Rezepte VIELE Steps haben (z.B. 100+), sollte `/steps` paginiert sein? Oder immer alle auf einmal laden?

