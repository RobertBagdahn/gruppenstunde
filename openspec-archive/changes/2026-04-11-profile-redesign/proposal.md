## Why

Der Profilbereich ist aktuell unübersichtlich und redundant: Name lässt sich an zwei Stellen bearbeiten (NamePage + EinstellungenPage), die Navigation hat zwei identisch benannte "Einstellungen"-Einträge, StammPage.tsx ist eine 1:1-Kopie von GruppenPage.tsx, und die Seiten verwenden inkonsistente UI-Patterns (raw HTML statt shadcn/ui). Nutzer müssen sich durch zu viele Unterseiten navigieren, um ihr Profil zu verwalten. Das Profil soll zu einer einzigen, schönen, übersichtlichen Seite konsolidiert werden — mit Icons, Farben und dem Inspi-Designsystem.

Zusätzlich fehlen Features, die das Profil lebendiger und nützlicher machen: eine Vollständigkeitsanzeige motiviert zum Ausfüllen, ein Sichtbarkeits-Toggle gibt Kontrolle über die eigene Privatsphäre, und eine Profilvorschau zeigt wie andere das Profil sehen.

## What Changes

- **BREAKING** — `NamePage.tsx` wird entfernt und `/profile/name` Route gelöscht. Name-Bearbeitung wird in die neue Profilseite integriert
- **BREAKING** — `EinstellungenPage.tsx` wird entfernt und `/profile/settings` Route gelöscht. Alle Einstellungen in die neue Profilseite integriert
- **BREAKING** — `ProfilePage.tsx` (Suchpräferenzen) wird entfernt und `/profile` Route wird zur neuen konsolidierten Profilseite
- **BREAKING** — `StammPage.tsx` (exakte Kopie von GruppenPage) wird gelöscht
- **BREAKING** — Profil-Navigation wird komplett neu strukturiert mit klaren, unterschiedlichen Labels
- Neue konsolidierte Profilseite unter `/profile` mit Sektionen: Profil-Header (Avatar, Name, Scout-Name), persönliche Daten, Suchpräferenzen, Schnellzugriff
- Alle Profil-Formulare migriert auf shadcn/ui Komponenten (Input, Select, Button, Card, Avatar, Switch, Progress, Textarea)
- Profilbild-Upload UI wird hinzugefügt (Backend-Endpoint existiert bereits im Model, aber kein Frontend-Upload)
- `NamePage.tsx` raw `fetch()` Call wird eliminiert — alles über `useUpdateMyProfile()` Hook
- Navigation-Sidebar bekommt klare Icons und eindeutige Labels (kein doppeltes "Einstellungen")
- **Profil-Vollständigkeitsanzeige** — Progress-Bar im Header motiviert zum Ausfüllen aller Felder (rein client-seitig berechnet)
- **Profil-Sichtbarkeit Toggle** — `is_public` Switch im Header, Backend-Check in Public-Profile-API
- **Profilvorschau** — "So sehen andere dich"-Link in der Schnellzugriff-Sektion
- **Dashboard-Avatar-Sync** — MyDashboardPage zeigt Profilbild statt nur Initialen
- Mobile-first Layout mit Cards, Icons und Inspi-Farben

## Capabilities

### New Capabilities

- `profile-page-redesign`: Konsolidierte Profilseite mit Avatar-Header, Vollständigkeitsanzeige, is_public Toggle, persönliche Daten Sektion, Suchpräferenzen Sektion, Schnellzugriff mit Profilvorschau — ersetzt NamePage, EinstellungenPage und ProfilePage

### Modified Capabilities

- `user-profiles`: Navigation wird reduziert (3 Seiten statt 6), neue Seitenstruktur unter `/profile`, `is_public` wird in Update-Schema aufgenommen, Public-Profile-API respektiert `is_public` Flag

## Impact

**Frontend:**
- Gelöschte Dateien: `NamePage.tsx`, `EinstellungenPage.tsx`, `ProfilePage.tsx`, `StammPage.tsx`
- Neue Datei: `ProfilePage.tsx` (konsolidiert, komplett neu geschrieben)
- Geändert: `App.tsx` (Routes), `Layout.tsx` (Navigation-Items)
- Geändert: `MyDashboardPage.tsx` (Avatar zeigt Profilbild)
- Geändert: `api/profile.ts` (Profilbild-Upload Mutations)
- Geändert: `schemas/profile.ts` (Profilbild-Response + is_public im Update-Schema)
- Neue shadcn/ui Komponenten installieren: Avatar, Select, Textarea, Switch, Progress

**Backend:**
- Neuer API-Endpoint: `POST /api/profile/me/picture/` für Profilbild-Upload
- Neuer API-Endpoint: `DELETE /api/profile/me/picture/` für Profilbild-Löschung
- Geändert: `GET /api/profile/{userId}/` respektiert `is_public` Flag (404 wenn nicht öffentlich)
- Geändert: `UserProfileUpdateIn` bekommt `is_public` Feld
- Betroffen: `profiles/api/profile.py`, `profiles/schemas/profile.py`

**Keine DB-Migrationen erforderlich** — das UserProfile-Model hat bereits alle Felder (profile_picture, is_public etc.).

**Betroffene Schemas:**
- Backend: `UserProfileOut`, `UserProfileUpdateIn` (erweitert um `is_public`)
- Frontend Zod: `UserProfileSchema`, `UserProfileUpdateSchema` (synchron halten + `is_public`)
