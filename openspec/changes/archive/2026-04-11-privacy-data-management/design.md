## Context

Inspi speichert personenbezogene Daten über 20+ Models hinweg in 7 Django-Apps (`profiles`, `event`, `content`, `planner`, `packinglist`, `shopping`, `core`). Die relevanten Daten umfassen:

- **Profildaten**: `auth.User` (Email, Name), `profiles.UserProfile` (Geburtstag, Geschlecht, Profilbild, About Me)
- **Event-Daten**: `event.Person` (Adresse, Kontakt), `event.Participant` (geklonte Personendaten pro Anmeldung), `event.Registration`, `event.Payment`, `event.CustomFieldValue`
- **Content-Interaktionen**: `content.ContentView` (gehashte IP, User-Agent), `content.SearchLog`, `content.ContentComment`, `content.ContentEmotion`
- **Planung**: `planner.Planner`, `packinglist.PackingList`, `shopping.ShoppingList` (jeweils Owner-FK)

Es gibt keine Möglichkeit für Nutzer, ihre Daten einzusehen, zu exportieren oder ihr Konto zu löschen. Die statische Datenschutzseite (`/privacy`) beschreibt Rechte, bietet aber keine Funktionalität.

**Betroffene Dateien:**
- Backend: `backend/profiles/`, `backend/event/`, `backend/content/`, `backend/core/api.py`, `backend/planner/`, `backend/packinglist/`, `backend/shopping/`
- Frontend: `frontend/src/pages/profile/`, `frontend/src/pages/DatenschutzPage.tsx`, `frontend/src/features/`

## Goals / Non-Goals

**Goals:**
- Nutzern vollständige Transparenz über gespeicherte personenbezogene Daten geben
- DSGVO Art. 15 (Auskunft) über eine kategorisierte Daten-Übersicht umsetzen
- DSGVO Art. 20 (Datenübertragbarkeit) über JSON-Export umsetzen
- DSGVO Art. 17 (Recht auf Löschung) über Konto-Löschung mit Anonymisierung umsetzen
- Automatische Bereinigung alter Analytics-Daten (Art. 5 Speicherbegrenzung)

**Non-Goals:**
- Consent-Management / Cookie-Banner (nur notwendige Cookies im Einsatz)
- Passwort-Änderung / Passwort-Reset (separates Feature)
- Email-Änderung (separates Feature)
- Admin-DSGVO-Tools (z.B. Nutzer-Daten löschen durch Admins)
- Granulare Datenlöschung (z.B. nur Event-Daten löschen, Profil behalten)
- Automatisierte Konto-Löschung bei Inaktivität

## Decisions

### 1. Anonymisierung statt Cascade-Delete

**Entscheidung**: Bei Konto-Löschung werden personenbezogene Felder überschrieben und User-FKs auf `NULL` gesetzt, statt den User und alle verknüpften Daten per CASCADE zu löschen.

**Rationale**: Die meisten FK-Beziehungen nutzen bereits `on_delete=SET_NULL`. Events, Content und Audit-Trails müssen erhalten bleiben (z.B. Event-Statistiken, veröffentlichte Inhalte). CASCADE würde veröffentlichte Gruppenstunden anderer Autoren beschädigen.

**Alternative**: CASCADE-Delete → Verworfen, da es Content-Integrität zerstört und Gruppen-Admins ihre Event-Daten verlieren würden.

**Anonymisierungs-Strategie:**
1. `auth.User`: `email` → `deleted-{uuid}@anon.local`, `first_name`/`last_name` → `""`, `username` → `deleted-{uuid}`, `is_active` → `False`, `set_unusable_password()`
2. `profiles.UserProfile`: Alle Felder leeren, Profilbild aus Cloud Storage löschen
3. `event.Person`: `first_name`/`last_name` → `"Gelöscht"`, `email`/`address`/`zip_code`/`city` → `""`, `birthday` → `None`
4. `event.Participant`: Gleiche Anonymisierung wie Person
5. `content.ContentComment`: `author_name` → `"Gelöscht"` (Kommentar-Text bleibt für Kontext)
6. `content.ContentView`/`SearchLog`: Direkt löschen (kein Audit-Wert)
7. Alle Owner-FKs (`planner`, `packinglist`, `shopping`): Werden durch `SET_NULL` automatisch anonymisiert

### 2. Zentraler Privacy-Service statt verteilte Logik

**Entscheidung**: Ein `PrivacyService` in der `profiles`-App koordiniert Datensammlung, Export und Löschung über alle Apps hinweg. Jede App registriert einen `PrivacyDataCollector`, der weiß, wie Daten für diese App gesammelt/anonymisiert werden.

**Rationale**: Vermeidet zirkuläre Imports und hält App-spezifische Logik in der jeweiligen App. Der Service orchestriert nur.

**Alternative**: Alles in `core` → Verworfen, da `core` keine App-spezifische Logik enthalten sollte.

**Pattern:**
```python
# profiles/services/privacy.py
class PrivacyService:
    collectors: list[PrivacyDataCollector]

    def collect_user_data(self, user: User) -> dict
    def export_user_data(self, user: User) -> dict
    def anonymize_user(self, user: User) -> None

# Jede App registriert einen Collector
class EventPrivacyCollector(PrivacyDataCollector):
    def collect(self, user: User) -> dict
    def anonymize(self, user: User) -> None
```

### 3. API-Endpunkte unter `/api/auth/privacy/`

**Entscheidung**: Drei neue Endpunkte im bestehenden `core` Auth-Router:

| Methode | Pfad | Request | Response | Beschreibung |
|---------|------|---------|----------|--------------|
| `GET` | `/api/auth/privacy/data-overview/` | - | `DataOverviewSchema` | Kategorisierte Übersicht aller Daten |
| `POST` | `/api/auth/privacy/data-export/` | - | `application/json` (Download) | JSON-Export aller Daten |
| `POST` | `/api/auth/privacy/delete-account/` | `DeleteAccountRequestSchema` | `{success: true}` | Konto anonymisieren + Session beenden |

**Rationale**: Alle drei Endpunkte betreffen den authentifizierten Nutzer und passen thematisch zur Auth-Domäne. POST für Export und Löschung, da sie Seiteneffekte haben (Download-Generierung / Datenlöschung).

### 4. Passwort-Bestätigung bei Konto-Löschung

**Entscheidung**: Der Delete-Endpunkt erfordert das aktuelle Passwort als Bestätigung. Für Konten ohne Passwort (Guest-Accounts) reicht die aktive Session.

**Rationale**: Schutz vor versehentlicher oder unautorisierter Löschung. Guest-Accounts haben `unusable_password` und können kein Passwort eingeben.

**Schema:**
```python
class DeleteAccountRequestSchema(Schema):
    password: str | None = None  # None für Guest-Accounts
    confirmation: str  # Muss "KONTO LÖSCHEN" sein
```

### 5. Frontend: Neue Route `/profile/privacy`

**Entscheidung**: Eine neue Seite im Profil-Bereich mit drei Tabs/Sections:
1. **Datenübersicht** — Kategorisiert nach App (Profil, Events, Inhalte, Tracking)
2. **Daten exportieren** — Button mit Fortschrittsanzeige
3. **Konto löschen** — Roter Gefahrenbereich mit Bestätigungsdialog

**Betroffene Dateien:**
- Neue Page: `frontend/src/pages/profile/PrivacyPage.tsx`
- Route: In `frontend/src/App.tsx` hinzufügen
- Navigation: In `frontend/src/components/Layout.tsx` Profil-Menü erweitern
- API-Hook: `frontend/src/features/profile/hooks/usePrivacy.ts`
- Zod-Schemas: `frontend/src/features/profile/api/privacy.ts`

### 6. Data Retention: Management-Command

**Entscheidung**: Ein Django Management-Command `cleanup_analytics` löscht `ContentView` und `SearchLog` Einträge älter als 12 Monate. Ausführung per Cron-Job in Cloud Run.

**Alternative**: Celery-Task → Verworfen, da kein Celery im Stack.

## Risks / Trade-offs

- **[Datenintegrität bei Anonymisierung]** → Gründliche Tests mit allen FK-Beziehungen. Anonymisierung in einer DB-Transaktion ausführen.
- **[Performance bei großem Datenexport]** → Export synchron, da Nutzerdatenvolumen begrenzt ist (kein Celery nötig). Bei Bedarf Timeout auf 30s setzen.
- **[Guest-Account Löschung]** → Guest-Accounts (erstellt durch Event-Gast-Registrierung) können ohne Passwort gelöscht werden, solange eine aktive Session besteht. Risiko: Jemand mit Zugang zum Gerät könnte löschen. Mitigation: Confirmation-String erforderlich.
- **[Profilbild-Löschung aus Cloud Storage]** → Muss separat von DB-Anonymisierung behandelt werden. Bei Fehler: Bild verwaist, aber keine personenbezogenen Daten in der DB mehr.
- **[Verwaiste Inhalte]** → Nach Anonymisierung zeigen Content-Seiten "Unbekannter Autor" statt eines Benutzernamens. Frontend muss `null`-Author graceful handhaben (wird bereits teilweise unterstützt durch `SET_NULL`).

## Open Questions

- Soll der Kommentar-Text bei Konto-Löschung erhalten bleiben oder ebenfalls gelöscht werden? (Aktueller Vorschlag: Text bleibt, Author wird anonymisiert)
- Zeitraum für Analytics-Bereinigung: 12 Monate oder kürzer?
