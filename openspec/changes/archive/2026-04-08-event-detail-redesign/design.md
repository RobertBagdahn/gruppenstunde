## Context

Die aktuelle Event-Seite (`/events/app`) verwendet ein Sidebar-Layout mit einer Event-Liste links und einem Detail-Panel rechts. Die Detailansicht (`EventDetailView` in `EventsPage.tsx`, ~1150 Zeilen) ist eine monolithische Komponente mit An-/Abmeldeformular, Teilnehmerliste, Einladungen und Bearbeitung — alles in einer einzigen Scroll-Ansicht. Das Admin-Dashboard unter `/events/app/:slug` ist eine separate Tab-Seite nur für Manager.

Probleme:
- Zu viel White Space auf der Event-Listenansicht
- Member sehen keine klare Orientierung über Anmeldestatus und Event-Phase
- An-/Abmeldung, Packliste, Einladungstext und Teilnehmerzahlen sind für Member schlecht zugänglich
- Dashboard und Member-Ansicht sind zwei separate Seiten — Admins müssen zwischen beiden navigieren
- Keine visuelle Event-Phase-Anzeige

Bestehende Datumsfelder im `Event`-Model: `created_at`, `registration_start`, `registration_deadline`, `start_date`, `end_date`.

## Goals / Non-Goals

**Goals:**
- Kompakte, visuell ansprechende Event-Liste mit Phase-Badges und Anmeldestatus
- Eine einzige Tab-basierte Detailseite die beide Rollen (Member/Admin) bedient
- Visuelle Event-Phase-Timeline die automatisch aus Datumsfeldern berechnet wird
- Konfigurierbare Sichtbarkeit von Anmeldezahlen (Orga entscheidet)
- Eingeladenen-Liste mit Antwort-Status (Zugesagt/Abgesagt/Offen)
- Packliste und Einladungstext als eigene Member-sichtbare Tabs

**Non-Goals:**
- Keine Änderung der Event-Erstellungsseite (`NewEventPage.tsx`)
- Kein Umbau der bestehenden Dashboard-Tab-Komponenten (werden wiederverwendet)
- Keine Änderung am Registrierungs-Flow (Person-Auswahl, BookingOption-Zuordnung bleibt)
- Kein neues Berechtigungssystem — bestehende `user_can_manage` und `user_is_invited` werden genutzt
- Keine Push-Notifications oder Echtzeit-Updates

## Decisions

### 1. Vereinigte Tab-Seite statt zwei separate Seiten

**Entscheidung**: `EventDashboardPage.tsx` wird zur einzigen Event-Detailseite unter `/events/app/:slug`. Die alte `EventDetailPage.tsx` (`/events/:slug`) leitet auf `/events/app/:slug` weiter. Die Sidebar-basierte Detailansicht in `EventsPage.tsx` wird entfernt — Event-Cards linken direkt auf `/events/app/:slug`.

**Begründung**: Eine einzige Seite vermeidet Duplizierung und gibt allen Nutzern eine konsistente Erfahrung. Tabs werden rollenbasiert ein-/ausgeblendet.

**Alternativen verworfen**:
- Zwei separate Seiten beibehalten (aktueller Stand): Verursacht Duplizierung und Verwirrung
- Alles inline in der Sidebar: Zu wenig Platz für die gewünschten Features

### 2. Event-Phase als berechnetes Property (kein DB-Feld)

**Entscheidung**: Die Event-Phase wird als Computed Property im Backend berechnet und im `EventDetailOut` Schema als `phase` Feld mitgeliefert. Kein neues DB-Feld.

Phasen-Logik (Reihenfolge der Prüfung):
```
now = timezone.now()

if end_date and now > end_date:            → "completed"    (Nach dem Lager)
if start_date and now >= start_date:       → "running"      (Lager läuft)
if registration_deadline and now > registration_deadline:
                                           → "pre_event"    (Vor dem Lager)
if registration_start and now >= registration_start:
                                           → "registration" (Anmeldephase)
if registration_start and now < registration_start:
                                           → "pre_registration" (Vor Anmeldephase)
else:                                      → "draft"        (Erstellt)
```

**Begründung**: Phase ist direkt aus bestehenden Daten ableitbar. Ein DB-Feld würde Sync-Probleme verursachen und einen Cronjob benötigen.

**Alternativen verworfen**:
- DB-Feld mit Cronjob: Unnötige Komplexität, kann out-of-sync geraten
- Nur Frontend-Berechnung: Inkonsistent bei API-Nutzung

### 3. Tab-Struktur mit rollenbasierter Sichtbarkeit

**Entscheidung**: Die Tab-Konfiguration wird als Array definiert, jeder Tab hat eine `visibleTo`-Property (`member | manager`). Tabs werden im Frontend basierend auf der Rolle des Nutzers gefiltert.

Member-sichtbare Tabs:
| Tab ID | Label | Beschreibung |
|--------|-------|-------------|
| `overview` | Übersicht | Anmeldestatus, Phase-Timeline, Zusammenfassung |
| `registration` | Anmeldung | An-/Abmeldeformular (auch bei bestehender Anmeldung) |
| `participants` | Teilnehmende | Anmeldezahlen (konfigurierbar) |
| `invitation` | Einladung | Einladungstext (read-only für Member) |
| `packing-list` | Packliste | Packliste (read-only für Member) |

Zusätzliche Admin-Tabs:
| Tab ID | Label | Beschreibung |
|--------|-------|-------------|
| `manage-participants` | Verwaltung | Teilnehmer-Management (bestehende `ParticipantsTab`) |
| `invitations` | Eingeladene | Eingeladene mit Status |
| `payments` | Zahlungen | Bestehendes Payment-Tab |
| `timeline` | Timeline | Bestehende Timeline |
| `mail` | E-Mails | Bestehende Mail-Funktion |
| `export` | Exporte | Bestehender Export |
| `settings` | Einstellungen | Bestehende Settings + neue Sichtbarkeits-Einstellung |

**Begründung**: Konsistentes Pattern, das bereits im Dashboard verwendet wird. URL-State über `?tab=` Parameter.

### 4. Konfigurierbare Anmeldezahlen-Sichtbarkeit

**Entscheidung**: Neues Feld `participant_visibility` am Event-Model mit Choices:
- `none`: Keine Anmeldezahlen sichtbar (Default)
- `total_only`: Nur Gesamtzahl
- `per_option`: Zahlen pro Buchungsoption
- `with_names`: Zahlen + Teilnehmer-Vornamen (für Fahrgemeinschaften)

Der Event-Detail-Endpunkt liefert `participant_stats` basierend auf dieser Einstellung. Für Manager werden immer vollständige Daten geliefert.

**Begründung**: Datenschutz-konform (Orga entscheidet), erfüllt alle gewünschten Granularitäts-Stufen.

**Betroffene Dateien**:
- `backend/event/models/core.py`: Neues Feld + Choices
- `backend/event/schemas/core.py`: Neues `ParticipantStatsOut` Schema, erweitertes `EventDetailOut`
- `backend/event/api/events.py`: Bedingte Stats im Detail-Response
- `frontend/src/schemas/event.ts`: Zod-Schema-Erweiterung
- Migration: `backend/event/migrations/0XXX_event_participant_visibility.py`

### 5. Eingeladenen-Status aus bestehenden Daten ableiten

**Entscheidung**: Neuer API-Endpunkt `GET /api/events/{slug}/invitations/` der alle eingeladenen Nutzer mit Status liefert:
- `accepted`: Nutzer hat eine Registration für dieses Event
- `declined`: Kein neues Feld nötig — wird vorerst nicht unterstützt (kein Absage-Mechanismus vorhanden)
- `pending`: Eingeladen, aber keine Registration

Da es aktuell keinen "Absage"-Mechanismus gibt, gibt es nur zwei Status: `accepted` und `pending`. Ein explizites Absagen kann als Follow-up eingebaut werden.

**Betroffene Dateien**:
- `backend/event/api/events.py`: Neuer Endpunkt
- `backend/event/schemas/core.py`: Neues `InvitationStatusOut` Schema
- `frontend/src/api/events.ts`: Neuer Hook `useEventInvitations`
- `frontend/src/schemas/event.ts`: Neues Zod-Schema

### 6. Event-Liste Redesign

**Entscheidung**: Die Event-Cards in `EventsPage.tsx` werden kompakter gestaltet mit:
- Phase-Badge (farbcodiert)
- Datum + Ort in einer Zeile
- Anmeldestatus-Icon (angemeldet/nicht angemeldet)
- Teilnehmerzahl (wenn sichtbar)
- Kein Sidebar-Detail-Panel mehr, Cards linken auf `/events/app/:slug`

**Betroffene Dateien**:
- `frontend/src/pages/EventsPage.tsx`: Kompletter Umbau (Sidebar-Layout entfernen, Cards redesignen)
- `frontend/src/pages/EventDetailPage.tsx`: Redirect zu `/events/app/:slug`

## Risks / Trade-offs

**[Monolithische EventsPage.tsx]** → Die aktuelle Datei hat ~1150 Zeilen. Beim Umbau werden die Inline-Komponenten (EventDetailView, RegisterForm, etc.) in separate Dateien extrahiert. Risiko: Regressions bei der Extraktion. Mitigation: Bestehende Funktionalität wird Tab für Tab migriert, nicht alles auf einmal.

**[Phase-Berechnung ohne alle Datumsfelder]** → Wenn ein Event kein `registration_start` hat, springt die Phase direkt von `draft` zu `pre_event` oder `running`. Mitigation: Frontend zeigt in der Timeline nur die Phasen an, für die Daten vorhanden sind.

**[Kein Absage-Mechanismus]** → Die Eingeladenen-Liste kann nur `accepted` und `pending` anzeigen, nicht `declined`. Mitigation: Wird als separater Follow-up Change implementiert, wenn benötigt.

**[Breaking Change an der Seitenstruktur]** → `/events/:slug` wird ein Redirect. Bestehende Links und Bookmarks werden umgeleitet. Mitigation: Redirect statt 404.

## API-Endpunkt-Änderungen

| Methode | Pfad | Änderung |
|---------|------|----------|
| GET | `/api/events/{slug}/` | Response erweitert um `phase`, `participant_stats`, `user_registration` |
| GET | `/api/events/{slug}/invitations/` | **NEU** — Eingeladene Nutzer mit Status (paginiert) |
| GET | `/api/events/{slug}/stats/` | Für Member mit eingeschränkten Daten geöffnet (basierend auf `participant_visibility`) |
| PATCH | `/api/events/{slug}/` | Akzeptiert neues `participant_visibility` Feld |

## Migration Plan

1. Backend: Migration für `participant_visibility` Feld (Default: `none`)
2. Backend: API-Endpunkte erweitern/erstellen
3. Frontend: Neue Komponenten erstellen (Phase-Timeline, Member-Tabs)
4. Frontend: EventsPage.tsx refactoren (Sidebar entfernen, Cards redesignen)
5. Frontend: EventDashboardPage.tsx erweitern (Member-Tabs hinzufügen)
6. Frontend: EventDetailPage.tsx → Redirect
7. Rollback: Git revert, Migration reverse

## Open Questions

- Soll der "Absage"-Mechanismus (declined) direkt mit eingebaut werden oder als Follow-up?
- Sollen die Phase-bezogenen Tab-Einschränkungen (z.B. Anmeldung nur in der Anmeldephase) sofort oder als Iteration danach implementiert werden?
