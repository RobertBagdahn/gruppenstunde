## Why

Die Codebasis enthält mehrere Bugs, Dead Code und veraltete Dokumentation, die vor der Implementierung neuer Event-Features bereinigt werden müssen. Diese Probleme wurden bei einer umfassenden Konsistenzprüfung (Artifacts ↔ Code ↔ AGENTS.md) identifiziert.

Konkret:
- **Backend-Bugs**: `city` fehlt im `ParticipantOut` Schema obwohl das Model es hat. Day-Slot-Parameter nutzt `{slug}` statt `{event_slug}` inkonsistent.
- **Frontend-Bugs**: `city` fehlt in Zod-Schemas. `useNutritionalTags()` in `events.ts` zeigt auf toten API-Pfad `/api/ideas/nutritional-tags/`. `PersonsPage.tsx` importiert die kaputte Version statt die korrekte aus `supplies.ts`.
- **Dead Code**: `CreateIdeaPage.tsx` und `RefurbishPage.tsx` sind nicht im Router, posten an `/api/ideas/` (existiert nicht mehr). `ContentStepper.tsx` hat die Funktionalität bereits übernommen. `IDEA_TYPE_OPTIONS` in `idea.ts` wird nach Löschung der Dead-Code-Pages nicht mehr benötigt.
- **Veraltete AGENTS.md**: Alle drei AGENTS.md-Dateien enthalten Feature-Dokumentation, die in OpenSpec gehört. `event/AGENTS.md` ist komplett redundant. Die Dateien müssen auf Kern-Konventionen (WIE wird gebaut) verschlankt werden.

## What Changes

### Backend-Fixes
- `city` zu `ParticipantOut` und `PersonOut` Schemas hinzufügen
- Day-Slot API-Parameter von `{slug}` auf `{event_slug}` vereinheitlichen (Konsistenz mit anderen Event-Sub-Endpunkten)

### Frontend-Fixes
- `city` zu `ParticipantSchema` und `PersonSchema` in Zod hinzufügen
- `useNutritionalTags()` aus `events.ts` entfernen (kaputte Version)
- `PersonsPage.tsx` Import auf korrekte Version aus `supplies.ts` umstellen
- `CreateIdeaPage.tsx` löschen (Dead Code)
- `RefurbishPage.tsx` löschen (Dead Code)
- `IDEA_TYPE_OPTIONS` aus `idea.ts` entfernen (nicht mehr referenziert nach Dead-Code-Löschung)
- `useUpdateBookingOption` Hook im Frontend ergänzen (Backend-Endpunkt existiert bereits)

### AGENTS.md Verschlankung
- Root `AGENTS.md`: Von ~348 auf ~80 Zeilen — nur Kernprinzipien, Sprache, Architektur-Entscheidungen, Arbeitsablauf
- `backend/AGENTS.md`: Von ~334 auf ~60 Zeilen — nur Build-Konventionen, Django-Patterns, API-Patterns
- `frontend/AGENTS.md`: Von ~288 auf ~80 Zeilen — nur UI-Patterns, Component-Konventionen, State-Management
- `backend/event/AGENTS.md`: Löschen — alles Feature-Doku, gehört in OpenSpec
