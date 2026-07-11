## Context

Der `POST /api/recipes/ai-create/` Endpoint hat ein Schema-Mismatch: Die Pydantic-Validierung erwartet `{ title, description }`, aber das Frontend sendet `{ prompt }` — Resultat ist ein 422-Fehler. Die UI ist als freier Prompt gestaltet ("Beschreibe dein Rezept"), was semantisch besser zum Nutzerverhalten passt als separate Titel-/Beschreibungsfelder.

Das Backend konstruiert aktuell einen Prompt aus den Input-Feldern (`f"Recherchiere '{title}' {description}"`) und schickt ihn zu Gemini. Gemini liefert im strukturierten Output ohnehin einen `title` — der Input-`title` wird also nicht 1:1 übernommen, sondern dient nur als Kontext.

Die Frontend-Seite hat keine Typ-Absicherung: Kein Zod-Schema für das Request-Body, kein TanStack Query Hook, und ein roher `fetch()`-Call — der Fehler fiel deshalb erst in der Laufzeit auf.

## Goals / Non-Goals

**Goals:**
- Einheitliches `prompt`-Feld durch den gesamten Stack (Backend Schema → API → Frontend Schema → Hook → UI)
- Backend akzeptiert `{ prompt: str }` und sendet den Prompt direkt an Gemini
- Frontend erhält Zod-Request-Schema und TanStack Query Mutation Hook
- API-Test für den `/ai-create/` Endpoint
- OpenSpec-Spec wird aktualisiert

**Non-Goals:**
- UX-Änderungen am Wizard-Workflow (Methoden-Auswahl, Steps etc. bleiben unverändert)
- Änderungen an der Gemini-Model-Konfiguration oder dem Structured-Output-Schema (nur der Prompt-Text ändert sich)
- Keine Prompt-Vorverarbeitung (kein Title-Extraction aus dem Prompt — Gemini macht das)

## Decisions

### Decision 1: `prompt` statt `title`+`description` als Input-Feld

**Gewählt:** Ein einzelnes `prompt: str` Feld ersetzt `title: str` + `description: str = ""`.

**Begründung:**
- Das UI ist bereits als freier Prompt gestaltet — der Nutzer tippt eine Beschreibung, keinen Titel
- Gemini generiert den Titel ohnehin aus dem Prompt im strukturierten Output (`RecipeAiCreateSchema.title`)
- Ein Feld ist simpler als zwei, sowohl im API-Vertrag als auch im UI
- Der Gemini-Prompt-Text wird natürlicher: Statt `"Recherchiere '{title}'. {description}"` wird einfach der User-Prompt direkt verwendet

**Alternativen betrachtet:**
- Nur Frontend fixen (prompt → title umbenennen): Führt zu semantischem Bruch — Nutzer tippt "Nudelauflauf mit Hackfleisch" aber das Feld heißt `title` und wird als Titel behandelt
- Backend parst title aus prompt: Overengineering — Gemini macht das bereits zuverlässig im strukturierten Output

### Decision 2: TanStack Query Hook statt rohem fetch

**Gewählt:** Neuer `useRecipeAiCreate()` Mutation Hook in `frontend-food/src/api/recipes.ts`, der den Request-Body mit Zod validiert und die Response gegen `RecipeDetailSchema` parsed.

**Begründung:**
- Konsistent mit allen anderen API-Aufrufen im Frontend (durchgängig TanStack Query)
- Zod-Validierung im Hook fängt Schema-Fehler sofort (statt stiller 422)
- QueryClient-Integration ermöglicht automatische Cache-Invalidierung nach Creation

### Decision 3: Zod-Schema in recipes.ts

**Gewählt:** `RecipeAiCreateInSchema` mit `prompt: z.string().min(1)` wird in `frontend-food/src/schemas/recipe.ts` definiert, direkt neben den anderen Recipe-Schemas.

**Begründung:**
- Alle Recipe-bezogenen Zod-Schemas leben bereits in dieser Datei
- Kein neues Schema-File nötig für ein einzelnes kleines Schema

## Risks / Trade-offs

- **[Risiko] Gemini versteht den freien Prompt schlechter als den konstruierten "Recherchiere..."-Prompt** → Mitigation: Der Prompt-Bau im Service bleibt erhalten, nur die Quelle ändert sich. Der User-Prompt wird in `f"Erstelle ein vollständiges Rezept zu dieser Beschreibung: {prompt}"` eingebettet, bleibt also ähnlich strukturiert.

- **[Risiko] Backend-Breaking-Change könnte andere (zukünftige) Caller treffen** → Mitigation: Keine Rückwärtskompatibilität nötig (laut AGENTS.md). Es existiert nur ein Caller (WizardStepMethod.tsx), der ohnehin bereits `prompt` sendet.
