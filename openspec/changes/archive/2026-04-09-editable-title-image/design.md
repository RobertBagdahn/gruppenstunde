## Context

Alle Content-Detailseiten (SessionDetailPage, BlogDetailPage, GameDetailPage, RecipeDetailPage) zeigen ein Hero-Titelbild als statisches `<img>` an. Es gibt keine Möglichkeit, das Bild inline zu bearbeiten. Die Backend-Infrastruktur ist vollständig vorhanden:

- **Image-Upload-Endpunkte** existieren für alle vier Content-Typen (`POST /{id}/image/`), akzeptieren `multipart/form-data`
- **KI-Bildgenerierung** via `POST /api/content/ai/generate-image/` (Gemini, liefert WebP-URLs)
- **GCS-Integration** in Produktion (`gruppenstunde-media` Bucket), lokaler Dateispeicher in Entwicklung
- **Frontend-Upload-Hook** existiert nur für Recipe (`useUploadRecipeImage`), nicht für Session/Blog/Game
- **`useGenerateImage`** Hook existiert bereits in `frontend/src/api/ai.ts`
- Es gibt kein UI zum Entfernen eines Titelbilds und keinen Backend-Endpunkt dafür

Das `InlineEditor`-Pattern (für Text-Felder) existiert bereits und zeigt bei `can_edit`-Berechtigung Edit-Overlays.

## Goals / Non-Goals

**Goals:**
- Wiederverwendbare `TitleImageEditor`-Komponente, die auf allen vier Content-Detailseiten funktioniert
- Drei Aktionen: Datei-Upload, KI-Bildgenerierung mit Vorschau/Auswahl, Bild entfernen
- Upload-Hooks für alle Content-Typen (Session, Blog, Game ergänzen)
- Backend-Endpunkt zum Entfernen des Titelbilds (generisch auf Content-Ebene oder pro Typ)
- Mobile-First UI (Overlay auf dem Hero-Image, nicht separate Seite)

**Non-Goals:**
- Bild-Cropping oder -Bearbeitung im Browser
- Drag-and-Drop Upload
- Batch-Upload mehrerer Bilder
- Bild-Galerie oder Bild-History
- Änderung des Bild-Speicherformats (bleibt WebP via Backend)
- Anpassung der KI-Bildgenerierungs-Logik im Backend

## Decisions

### 1. Generische `TitleImageEditor`-Komponente statt pro-Typ-Lösung

**Entscheidung**: Eine einzige `TitleImageEditor`-Komponente in `frontend/src/components/content/TitleImageEditor.tsx`, die via Props (`contentType`, `contentId`, `imageUrl`, `title`, `summary`, Mutations) konfiguriert wird.

**Begründung**: Alle vier Content-Typen haben identische Hero-Image-Struktur. Code-Duplikation vermeiden. Das `ContentImage`-Pattern (aus square-images Spec) zeigt, dass generische Bild-Komponenten gut funktionieren.

**Alternative verworfen**: Vier separate Komponenten pro Content-Typ -- unnötige Duplikation.

### 2. Overlay-Ansatz mit Aktions-Dropdown

**Entscheidung**: Bei `can_edit === true` wird ein halbtransparentes Overlay mit einem Edit-Button über dem Hero-Image angezeigt. Klick öffnet ein Dropdown/Popover mit drei Optionen:
- "Bild hochladen" (öffnet Datei-Dialog)
- "Bild mit KI generieren" (öffnet Modal mit Prompt-Eingabe und Vorschau)
- "Bild entfernen" (mit Bestätigung)

**Begründung**: Minimal-invasiv, stört die Darstellung nicht, konsistent mit dem InlineEditor-Pattern.

### 3. KI-Bild-Modal mit Prompt und Vorschau-Grid

**Entscheidung**: Ein Modal (`Dialog` von shadcn/ui) mit:
- Vorausgefülltem Prompt-Feld (basierend auf `title` + `summary`)
- "Generieren"-Button
- Grid-Vorschau der generierten Bilder (1-4 Bilder)
- Klick auf ein Bild wählt es aus und setzt es als Titelbild

**Begründung**: Der bestehende `/api/content/ai/generate-image/` Endpunkt liefert `image_urls: string[]`. Der User soll aus den Ergebnissen wählen können.

### 4. Generischer Delete-Image-Endpunkt pro Content-Typ

**Entscheidung**: Neuer `DELETE /{id}/image/` Endpunkt in jeder Content-App (Session, Blog, Game, Recipe). Setzt `image` Feld auf `None` und speichert.

**Begründung**: Konsistent mit dem bestehenden `POST /{id}/image/` Upload-Pattern. Ein generischer Content-Endpunkt wäre eleganter, aber die Router-Struktur ist pro App organisiert. Vier kleine Endpunkte sind einfacher zu implementieren.

**Alternative verworfen**: Generischer Endpunkt in der `content` App -- würde die bestehende Router-Architektur durchbrechen.

### 5. Upload-Hook-Pattern nach bestehendem Recipe-Vorbild

**Entscheidung**: `useUploadSessionImage`, `useUploadBlogImage`, `useUploadGameImage` werden analog zu `useUploadRecipeImage` implementiert. Zusätzlich `useDeleteSessionImage`, `useDeleteBlogImage`, `useDeleteGameImage`, `useDeleteRecipeImage`.

**Begründung**: Bewährtes Pattern, invalidiert korrekt die Query-Caches.

### 6. Generischer `useSetContentImage` Hook zum Setzen einer KI-generierten URL

**Entscheidung**: Nach der KI-Bildgenerierung wird die ausgewählte URL via einen neuen `POST /{id}/image-url/` Endpunkt gesetzt (oder der bestehende Upload-Endpunkt wird erweitert, um auch URLs zu akzeptieren). Am einfachsten: Frontend fetcht das KI-Bild als Blob und uploadet es über den bestehenden Upload-Endpunkt.

**Begründung**: Die KI-generierten Bilder liegen bereits auf GCS/lokalen Storage (vom AI-Service hochgeladen). Statt einen neuen Endpunkt zu bauen, kann das Frontend das Bild fetchen und als File re-uploaden. Alternativ: Neuer Endpunkt `POST /{id}/image-from-url/` der das Bild serverseitig kopiert.

**Finale Entscheidung**: Neuer Backend-Endpunkt `POST /{id}/image-from-url/` der eine URL akzeptiert, das Bild herunterlädt und im `image`-Feld speichert. Vermeidet doppelten Transfer (GCS → Browser → GCS).

**Betroffene Dateien:**

Backend:
- `backend/session/api.py` -- Delete-Image Endpunkt + Image-from-URL Endpunkt
- `backend/blog/api.py` -- Delete-Image Endpunkt + Image-from-URL Endpunkt
- `backend/game/api.py` -- Delete-Image Endpunkt + Image-from-URL Endpunkt
- `backend/recipe/api/recipes.py` -- Delete-Image Endpunkt + Image-from-URL Endpunkt

Frontend:
- `frontend/src/components/content/TitleImageEditor.tsx` -- Neue Komponente
- `frontend/src/api/sessions.ts` -- `useUploadSessionImage`, `useDeleteSessionImage`, `useSetSessionImageFromUrl`
- `frontend/src/api/blogs.ts` -- `useUploadBlogImage`, `useDeleteBlogImage`, `useSetBlogImageFromUrl`
- `frontend/src/api/games.ts` -- `useUploadGameImage`, `useDeleteGameImage`, `useSetGameImageFromUrl`
- `frontend/src/api/recipes.ts` -- `useDeleteRecipeImage`, `useSetRecipeImageFromUrl`
- `frontend/src/pages/sessions/SessionDetailPage.tsx` -- TitleImageEditor Integration
- `frontend/src/pages/blogs/BlogDetailPage.tsx` -- TitleImageEditor Integration
- `frontend/src/pages/games/GameDetailPage.tsx` -- TitleImageEditor Integration
- `frontend/src/pages/recipes/RecipeDetailPage.tsx` -- TitleImageEditor Integration

**Keine Datenbank-Migrationen nötig** -- das `image` ImageField existiert bereits auf dem abstrakten `Content` Model.

## Risks / Trade-offs

- **[KI-Generierung dauert lange (5-15s)]** → Skeleton/Spinner im Modal, User kann abbrechen. Bestehender `useGenerateImage` Hook handhabt das bereits.
- **[500KB Upload-Limit]** → Frontend-seitige Validierung vor Upload mit klarer deutscher Fehlermeldung. Backend validiert ebenfalls.
- **[Image-from-URL: Security]** → Backend validiert, dass die URL vom eigenen Storage stammt (gleiche Domain/Bucket). Keine beliebigen URLs akzeptieren.
- **[Mehrere Endpunkte pro Content-Typ]** → Code-Duplikation in den vier Apps. Akzeptabel, da die Endpunkte minimal sind (je ~15 Zeilen). Später ggf. in Content-Mixin extrahieren.
