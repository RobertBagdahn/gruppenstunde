## Why

Die KI-Bild-Generierung ist bereits vollständig im Backend implementiert (`ContentAIService.generate_images()`, `POST /api/content/ai/generate-image/`), wird aber nur über den Content-Stepper bei der Erstellung genutzt. Editoren und Admins sollen direkt auf Detailseiten und in der Bearbeitungsansicht per Zauberstab-Button ein neues Bild generieren können — für alle Content-Typen (Rezepte, Gruppenstunden, Spiele, Blogs).

## What Changes

- **Zauberstab-Button** auf allen Content-Detailseiten: Nur sichtbar für Editoren/Admins, generiert per Klick ein neues Bild über die bestehende `POST /api/content/ai/generate-image/` API
- **Bild-Vorschau**: Nach Generierung wird das Bild als Vorschau angezeigt mit „Übernehmen" / „Verwerfen"-Optionen
- **Automatischer Upload**: Bei „Übernehmen" wird das generierte Bild über die bestehende Image-Upload-API (`POST /api/{content-type}/{id}/image/`) als neues Bild gesetzt
- **Loading-State**: Bild-Generierung dauert bis zu 240s — ein Ladeindikator mit Fortschrittsanzeige ist nötig

## Capabilities

### New Capabilities
- `ai-image-button`: Zauberstab-Button auf Content-Detailseiten für KI-Bild-Generierung (für Editoren/Admins)

### Modified Capabilities
_(keine — die bestehende AI-Image-API und Image-Upload-APIs bleiben unverändert)_

## Impact

### Frontend (React)
- **Neue Komponente**: `AiImageGenerateButton.tsx` — wiederverwendbar für alle Content-Typen
- **Detailseiten**: `RecipeDetailPage.tsx`, `SessionDetailPage.tsx`, `GameDetailPage.tsx`, `BlogDetailPage.tsx` — Button neben/über dem Bild einbauen
- **Bestehende Hooks nutzen**: `useGenerateImage()` aus `frontend/src/api/ai.ts`, bestehende Image-Upload-Mutations

### Backend
- **Keine Änderungen nötig** — alle APIs existieren bereits:
  - `POST /api/content/ai/generate-image/` (Generierung)
  - `POST /api/recipes/{id}/image/` etc. (Upload)
- **Keine Migrationen**
- **Keine Schema-Änderungen**
