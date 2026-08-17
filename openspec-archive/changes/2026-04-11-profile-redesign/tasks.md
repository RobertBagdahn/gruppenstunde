## 1. Aufräumen & Vorbereitung

- [x] 1.1 `frontend/src/pages/StammPage.tsx` löschen (exakte Kopie von GruppenPage)
- [x] 1.2 Prüfen ob StammPage irgendwo importiert wird und Referenzen entfernen
- [x] 1.3 Fehlende shadcn/ui Komponenten installieren: `npx shadcn@latest add avatar select textarea switch progress`

## 2. Backend — Profilbild-Upload API

- [x] 2.1 Pydantic Schema `ProfilePictureOut` in `backend/profiles/schemas/profile.py` hinzufügen (`profile_picture_url: str | None`)
- [x] 2.2 API-Endpoint `POST /api/profile/me/picture/` in `backend/profiles/api/profile.py` implementieren (multipart/form-data, max 500KB, jpeg/png/webp Validierung, Pattern von CI-Logo-Upload übernehmen)
- [x] 2.3 API-Endpoint `DELETE /api/profile/me/picture/` in `backend/profiles/api/profile.py` implementieren
- [x] 2.4 Backend-Tests für Profilbild-Upload und -Löschung in `backend/profiles/tests/` schreiben

## 3. Backend — is_public Enforcement

- [x] 3.1 `is_public` Feld zu `UserProfileUpdateIn` in `backend/profiles/schemas/profile.py` hinzufügen (`is_public: bool | None = None`)
- [x] 3.2 `GET /api/profile/{user_id}/` in `backend/profiles/api/profile.py` anpassen: 404 zurückgeben wenn `is_public=False` (Ausnahme: anfragender User ist Profilinhaber)
- [x] 3.3 Backend-Tests für is_public Check schreiben (öffentlich sichtbar, privat = 404, eigenes Profil immer sichtbar)

## 4. Frontend — Schema-Sync

- [x] 4.1 Zod Schema `ProfilePictureResponseSchema` in `frontend/src/schemas/profile.ts` hinzufügen (synchron mit Backend)
- [x] 4.2 `is_public` zu `UserProfileUpdateSchema` in `frontend/src/schemas/profile.ts` hinzufügen (`z.boolean().optional()`)
- [x] 4.3 TanStack Query Mutations `useUploadProfilePicture()` und `useDeleteProfilePicture()` in `frontend/src/api/profile.ts` hinzufügen (Pattern von `useUploadGroupLogo` übernehmen)
- [x] 4.4 Duplizierte `getCsrfToken()` und `fetchWithCsrf()` Helper aus `api/profile.ts` und `api/privacy.ts` in gemeinsame Utility extrahieren

## 5. Frontend — Neue konsolidierte ProfilePage

- [x] 5.1 Utility-Funktion `calculateProfileCompleteness(profile, preferences)` implementieren: gewichtete Berechnung (Name 15%, Pfadfindername 15%, Profilbild 20%, Geschlecht 10%, Geburtstag 10%, Über mich 15%, Suchpräferenzen 15%), gibt `{ percentage, missingFields }` zurück
- [x] 5.2 Neue `ProfilePage.tsx` erstellen mit Grundstruktur: Page-Layout, Loading/Error-States, `useMyProfile()` und `useMyPreferences()` Queries
- [x] 5.3 Profil-Header Card implementieren: Avatar (shadcn/ui `Avatar`), Name, Pfadfindername, E-Mail (read-only), Mitglied seit, Kamera-Overlay für Upload
- [x] 5.4 Profilbild-Upload im Avatar implementieren: versteckter File-Input, Format-Validierung (jpeg/png/webp), 500KB Limit, Upload-Mutation, sofortige Aktualisierung, "Bild entfernen" Option
- [x] 5.5 Profil-Vollständigkeitsanzeige implementieren: shadcn/ui `Progress` Bar mit Prozentzahl, darunter Liste fehlender Felder als Text
- [x] 5.6 Profil-Sichtbarkeit Toggle implementieren: shadcn/ui `Switch` für `is_public`, Beschreibungstext, sofortiger `PATCH /api/profile/me/` bei Toggle, Toast-Feedback
- [x] 5.7 Persönliche Daten Card implementieren: View-Mode (read-only Anzeige) und Edit-Mode (Formular mit shadcn/ui `Input`, `Select`, `Textarea`) für Pfadfindername, Vorname, Nachname, Geschlecht, Geburtstag, Über mich
- [x] 5.8 Suchpräferenzen Card implementieren: View-Mode und Edit-Mode für Schwierigkeit, Ort, Gruppengröße min/max mit `useUpdateMyPreferences()` Mutation
- [x] 5.9 Schnellzugriff Card implementieren: Links zu Gruppen (`groups`), Personen (`family_restroom`), Datenschutz (`shield`), Profilvorschau (`visibility` → `/user/{eigene-id}`)
- [x] 5.10 Mobile-Responsive testen: 320px, 375px, 768px — Avatar zentriert, Cards gestapelt, Touch-Targets 44x44px

## 6. Frontend — Dashboard-Avatar-Sync

- [x] 6.1 `MyDashboardPage.tsx` Header anpassen: Profilbild anzeigen wenn `profile_picture_url` vorhanden, sonst Initialen-Kreis wie bisher

## 7. Frontend — Routing & Navigation

- [x] 7.1 `App.tsx` anpassen: Alte Routes (`/profile/name`, `/profile/name/:userId`, `/profile/settings`) durch Redirects auf `/profile` ersetzen, `/profile` Route auf neue ProfilePage zeigen
- [x] 7.2 `Layout.tsx` Navigation anpassen: profileMenuItems auf 5 Einträge reduzieren (Mein Bereich, Profil, Gruppen, Personen, Datenschutz) mit eindeutigen Labels und Icons
- [x] 7.3 Alte Pages löschen: `NamePage.tsx` und `EinstellungenPage.tsx` entfernen
- [x] 7.4 Imports in `App.tsx` bereinigen: NamePage und EinstellungenPage Imports entfernen

## 8. Abschluss & Qualität

- [x] 8.1 TypeScript Build prüfen: keine `any` Typen, keine fehlenden Imports
- [x] 8.2 Keine `console.log` / `print` Statements in neuem Code
- [x] 8.3 Pydantic und Zod Schemas sind synchron (Profilbild-Upload Response, is_public im Update)
- [x] 8.4 Backend-Tests ausführen: `uv run pytest backend/profiles/tests/`
