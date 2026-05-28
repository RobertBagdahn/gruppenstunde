## Why

Beim Erstellen eines Rezepts über die KI-Beschreibung (ContentStepper → `/api/content/ai/refurbish/`) werden keine Zutaten vorgeschlagen. Die Zutatenliste bleibt leer, obwohl das Backend die Logik für `suggested_ingredients` bereits implementiert hat. Ursache: Der Frontend-Call sendet keinen `content_type: "recipe"` mit, daher greift der Backend-Default `"session"` und der Zutaten-Branch wird übersprungen.

## What Changes

- Frontend `useRefurbish()` Mutation erhält `content_type` als Parameter
- `ContentStepper` bekommt eine Prop für den Content-Type und gibt ihn an die Refurbish-Mutation weiter
- `CreateRecipePage` übergibt `content_type: "recipe"` an den ContentStepper

## Capabilities

### New Capabilities

_(keine — die Fähigkeit existiert im Backend bereits)_

### Modified Capabilities

_(keine Spec-Level-Änderungen — es handelt sich um einen Bug-Fix in der Frontend-Integration)_

## Impact

- **Frontend-Food**: `src/api/ai.ts` (useRefurbish Signatur), `src/components/content/ContentStepper.tsx` (neue Prop + Weitergabe), `src/pages/recipes/CreateRecipePage.tsx` (Prop setzen)
- **Backend**: Keine Änderungen nötig — `content/api/ai.py` unterstützt `content_type` bereits
- **Schemas**: Keine Pydantic/Zod-Änderungen nötig (Backend-Schema `AiRefurbishIn` akzeptiert `content_type` bereits)
- **Migrationen**: Keine
