## Context

Der Profilbereich besteht aktuell aus 6 separaten Seiten mit überlappender Funktionalität:

- **NamePage** (`/profile/name`) — Nur Vor-/Nachname, nutzt raw `fetch()` gegen falschen Admin-Endpoint
- **EinstellungenPage** (`/profile/settings`) — Pfadfindername, Name, Geschlecht, Geburtstag, Über mich
- **ProfilePage** (`/profile`) — Suchpräferenzen (Schwierigkeit, Ort, Gruppengröße)
- **GruppenPage** (`/profile/groups`) — Gruppenverwaltung
- **PersonsPage** (`/profile/persons`) — Personenverwaltung für Events
- **PrivacyPage** (`/profile/privacy`) — DSGVO-Datenübersicht, Export, Kontolöschung

Probleme: Name wird doppelt bearbeitet, Navigation hat doppelte Labels, StammPage.tsx ist exakte Kopie, UI-Patterns sind inkonsistent (raw HTML vs. shadcn/ui), kein Profilbild-Upload trotz vorhandenem Backend-Feld, `is_public` Feld ohne UI, kein Avatar im Dashboard obwohl Daten vorhanden.

## Goals / Non-Goals

**Goals:**
- Konsolidierung von NamePage, EinstellungenPage und ProfilePage zu einer einzigen Profilseite
- Einheitliches shadcn/ui Design mit Cards, Avatar, Icons und Inspi-Farben
- Profilbild-Upload UI hinzufügen
- Profil-Vollständigkeitsanzeige (client-seitig berechnet, Gamification für Pfadfinder)
- Profil-Sichtbarkeit Toggle (`is_public`) mit Backend-Enforcement
- Profilvorschau ("So sehen andere dich")
- Dashboard-Avatar zeigt Profilbild
- Klare, übersichtliche Navigation mit eindeutigen Labels
- Mobile-first Layout (320px minimum)

**Non-Goals:**
- Keine Änderungen an GruppenPage, PersonsPage oder PrivacyPage (bleiben eigene Seiten)
- Kein Passwort-Ändern oder E-Mail-Ändern (separates Feature)
- Keine Änderungen am Backend-Datenmodell (UserProfile hat alle Felder)
- Keine Nutritional-Tags-Bearbeitung im Profil (Sync-Frage mit PersonsPage ungeklärt, Follow-up)
- Keine Benachrichtigungs-Einstellungen (komplett neues Feature, eigener Change)

## Decisions

### 1. Konsolidierung auf eine einzige Profilseite

**Entscheidung:** NamePage, EinstellungenPage und ProfilePage werden zu einer neuen `ProfilePage` unter `/profile` zusammengeführt.

**Warum:** Drei separate Seiten für zusammengehörige Daten fragmentieren die UX. Nutzer müssen nicht zwischen Seiten wechseln, um Name + Scout-Name + Präferenzen zu setzen.

**Alternative (verworfen):** Tab-basierte Lösung mit Profil/Einstellungen/Präferenzen als Tabs — zu komplex für den geringen Umfang der Daten, ein Scrollable Page reicht.

### 2. Card-basiertes Layout mit Sektionen

**Entscheidung:** Die Profilseite nutzt shadcn/ui `Card`-Komponenten als visuelle Sektionen:

1. **Profil-Header Card** — Avatar (klickbar für Upload), Name, Scout-Name, E-Mail (read-only), Mitglied seit, Vollständigkeitsanzeige, is_public Toggle
2. **Persönliche Daten Card** — Geschlecht, Geburtstag, Über mich (alle editierbar inline)
3. **Suchpräferenzen Card** — Schwierigkeit, Ort, Gruppengröße
4. **Schnellzugriff Card** — Links zu Gruppen, Personen, Datenschutz, Profilvorschau

**Warum:** Cards schaffen visuelle Gruppierung, sind Mobile-friendly und folgen dem shadcn/ui Design-System.

### 3. Inline-Editing statt separater Edit-Pages

**Entscheidung:** Jede Card-Sektion hat einen "Bearbeiten"-Button, der die Felder inline editierbar macht (Toggle zwischen View- und Edit-Mode pro Sektion).

**Warum:** Weniger Navigation, schnelleres Feedback. Der Nutzer sieht immer den aktuellen Zustand und kann gezielt Sektionen bearbeiten.

**Alternative (verworfen):** Modale Dialoge pro Feld — zu viele Klicks, schlechte Mobile-UX.

### 4. Profilbild-Upload mit Avatar-Klick

**Entscheidung:** Klick auf den Avatar öffnet einen File-Input. Backend-Endpoint `POST /api/profile/me/picture/` nimmt `multipart/form-data` entgegen. Der bestehende `profile_picture` ImageField im Model wird genutzt.

**Warum:** Das Backend-Model hat bereits das Feld, es fehlt nur der API-Endpoint und die Frontend-UI. Das Pattern folgt dem CI-Logo-Upload (`groups.py`): `UploadedFile = File(...)`, Größen-Check, `ImageField.save()`.

**API-Endpoints (neu):**
- `POST /api/profile/me/picture/` — Upload (multipart/form-data, max 500KB, jpeg/png/webp)
- `DELETE /api/profile/me/picture/` — Profilbild entfernen
- Response: `{ profile_picture_url: string | null }`

**Bildgröße: 500 KB** (nicht 2 MB wie in der alten Spec). Konsistent mit der Projekt-Konvention und dem CI-Logo-Upload-Limit.

**Backend-Dateien:**
- `backend/profiles/api/profile.py` — Neue Endpoints hinzufügen
- `backend/profiles/schemas/profile.py` — `ProfilePictureOut` Schema

**Frontend-Dateien:**
- `frontend/src/api/profile.ts` — `useUploadProfilePicture()` und `useDeleteProfilePicture()` Mutations
- `frontend/src/schemas/profile.ts` — `ProfilePictureResponseSchema` Zod Schema

### 5. Profil-Vollständigkeitsanzeige (Feature A)

**Entscheidung:** Client-seitige Progress-Bar im Profil-Header. Kein Backend-Endpoint nötig.

**Berechnung — gewichtete Felder:**

| Feld | Gewicht | Check |
|------|---------|-------|
| Vorname + Nachname | 15% | `first_name && last_name` |
| Pfadfindername | 15% | `scout_name !== ""` |
| Profilbild | 20% | `profile_picture_url !== null` |
| Geschlecht | 10% | `gender !== "no_answer"` |
| Geburtstag | 10% | `birthday !== null` |
| Über mich | 15% | `about_me !== ""` |
| Suchpräferenzen | 15% | Mindestens ein Feld gesetzt |

**Warum:** Profilbild und Name haben höheres Gewicht weil sie für andere Nutzer sichtbar sind. Pfadfinder lieben Fortschrittsanzeigen — Gamification-Effekt motiviert zum Ausfüllen.

**Implementierung:** Reine Utility-Funktion `calculateProfileCompleteness(profile, preferences)` → `{ percentage: number, missingFields: string[] }`. Wird in der Header-Card gerendert mit shadcn/ui `Progress`.

### 6. Profil-Sichtbarkeit Toggle (Feature D)

**Entscheidung:** `is_public` Switch im Profil-Header. Backend enforced `is_public` in der Public-Profile-API.

**Warum:** Das `is_public` Feld existiert seit dem ersten Model-Entwurf (default=false), hat aber weder UI noch Backend-Enforcement. Aktuell zeigt `GET /api/profile/{userId}/` jedes Profil — egal ob `is_public=true` oder nicht.

**Backend-Änderungen:**
- `UserProfileUpdateIn` bekommt `is_public: bool | None = None`
- `GET /api/profile/{userId}/` prüft `is_public` — gibt 404 zurück wenn `is_public=False` (außer der anfragende User ist der Profilinhaber selbst)

**Frontend-Änderungen:**
- `UserProfileUpdateSchema` bekommt `is_public: z.boolean().optional()`
- Switch-Komponente im Header (`npx shadcn@latest add switch`)
- Beschreibungstext: "Dein Pfadfindername und 'Über mich' sind für andere sichtbar"

### 7. Profilvorschau (Feature C)

**Entscheidung:** Einfacher Link zu `/user/{eigene-id}` in der Schnellzugriff-Sektion.

**Warum:** `UserProfilePage` und `GET /api/profile/{userId}/` existieren bereits. Ein `<Link>` reicht — kein neuer Code nötig.

**Alternative (verworfen):** Inline-Preview in einem Sheet/Dialog — mehr Aufwand, kein Mehrwert gegenüber der bestehenden Seite.

### 8. Dashboard-Avatar-Sync (Feature B)

**Entscheidung:** `MyDashboardPage.tsx` zeigt `profile_picture_url` wenn vorhanden, sonst Initialen-Kreis wie bisher.

**Warum:** Die Daten sind bereits geladen (`useMyProfile()`), werden aber ignoriert. 5-Zeilen-Fix.

**Betroffene Datei:** `frontend/src/pages/MyDashboardPage.tsx` (Header-Sektion, Zeilen 256-264)

### 9. Navigation-Redesign

**Entscheidung:** Profil-Navigation wird auf 5 klare Einträge reduziert:

| Icon | Label | Route | Beschreibung |
|------|-------|-------|-------------|
| `space_dashboard` | Mein Bereich | `/my-dashboard` | Dashboard |
| `person` | Profil | `/profile` | Konsolidierte Profilseite (NEU) |
| `groups` | Gruppen | `/profile/groups` | Gruppenverwaltung |
| `family_restroom` | Personen | `/profile/persons` | Personenverwaltung |
| `shield` | Datenschutz | `/profile/privacy` | DSGVO / Konto |

**Was wegfällt:**
- `/profile/name` — In Profil integriert
- `/profile/settings` — In Profil integriert
- Doppelter "Einstellungen"-Eintrag — Eliminiert

### 10. Aufräumen von totem Code

**Entscheidung:** StammPage.tsx (exakte Kopie von GruppenPage.tsx) wird gelöscht. NamePage.tsx und EinstellungenPage.tsx werden gelöscht. Die alte ProfilePage.tsx wird durch die neue ersetzt.

**Betroffene Dateien:**
- Löschen: `frontend/src/pages/StammPage.tsx`
- Löschen: `frontend/src/pages/NamePage.tsx`
- Löschen: `frontend/src/pages/EinstellungenPage.tsx`
- Ersetzen: `frontend/src/pages/ProfilePage.tsx` (komplett neu)
- Ändern: `frontend/src/App.tsx` (Routes entfernen/ändern)
- Ändern: `frontend/src/components/Layout.tsx` (Navigation-Items)
- Ändern: `frontend/src/pages/MyDashboardPage.tsx` (Avatar-Sync)

### 11. shadcn/ui Komponenten installieren

Folgende Komponenten fehlen und müssen vor der Implementierung installiert werden:

```bash
npx shadcn@latest add avatar select textarea switch progress
```

Bereits vorhanden: Button, Card, Input, Label, Dialog, Separator.

## Risks / Trade-offs

**[Risk] Bestehende Links auf `/profile/name` oder `/profile/settings` brechen**
→ Mitigation: Redirects in App.tsx hinzufügen. Rückwärtskompatibilität ist laut Projekt-Konvention nicht nötig, aber Redirects sind trivial.

**[Risk] Staff-Feature "Name eines anderen Users bearbeiten" (`/profile/name/:userId`) geht verloren**
→ Mitigation: War ohnehin kaputt (falscher API-Endpoint). Staff-Editing gehört in den Admin-Bereich.

**[Risk] `is_public` Backend-Check könnte bestehende Integrationen brechen**
→ Mitigation: Aktuell nutzt niemand die Public-Profile-API systematisch außer dem UserProfilePage-Frontend. Der Check hat eine Ausnahme für den eigenen User.

**[Risk] Profilbild-Upload erfordert neuen Backend-Endpoint**
→ Mitigation: Folgt 1:1 dem CI-Logo-Upload-Pattern. Model-Feld existiert.

**[Trade-off] Alle Profildaten auf einer Seite = längere Seite auf Mobile**
→ Akzeptabel: Die Datenmenge ist gering. Card-Sektionen im View-Mode sind kompakt. Inline-Editing klappt nur eine Sektion gleichzeitig auf.

**[Trade-off] Vollständigkeitsanzeige hat feste Gewichtung**
→ Akzeptabel: Rein client-seitig, leicht anpassbar. Keine Backend-Logik nötig.
