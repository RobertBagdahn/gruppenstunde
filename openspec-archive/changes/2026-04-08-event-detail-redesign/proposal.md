## Why

Die aktuelle Event-Auswahl (`/events/app`) und Event-Detailseite (`/events/:slug`) haben erhebliche UX-Probleme: zu viel White Space, keine klare Informationsarchitektur, und vor allem fehlen entscheidende Member-Funktionen wie An-/Abmeldung, Packliste, Einladungstext und Anmeldezahlen. Aktuell ist die Detailseite für eingeladene Nutzer kaum brauchbar — sie sehen weder ihren Anmeldestatus noch können sie sich direkt an-/abmelden. Gleichzeitig gibt es keine visuelle Orientierung darüber, in welcher Phase sich ein Event befindet (Vor Anmeldung → Anmeldephase → Vor dem Lager → Lager läuft → Nachbereitung).

## What Changes

### Event-Auswahl (Liste)
- Komplett neues Design der Event-Liste unter `/events/app` mit kompakteren Event-Cards
- Cards zeigen Event-Phase, Anmeldestatus, Datum und Teilnehmerzahl auf einen Blick
- Reduktion von White Space, bessere Nutzung des verfügbaren Platzes

### Event-Detailseite (Tab-basiert, rollenabhängig)
- Neue rollenbasierte Tab-Navigation: Nutzer sehen nur die Tabs, die für ihre Rolle relevant sind
- **Member-Tabs**: Übersicht (mit Anmeldestatus, Phase-Timeline, Zusammenfassung), Anmeldung (An-/Abmelden auch bei bestehender Anmeldung), Teilnehmende (optionale Anmeldezahlen/Namen für Fahrgemeinschaften), Einladungstext, Packliste
- **Admin-Tabs**: Alles aus Member + Verwaltung (Teilnehmer-Management), Zahlungen, Timeline, E-Mails, Exporte, Einstellungen (wie bisher im Dashboard)
- Tab-State über URL-Parameter (`?tab=`)

### Event-Phase/Timeline
- Visuelle Timeline-Komponente die den aktuellen Event-Status anzeigt
- Phasen automatisch berechnet aus bestehenden Datumsfeldern (`created_at`, `registration_start`, `registration_deadline`, `start_date`, `end_date`)
- Phasen: Erstellt → Vor Anmeldephase → Anmeldephase → Vor dem Event → Event läuft → Nachbereitung
- Phase bestimmt, welche Inhalte/Aktionen im jeweiligen Tab sichtbar sind

### Anmeldezahlen-Sichtbarkeit (konfigurierbar)
- Neues Event-Einstellungsfeld: Orga kann festlegen, was eingeladene Teilnehmende sehen dürfen
- Optionen: Nur Gesamtzahl, Zahlen pro Buchungsoption, Zahlen + Teilnehmer-Namen
- Neuer API-Endpunkt oder erweiterter Event-Detail-Response für Member-sichtbare Statistiken

### Eingeladenen-Liste mit Statusfilter
- Neue Ansicht für Admins: Liste aller eingeladenen Nutzer mit Status (Zugesagt, Abgesagt, Keine Antwort)
- Filterbar nach Status

### Einladungstext & Packliste (Member-sichtbar)
- Einladungstext und Packliste für alle eingeladenen Nutzer als eigene Tabs sichtbar
- Admins können inline editieren, Member nur lesen

## Capabilities

### New Capabilities
- `event-phase-timeline`: Automatische Berechnung und visuelle Darstellung der Event-Phase basierend auf Datumsfeldern. Bestimmt welche Inhalte/Aktionen kontextabhängig sichtbar sind.
- `event-member-view`: Rollenbasierte Tab-Detailseite für eingeladene Nutzer mit Anmeldung, Packliste, Einladungstext, optionalen Anmeldezahlen. Konfigurierbare Sichtbarkeit von Teilnehmerdaten.
- `event-invitation-status`: Übersicht aller eingeladenen Nutzer mit Antwort-Status (Zugesagt/Abgesagt/Keine Antwort) und Filtermöglichkeiten.
- `event-list-redesign`: Kompaktes Redesign der Event-Liste unter `/events/app` mit Phase-Badges, Anmeldestatus und reduziertem White Space.

### Modified Capabilities
- `event-organizer-dashboard`: Dashboard wird in die neue Tab-Struktur integriert. Admin-Tabs erweitern die Member-Tabs statt einer separaten Seite. Neue Tabs (Eingeladene, Packliste, Einladungstext) kommen hinzu.
- `event-management`: Event-Model erhält neue Felder für Anmeldezahlen-Sichtbarkeit (`participant_visibility`). Event-Detail-API liefert phasenabhängige Daten und Member-sichtbare Statistiken.

## Impact

### Backend (`event` App)
- **Model**: `Event` erhält neues Feld `participant_visibility` (Choices: `none`, `total_only`, `per_option`, `with_names`)
- **Schemas**: `EventDetailOut` wird erweitert um `phase` (computed), `participant_stats` (member-sichtbar), `invitation_status_counts`. Neues `EventPhase` Enum.
- **API**: Neuer Endpunkt für Einladungsstatus-Liste (`GET /api/events/{slug}/invitations/`). Event-Detail-Response wird um Phase und konfigurierbare Stats erweitert. Stat-Endpunkt wird für Member mit eingeschränkten Daten geöffnet.
- **Migration**: 1 neue Migration für `participant_visibility` Feld

### Frontend
- **Seiten**: `EventsPage.tsx` (Liste) komplett neu gestaltet. `EventDetailPage.tsx` und `EventDashboardPage.tsx` werden zu einer einzigen rollenbasierten Seite zusammengeführt.
- **Komponenten**: Neue Komponenten für Phase-Timeline, Member-Tabs (Übersicht, Anmeldung, Packliste, Einladungstext, Teilnehmende), Eingeladenen-Liste
- **Schemas**: Zod-Schemas erweitert um `EventPhase`, `ParticipantStats`, `InvitationStatus`
- **API-Hooks**: Neue Hooks für Einladungsstatus, Member-sichtbare Stats

### Abhängigkeiten
- Bestehende Dashboard-Komponenten (`OverviewTab`, `ParticipantsTab`, etc.) werden in die neue Tab-Struktur migriert
- Packing-List Feature (`packing-list` spec) wird in die Event-Detailseite eingebunden
