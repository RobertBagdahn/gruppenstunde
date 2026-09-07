## Context

Beim Import von Rezepten über externe URLs (z.B. Chefkoch) analysiert Google Gemini die Zutaten und schlägt zusätzliche Aliase vor. Wenn eine neue Draft-Zutat im Service angelegt wird, versuchte der Code bisher, jeden vorgeschlagenen Alias via `IngredientAlias.objects.get_or_create(ingredient=new_ing, name=alias)` zu registrieren. Da `IngredientAlias` jedoch einen datenbankweiten Unique-Constraint auf `lower(name)` für nicht-generische Aliase besitzt, führte dies bei bereits existierenden Namen (wie z.B. „mehl“) zu einer `UniqueViolation` und einem HTTP 500 Fehler.

Parallel dazu trat im Food-Frontend bei der Rezepterstellung (Schritt 3 „Schritte“) ein Datenverlust auf: `StepInstructionEditor.tsx` speicherte Texteingaben im lokalen State `localInstruction` und rief `onUpdate` erst im `onBlur`-Event auf. Wenn ein Nutzer eine Zubereitungsanweisung bearbeitete und direkt unten auf „Weiter“ klickte, wurde `StepEditor.handleSave()` aufgerufen, bevor der Zustand im Zustand-Store aktualisiert werden konnte. Da `hasChanges` im Store noch `false` war, brach `handleSave()` vorzeitig ab, und der Wizard zeigte in Schritt 4 (Preview) unverändert die alten Schritte.

Betroffene Dateien:
- `backend/recipe/services/url_import_service.py`
- `frontend-food/src/components/recipe/StepInstructionEditor.tsx`
- `frontend-food/src/components/recipe/StepEditor.tsx`

## Goals / Non-Goals

**Goals:**
- URL-Import robuster gestalten: Alias-Kollisionen werden vorab geprüft oder isoliert abgefangen, ohne den Importprozess abzubrechen.
- Sofortige und verlässliche Synchronisation von Text- und Dauereingaben in `StepInstructionEditor`: Eingaben fließen direkt in den Store oder werden vor dem Speichern zwingend geflusht.
- `StepEditor.handleSave()` speichert alle anstehenden Änderungen verlässlich ab, auch wenn ein Textarea-Feld beim Klick auf „Weiter“ noch fokussiert war.

**Non-Goals:**
- Keine Änderungen an der Gemini-Prompt-Struktur oder den generierten JSON-Formaten.
- Keine Modell- oder Schemaänderungen an `IngredientAlias` oder `RecipeStep`.
- Keine neuen Datenbankmigrationen.

## Decisions

### 1. Defensives Alias-Handling in `url_import_service.py`
- **Entscheidung**: Vor dem Erstellen eines `IngredientAlias` wird geprüft, ob bereits ein Alias mit `name__iexact=alias` existiert (oder ein `Ingredient` mit diesem Namen). Falls ja, wird der Alias für die neue Draft-Zutat übersprungen. Zusätzlich wird das Anlegen in ein `try...except IntegrityError` eingebettet.
- **Alternativen**:
  - *Alternative A*: Globalen Unique-Constraint lockern. *Verworfen*: Widerspricht der Supply-Architektur (Aliase müssen eindeutig auf eine Zutat verweisen).
  - *Alternative B*: Nur `try/except` ohne Vorabprüfung. *Verworfen*: Transaktionen in PostgreSQL geraten bei `IntegrityError` in einen fehlerhaften Zustand, falls nicht mit `savepoint` gearbeitet wird. Vorabprüfung (`exists()`) ist sauber und atomar.

### 2. Synchronisation in `StepInstructionEditor.tsx` und `StepEditor.tsx`
- **Entscheidung**:
  - `StepInstructionEditor`: Ruft bei `onChange` weiterhin `setLocalInstruction` auf, meldet aber die Änderung direkt an `onUpdate` weiter (oder verwendet kontrollierten Input mit direkter Store-Synchronisation), sodass `hasChanges` im Store sofort aktiv ist.
  - Alternativ/Ergänzend: `StepInstructionEditor` flusht seinen lokalen Stand sofort bei `handleSave()` über eine imperative Ref oder synchronen Callback.
  - Das Textarea-Feld erhält `data-testid="recipe-step-instruction"` für deterministische Tests.
- **Alternativen**:
  - *Alternative A*: Nur `onBlur` beibehalten und im Button ein künstliches Blur erzwingen. *Verworfen*: Fragil auf mobilen Geräten und bei schnellen Klickabfolgen.
  - *Alternative B*: Ausschließlich kontrollierte Komponenten ohne lokalen Zwischen-State. *Gewählt/Empfohlen*: `StepInstructionEditor` synchronisiert direkt mit dem Store bzw. flusht den aktuellen Text, sodass `hasChanges` immer synchron mit der tatsächlichen Eingabe ist.

## Risks / Trade-offs

- [Risk] Hohe Frequenz von Store-Updates bei schnellem Tippen → [Mitigation] Im Zustand-Store mit Immer ist ein flaches Feld-Update (`step.instruction = val`) extrem leichtgewichtig und führt zu keinen API-Requests während des Tippens.
- [Risk] Bereits existierender Alias wird nicht mit der neuen Zutat verknüpft → [Mitigation] Vollkommen beabsichtigt; ein Alias darf ohnehin nur zu genau einer Zutat gehören.
