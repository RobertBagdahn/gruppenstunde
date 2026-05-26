## Why

Inspi speichert personenbezogene Daten an vielen Stellen (UserProfile, Person, Participant, ContentView, SearchLog, etc.), bietet Nutzern aber keine Möglichkeit, ihre Daten einzusehen, zu exportieren oder ihr Konto zu löschen. Das verstößt gegen DSGVO Art. 15 (Auskunftsrecht), Art. 17 (Recht auf Löschung) und Art. 20 (Datenübertragbarkeit). Da die Plattform für Pfadfindergruppen – oft mit minderjährigen Teilnehmern – eingesetzt wird, ist eine datenschutzkonforme Umsetzung besonders wichtig und dringend.

## What Changes

- **Neuer "Meine Daten"-Bereich** im Profil: Übersichtsseite, die zeigt, welche personenbezogenen Daten wo gespeichert sind (Profil, Events, Kommentare, Views, etc.)
- **Datenexport (DSGVO Art. 20)**: API-Endpunkt + UI-Button zum Download aller eigenen Daten als JSON-Datei
- **Konto löschen (DSGVO Art. 17)**: API-Endpunkt + UI-Flow mit Bestätigungsdialog, der alle personenbezogenen Daten anonymisiert/löscht
- **Anonymisierungsstrategie**: Statt Cascade-Delete werden User-Referenzen auf `NULL` gesetzt und personenbezogene Felder überschrieben, um Audit-Trails und Content-Integrität zu wahren
- **Daten-Übersicht pro Kategorie**: Aufschlüsselung in Kategorien (Profildaten, Event-Teilnahmen, erstellte Inhalte, Interaktionen/Analytics)
- **Automatische Datenbereinigung**: Management-Command für periodische Löschung alter Analytics-Daten (ContentView, SearchLog älter als 12 Monate)
- **Aktualisierte Datenschutzseite**: Verlinkung auf den neuen "Meine Daten"-Bereich und Erklärung der Lösch-/Export-Funktionen
- **Betroffene Django-Apps**: `profiles`, `event`, `content`, `core`, `planner`, `packinglist`, `shopping`
- **Betroffene React-Pages**: Neue Seite unter `/profile/privacy`, Update der DatenschutzPage, Einstellungen-Seite
- **Neue Pydantic-Schemas**: `UserDataExportSchema`, `AccountDeletionRequestSchema`, `DataOverviewSchema`
- **Neue Zod-Schemas**: Entsprechende Frontend-Schemas (1:1 Match)
- **Keine neuen Migrations nötig** (nur Lese-/Lösch-Operationen auf bestehenden Models)

## Capabilities

### New Capabilities
- `privacy-data-overview`: Übersichtsseite, die alle gespeicherten personenbezogenen Daten des Nutzers kategorisiert anzeigt
- `privacy-data-export`: DSGVO-konformer Export aller eigenen Daten als JSON-Download
- `privacy-account-deletion`: Vollständige Kontolöschung mit Anonymisierung aller verknüpften Daten
- `privacy-data-retention`: Automatische Bereinigung alter Analytics-/Tracking-Daten per Management-Command

### Modified Capabilities
- `user-profiles`: Neuer Navigationspunkt "Meine Daten & Datenschutz" im Profil-Bereich

## Impact

- **Backend-APIs**: Drei neue Endpunkte unter `/api/auth/privacy/` (data-overview, data-export, delete-account)
- **Frontend**: Neue Route `/profile/privacy` mit Unterseiten, Anpassung der Profil-Navigation
- **Datenbank**: Keine Schema-Änderungen, nur Lese- und Lösch-Operationen
- **Auth**: Konto-Löschung erfordert Passwort-Bestätigung (oder Session-Validierung für Konten ohne Passwort)
- **Event-Daten**: Besondere Behandlung von `Person`/`Participant`-Daten (Anonymisierung statt Löschung, da Event-Statistiken erhalten bleiben müssen)
- **Content**: `created_by`/`updated_by`-Referenzen werden auf NULL gesetzt, Content bleibt erhalten
- **Externe Abhängigkeiten**: Keine neuen Dependencies
