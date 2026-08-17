## Why

Wenn Nutzer im Food-Frontend ein KI-Bild für ein Rezept generieren wollen, wird der Prompt aktuell generisch mit `title - summary` vorgefüllt. Das ergibt keinen guten Bild-Prompt. Ein rezeptspezifischer Vorschlag wie "Ein appetitliches Foto von Kartoffelsuppe" liefert bessere Ergebnisse und spart dem Nutzer Zeit.

## What Changes

- Pre-fill-Logik im `AiImageModal` wird content-type-aware: Für `recipe` wird ein Food-Foto-Template verwendet
- Kein neuer API-Endpoint, kein zusätzlicher AI-Call — rein Frontend-basiert
- Betrifft beide Frontends (`frontend/` und `frontend-food/`) da beide den gleichen `TitleImageEditor` haben

## Capabilities

### New Capabilities

_Keine neuen Capabilities — kleine UX-Verbesserung innerhalb bestehender Funktionalität._

### Modified Capabilities

- `title-image-editor`: Prompt-Vorschlag wird content-type-spezifisch statt generisch

## Impact

- **Frontend**: `frontend/src/components/content/TitleImageEditor.tsx` und `frontend-food/src/components/content/TitleImageEditor.tsx`
- **Schemas**: Keine Änderungen an Pydantic/Zod-Schemas
- **Migrations**: Keine
- **API**: Keine Änderungen
