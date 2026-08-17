## Why

Die Content-Detailseiten (GroupSession, Blog, Game, Recipe) zeigen das Titelbild aktuell nur statisch an. Autoren haben keine Möglichkeit, das Bild direkt auf der Detailseite zu ändern -- weder per Upload noch per KI-Generierung. Backend-Endpunkte für Image-Upload und KI-Bildgenerierung existieren bereits, aber das Frontend nutzt sie nicht in den Detailseiten. Die Funktion soll den Content-Erstellungsworkflow deutlich vereinfachen.

## What Changes

- Neues `TitleImageEditor`-Komponente für alle Content-Detailseiten, das bei `can_edit`-Berechtigung über dem Titelbild ein Edit-Overlay anzeigt
- Drei Aktionen im Editor:
  - **Bild hochladen**: Datei-Upload (lokal im Filesystem, in Produktion via GCS)
  - **KI-Bild generieren**: Nutzt den bestehenden `/api/content/ai/generate-image/` Endpunkt mit Vorschauauswahl
  - **Bild entfernen**: Löscht das aktuelle Titelbild
- Fehlende `useUploadImage`-Hooks für Session, Blog und Game erstellen (nur Recipe hat bereits einen)
- Neuer Backend-Endpunkt zum Entfernen des Titelbilds (oder Erweiterung der bestehenden Update-Endpunkte)
- Integration in alle vier Detailseiten: `SessionDetailPage`, `BlogDetailPage`, `GameDetailPage`, `RecipeDetailPage`

## Capabilities

### New Capabilities
- `title-image-editor`: Frontend-Komponente und Hooks für das Editieren, Hochladen und KI-Generieren von Titelbildern auf Content-Detailseiten

### Modified Capabilities
- `ai-features`: Erweiterte Nutzung der bestehenden KI-Bildgenerierung durch Integration in die Detailseiten (keine Spec-Änderung nötig, nur Nutzung)
- `content-base`: Neuer Endpunkt zum Entfernen des Titelbilds auf Content-Ebene

## Impact

- **Backend-Apps**: `content` (neuer Delete-Image-Endpunkt oder Image-Clearing via Update), `session`, `blog`, `game`, `recipe` (alle haben bereits Upload-Endpunkte)
- **Frontend-Pages**: `SessionDetailPage`, `BlogDetailPage`, `GameDetailPage`, `RecipeDetailPage` -- alle erhalten den neuen `TitleImageEditor`
- **Pydantic-Schemas**: Keine neuen Schemas nötig (bestehende Upload-Endpunkte nutzen `File`, KI-Endpunkt existiert)
- **Zod-Schemas**: Ggf. Erweiterung der Response-Schemas um `image_url`-Bestätigung nach Upload
- **API-Hooks**: Neue `useUploadSessionImage`, `useUploadBlogImage`, `useUploadGameImage` Hooks (analog zu bestehendem `useUploadRecipeImage`)
- **Neue Komponente**: `TitleImageEditor` in `frontend/src/components/content/`
- **Migrations**: Keine neuen Migrations nötig (ImageField existiert bereits auf Content)
- **Storage**: Lokal `MEDIA_ROOT` in Entwicklung, GCS in Produktion (bestehende Konfiguration)
