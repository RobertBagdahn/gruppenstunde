## Why

Beim Importieren von Rezepten über Chefkoch-URLs schlägt der Import mit einem unhandled 500-Fehler (`UniqueViolation`) fehl, wenn vorgeschlagene Aliase bereits in der Datenbank existieren. Zudem gehen bei der Rezepterstellung (insb. mit KI) manuell bearbeitete Zubereitungsschritte verloren, wenn der Nutzer im Schritt „Schritte“ Änderungen vornimmt und direkt auf „Weiter“ klickt, da Eingaben erst beim Blur-Event synchronisiert werden und die Speicherung bei vermeintlich fehlenden Änderungen übersprungen wird.

## What Changes

- **URL-Import Alias-Härtung**: Im URL-Import-Service (`url_import_service.py`) wird die Alias-Erstellung für neu angelegte Draft-Zutaten defensiv abgesichert. Vor dem Anlegen wird geprüft, ob der Alias bereits existiert, und potentielle `IntegrityError` werden abgefangen, sodass Rezept-Imports nicht mehr an kollidierenden Aliasen scheitern.
- **Echtzeit-Synchronisation von Zubereitungsschritten**: In `StepInstructionEditor.tsx` wird die Textänderung direkt oder vor dem Verlassen an den übergeordneten Zustand bzw. Store weitergegeben. Zudem stellt `StepEditor.tsx` sicher, dass beim Aufruf von `save()` aktive ungespeicherte Eingaben zuverlässig erfasst und persistiert werden.
- **Wizard-Schrittwechsel-Sicherheit**: Beim Klick auf „Weiter“ im Wizard-Schritt 3 (Schritte) werden Änderungen garantiert übertragen, bevor zur Vorschau navigiert wird.
- **Test-Absicherung**: Integrationstests für den URL-Import mit bestehenden Alias-Namen sowie Frontend-Tests für das unterbrechungsfreie Speichern von Zubereitungsschritten beim Schrittwechsel.

## Capabilities

### New Capabilities

- `recipe-step-editing`: Verlässliche und unterbrechungsfreie Bearbeitung und Persistierung von Rezeptschritten im Wizard und StepEditor.

### Modified Capabilities

- `recipe-import-field-completion`: Der URL-Import muss bei Namens- und Alias-Kollisionen robuster agieren und darf nicht bei bereits vergebenen Aliasen abbrechen.

## Impact

- **Backend**: `backend/recipe/services/url_import_service.py` (defensives Erstellen von `IngredientAlias`).
- **Food Frontend**: `frontend-food/src/components/recipe/StepInstructionEditor.tsx`, `frontend-food/src/components/recipe/StepEditor.tsx` (Eingabe-Synchronisation und Speichergating).
- **APIs & Schemas**: Keine Breaking Changes, keine neuen Pydantic/Zod-Felder erforderlich.
- **Datenbank/Migrationen**: Keine Migrationen erforderlich.
- **Tests**: Pytest in `backend/recipe/tests/test_url_import_errors.py` (oder neuer Import-Test) und Vitest in `frontend-food/src/components/recipe/StepEditor.test.tsx`.
