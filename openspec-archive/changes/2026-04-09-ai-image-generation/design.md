## Context

Die KI-Bild-Generierung ist produktionsbereit im Backend implementiert:
- `ContentAIService.generate_images()` in `backend/content/services/ai_service.py` nutzt `gemini-3.1-flash-image-preview`
- API: `POST /api/content/ai/generate-image/` mit Input `{prompt, title, summary, content_type}` → Output `{image_urls: string[]}`
- Frontend-Hook `useGenerateImage()` in `frontend/src/api/ai.ts` existiert bereits
- Bilder werden als WebP (512px, 1:1) in GCS gespeichert
- Jeder Content-Typ hat eine eigene Image-Upload-API

Aktuell wird die Generierung nur im Content-Stepper (Erstellungs-Flow) genutzt. Die Detailseiten haben keinen Button dafür.

## Goals / Non-Goals

**Goals:**
- Zauberstab-Button auf allen Content-Detailseiten (nur für berechtigte User)
- Nahtlose UX: Generieren → Vorschau → Übernehmen/Verwerfen
- Wiederverwendbare Komponente für alle 4 Content-Typen

**Non-Goals:**
- Backend-API ändern (ist vollständig)
- Prompt-Customization durch den User (automatisch aus Titel + Summary generiert)
- Bild-Bearbeitung (Crop, Filter etc.)
- Mehrere Bilder zur Auswahl generieren (nur 1 pro Klick)

## Decisions

### 1. Wiederverwendbare Komponente mit Content-Type-Parameter

**Entscheidung:** Eine `AiImageGenerateButton`-Komponente die `contentType`, `title`, `summary`, `contentId` und die passende `uploadMutation` als Props erhält.

**Begründung:** Alle 4 Content-Typen haben identische Logik, nur der Upload-Endpunkt unterscheidet sich.

### 2. Overlay über dem bestehenden Bild

**Entscheidung:** Der Zauberstab-Button wird als schwebender Button (Overlay) über dem Hero-Bild angezeigt. Während der Generierung wird ein halbtransparenter Ladeindikator über das Bild gelegt.

**Alternative:** Button unter dem Bild — abgelehnt, weil es visuell weniger intuitiv ist und mehr Platz braucht.

### 3. Berechtigungsprüfung im Frontend

**Entscheidung:** Button nur rendern wenn `user.isStaff || user.isAuthor(content)`. Das Backend prüft Berechtigungen zusätzlich bei der Upload-API.

## Risks / Trade-offs

**[Lange Wartezeit (bis 240s)]** → Loading-Spinner mit Animationstext (z.B. „Bild wird generiert... Das kann bis zu 4 Minuten dauern"). Kein Timeout im Frontend (Vite-Proxy hat 5 Min Timeout).

**[Kosten bei häufiger Nutzung]** → Keine Rate-Limits nötig, da nur Editoren/Admins Zugriff haben (wenige User).
