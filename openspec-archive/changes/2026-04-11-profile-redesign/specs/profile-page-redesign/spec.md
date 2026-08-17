## ADDED Requirements

### Requirement: Konsolidierte Profilseite

Das System MUST eine konsolidierte Profilseite unter `/profile` bereitstellen, die alle persönlichen Daten und Suchpräferenzen in einer einzigen Ansicht zusammenfasst.

#### Scenario: Profilseite anzeigen

- **GIVEN** ein authentifizierter Benutzer
- **WHEN** der Benutzer `/profile` aufruft
- **THEN** wird eine Seite mit folgenden Sektionen angezeigt:
  1. Profil-Header mit Avatar, Name, Pfadfindername, E-Mail (read-only), Mitglied seit, Vollständigkeitsanzeige, Sichtbarkeits-Toggle
  2. Persönliche Daten (Geschlecht, Geburtstag, Über mich)
  3. Suchpräferenzen (Schwierigkeit, Ort, Gruppengröße)
  4. Schnellzugriff (Links zu Gruppen, Personen, Datenschutz, Profilvorschau)

#### Scenario: Nicht authentifizierter Zugriff

- **GIVEN** ein nicht authentifizierter Benutzer
- **WHEN** der Benutzer `/profile` aufruft
- **THEN** wird er auf `/login` umgeleitet

### Requirement: Profil-Header mit Avatar

Die Profilseite MUST einen Header-Bereich mit großem Avatar, vollständigem Namen, Pfadfindernamen und E-Mail-Adresse anzeigen.

#### Scenario: Header ohne Profilbild

- **GIVEN** ein authentifizierter Benutzer ohne Profilbild
- **WHEN** die Profilseite geladen wird
- **THEN** wird ein Platzhalter-Avatar mit den Initialen des Benutzers angezeigt
- **AND** der Avatar zeigt ein Kamera-Icon als Overlay beim Hover

#### Scenario: Header mit Profilbild

- **GIVEN** ein authentifizierter Benutzer mit Profilbild
- **WHEN** die Profilseite geladen wird
- **THEN** wird das Profilbild als runder Avatar angezeigt
- **AND** Name, Pfadfindername und E-Mail werden neben/unter dem Avatar dargestellt

#### Scenario: Profilbild hochladen über Avatar-Klick

- **GIVEN** ein authentifizierter Benutzer auf der Profilseite
- **WHEN** der Benutzer auf den Avatar klickt
- **THEN** öffnet sich ein File-Dialog
- **AND** nur Bildformate (JPEG, PNG, WebP) sind auswählbar
- **AND** nach Auswahl wird das Bild per `POST /api/profile/me/picture/` hochgeladen
- **AND** bei Erfolg wird der Avatar sofort aktualisiert
- **AND** bei Fehler wird eine Toast-Nachricht angezeigt

#### Scenario: Profilbild entfernen

- **GIVEN** ein authentifizierter Benutzer mit Profilbild
- **WHEN** der Benutzer auf "Bild entfernen" klickt
- **THEN** wird `DELETE /api/profile/me/picture/` aufgerufen
- **AND** der Avatar kehrt zum Initialen-Platzhalter zurück

### Requirement: Profil-Vollständigkeitsanzeige

Die Profilseite MUST eine Fortschrittsanzeige im Header anzeigen, die den Füllstand des Profils visualisiert.

#### Scenario: Vollständigkeitsanzeige bei leerem Profil

- **GIVEN** ein Benutzer mit nur Vorname (aus Registrierung)
- **WHEN** die Profilseite geladen wird
- **THEN** wird eine Progress-Bar mit niedrigem Prozentsatz angezeigt
- **AND** darunter werden die fehlenden Felder aufgelistet (z.B. "Fehlt: Profilbild, Pfadfindername, Nachname, Geburtstag, Über mich")

#### Scenario: Vollständigkeitsanzeige bei vollständigem Profil

- **GIVEN** ein Benutzer mit allen ausgefüllten Feldern
- **WHEN** die Profilseite geladen wird
- **THEN** wird die Progress-Bar bei 100% angezeigt
- **AND** keine fehlenden Felder werden aufgelistet

#### Scenario: Gewichtung der Felder

- **GIVEN** die Berechnung der Profil-Vollständigkeit
- **WHEN** die Gewichtung angewendet wird
- **THEN** gelten folgende Gewichte:
  - Vorname + Nachname: 15%
  - Pfadfindername: 15%
  - Profilbild: 20%
  - Geschlecht (nicht "keine Angabe"): 10%
  - Geburtstag: 10%
  - Über mich: 15%
  - Suchpräferenzen (mindestens ein Feld): 15%

#### Scenario: Vollständigkeit wird client-seitig berechnet

- **GIVEN** ein authentifizierter Benutzer
- **WHEN** die Profilseite geladen wird
- **THEN** wird die Vollständigkeit aus den vorhandenen Profil- und Präferenz-Daten berechnet
- **AND** es wird kein zusätzlicher API-Call benötigt

### Requirement: Profil-Sichtbarkeit Toggle

Die Profilseite MUST einen Switch im Header-Bereich anzeigen, der die öffentliche Sichtbarkeit des Profils steuert.

#### Scenario: Sichtbarkeits-Toggle anzeigen

- **GIVEN** ein authentifizierter Benutzer auf der Profilseite
- **WHEN** die Header-Card gerendert wird
- **THEN** wird ein Switch "Profil öffentlich" angezeigt
- **AND** darunter steht: "Dein Pfadfindername und 'Über mich' sind für andere sichtbar"

#### Scenario: Sichtbarkeit aktivieren

- **GIVEN** ein Benutzer mit `is_public = false`
- **WHEN** der Benutzer den Switch auf "An" stellt
- **THEN** wird `PATCH /api/profile/me/` mit `{ is_public: true }` aufgerufen
- **AND** bei Erfolg wird eine Toast-Nachricht "Profil ist jetzt öffentlich sichtbar" angezeigt

#### Scenario: Sichtbarkeit deaktivieren

- **GIVEN** ein Benutzer mit `is_public = true`
- **WHEN** der Benutzer den Switch auf "Aus" stellt
- **THEN** wird `PATCH /api/profile/me/` mit `{ is_public: false }` aufgerufen
- **AND** bei Erfolg wird eine Toast-Nachricht "Profil ist jetzt privat" angezeigt

### Requirement: Inline-Editing für persönliche Daten

Die Profilseite MUST inline-Bearbeitung der persönlichen Daten per Sektion ermöglichen.

#### Scenario: View-Mode anzeigen

- **GIVEN** ein authentifizierter Benutzer auf der Profilseite
- **WHEN** keine Sektion im Edit-Mode ist
- **THEN** werden alle Daten als read-only Text angezeigt
- **AND** jede Sektion hat einen "Bearbeiten"-Button mit Stift-Icon

#### Scenario: Edit-Mode für Profildaten aktivieren

- **GIVEN** ein Benutzer auf der Profilseite im View-Mode
- **WHEN** der Benutzer den "Bearbeiten"-Button der Profildaten-Sektion klickt
- **THEN** werden die Felder (Pfadfindername, Vorname, Nachname, Geschlecht, Geburtstag, Über mich) als editierbare Formularfelder angezeigt
- **AND** "Speichern" und "Abbrechen" Buttons erscheinen

#### Scenario: Profildaten speichern

- **GIVEN** ein Benutzer im Edit-Mode einer Sektion
- **WHEN** der Benutzer auf "Speichern" klickt
- **THEN** wird `PATCH /api/profile/me/` mit den geänderten Daten aufgerufen
- **AND** bei Erfolg wird die Sektion zurück in den View-Mode gewechselt
- **AND** eine Erfolgs-Toast-Nachricht "Profil aktualisiert" wird angezeigt

#### Scenario: Bearbeitung abbrechen

- **GIVEN** ein Benutzer im Edit-Mode einer Sektion
- **WHEN** der Benutzer auf "Abbrechen" klickt
- **THEN** werden die ursprünglichen Werte wiederhergestellt
- **AND** die Sektion wechselt zurück in den View-Mode

### Requirement: Inline-Editing für Suchpräferenzen

Die Profilseite MUST inline-Bearbeitung der Suchpräferenzen ermöglichen.

#### Scenario: Edit-Mode für Suchpräferenzen

- **GIVEN** ein Benutzer auf der Profilseite
- **WHEN** der Benutzer den "Bearbeiten"-Button der Suchpräferenzen-Sektion klickt
- **THEN** werden die Felder (Schwierigkeit, Ort, Gruppengröße min/max) als editierbare Formularfelder angezeigt

#### Scenario: Suchpräferenzen speichern

- **GIVEN** ein Benutzer im Edit-Mode der Suchpräferenzen-Sektion
- **WHEN** der Benutzer auf "Speichern" klickt
- **THEN** wird `PATCH /api/profile/me/preferences/` aufgerufen
- **AND** bei Erfolg wechselt die Sektion in den View-Mode

### Requirement: Schnellzugriff-Sektion mit Profilvorschau

Die Profilseite MUST eine Sektion mit Schnellzugriff-Links zu verwandten Bereichen und einer Profilvorschau anzeigen.

#### Scenario: Schnellzugriff-Links anzeigen

- **GIVEN** ein authentifizierter Benutzer auf der Profilseite
- **WHEN** die Seite geladen wird
- **THEN** werden Schnellzugriff-Karten angezeigt für:
  - "Gruppen" mit Icon `groups` → `/profile/groups`
  - "Personen" mit Icon `family_restroom` → `/profile/persons`
  - "Datenschutz" mit Icon `shield` → `/profile/privacy`
  - "Profilvorschau" mit Icon `visibility` → `/user/{eigene-user-id}`

#### Scenario: Profilvorschau-Link

- **GIVEN** ein authentifizierter Benutzer
- **WHEN** der Benutzer auf den "Profilvorschau"-Link klickt
- **THEN** wird er zu `/user/{eigene-user-id}` navigiert
- **AND** sieht sein Profil wie es andere Nutzer sehen

### Requirement: Dashboard-Avatar-Sync

Die MyDashboardPage MUST das Profilbild des Benutzers anzeigen wenn vorhanden.

#### Scenario: Dashboard mit Profilbild

- **GIVEN** ein Benutzer mit hochgeladenem Profilbild
- **WHEN** die Dashboard-Seite geladen wird
- **THEN** wird das Profilbild als Avatar im Header angezeigt (statt nur Initialen)

#### Scenario: Dashboard ohne Profilbild

- **GIVEN** ein Benutzer ohne Profilbild
- **WHEN** die Dashboard-Seite geladen wird
- **THEN** wird der bisherige Initialen-Kreis mit Gradient angezeigt

### Requirement: shadcn/ui Designsystem

Alle Profil-Formulare und UI-Elemente MUST ausschließlich shadcn/ui Komponenten verwenden.

#### Scenario: Formularfelder verwenden shadcn/ui

- **GIVEN** eine Profil-Sektion im Edit-Mode
- **WHEN** die Formularfelder gerendert werden
- **THEN** werden shadcn/ui Komponenten verwendet: `Input`, `Select`, `Button`, `Card`, `Avatar`, `Label`, `Textarea`, `Switch`, `Progress`
- **AND** keine raw HTML-`<input>`, `<select>` oder `<button>` Elemente

#### Scenario: Mobile-Responsive Layout

- **GIVEN** ein Benutzer auf einem Smartphone (320px Breite)
- **WHEN** die Profilseite geladen wird
- **THEN** werden alle Sektionen vertikal gestapelt
- **AND** der Avatar ist zentriert über dem Namen
- **AND** alle Touch-Targets sind mindestens 44x44px

### Requirement: Profilbild-Upload API

Das Backend MUST einen Endpoint für den Upload und das Löschen von Profilbildern bereitstellen.

#### Scenario: Profilbild hochladen

- **GIVEN** ein authentifizierter Benutzer
- **WHEN** `POST /api/profile/me/picture/` mit `multipart/form-data` (Feld: `file`) aufgerufen wird
- **THEN** wird das Bild gespeichert und `profile_picture` im UserProfile aktualisiert
- **AND** die Response enthält `{ profile_picture_url: string }`
- **AND** erlaubte Formate: JPEG, PNG, WebP
- **AND** maximale Dateigröße: 500 KB

#### Scenario: Ungültiges Format hochladen

- **GIVEN** ein authentifizierter Benutzer
- **WHEN** `POST /api/profile/me/picture/` mit einer nicht-Bild-Datei aufgerufen wird
- **THEN** wird HTTP 422 mit Fehlermeldung "Nur JPEG, PNG und WebP Bilder sind erlaubt" zurückgegeben

#### Scenario: Zu große Datei hochladen

- **GIVEN** ein authentifizierter Benutzer
- **WHEN** `POST /api/profile/me/picture/` mit einer Datei > 500KB aufgerufen wird
- **THEN** wird HTTP 422 mit Fehlermeldung "Maximale Dateigröße: 500 KB" zurückgegeben

#### Scenario: Profilbild löschen

- **GIVEN** ein authentifizierter Benutzer mit Profilbild
- **WHEN** `DELETE /api/profile/me/picture/` aufgerufen wird
- **THEN** wird das Profilbild entfernt und `profile_picture` auf null gesetzt
- **AND** die Response enthält `{ profile_picture_url: null }`
