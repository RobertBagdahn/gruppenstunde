## Why

Der Event-Erstellungsprozess ist aktuell unvollständig und wenig intuitiv. Nutzer können Events erstellen, aber viele Einstellungen (Labels, Custom Fields, Farben, Icons, Gruppeneinladungen) sind erst nachträglich im Dashboard erreichbar. Die Statusmeldung "Das Event befindet sich noch im Entwurf" erklärt nicht, welche Schritte nötig sind, um das Event zu aktivieren. Die Tab-Leiste im Dashboard ist überladen (11+ Tabs), die Startseite bietet wenig Navigation, und Orte/Treffpunkte sind nicht klickbar. Ein Slug-Feld fehlt für Events. Das Gesamterlebnis muss grundlegend verbessert werden.

Darüber hinaus fehlen grundlegende Verwaltungsfunktionen: Personen können nur während der Anmeldung erstellt werden, Events können nicht importiert werden, es gibt keine Kalender-Ansicht, keine Zimmer-/Zelteinteilung und keine Integration mit dem Essensplan-Modul.

## What Changes

### Event-Erstellung (Wizard Overhaul)
- **BREAKING**: Wizard wird von 4 auf 8 Schritte erweitert mit allen Konfigurationsmöglichkeiten
- Schritt-für-Schritt-Erklärungen bei jedem Wizard-Schritt (Kontext-Hilfe)
- Smart Defaults: "Nächstes Wochenende" als Datum-Vorauswahl, "Mein Lager 1/2/3" als Name-Vorschläge
- Event-Slug wird aus dem Namen generiert, ist aber editierbar
- Gruppenauswahl am Anfang des Wizards mit direkter Einladungsmöglichkeit
- Events ohne Gruppe sollen ebenfalls möglich sein
- Farb- und Icon-Auswahl für das Event im Erstellungsprozess (15 Tailwind-Farben, 30+ Lucide-Icons)
- Labels und Custom Fields direkt im Wizard erstellbar
- Layout/Design-Vorschau im Wizard
- Freundlicheres, fokussierteres UI mit mehr Weißraum und Fortschrittsanzeige
- **NEU**: react-hook-form + @hookform/resolvers als neue Dependencies für Formularvalidierung

### Event-Dashboard (Tab-Konsolidierung)
- **BREAKING**: Tabs werden konsolidiert: Übersicht + Anmeldung zusammenführen, Verwaltung + Teilnehmende zusammenführen
- Überall Filter hinzufügen (Teilnehmer, Zahlungen, Timeline, etc.)
- Bessere Erklärung des Event-Status/Phase mit konkreten Handlungsanweisungen ("Setze ein Registrierungsdatum, um die Anmeldung zu aktivieren")

### Event-Startseite (Landing Page Redesign)
- Komplettes Redesign mit vielen Links und Schnellzugriffen
- Quick-Actions: "Neues Event erstellen", "Meine Events", "Eingeladene Events"
- Statistiken und letzte Aktivitäten
- **NEU**: Kalender-Ansicht als alternativer Ansichtsmodus

### Location & Meeting Point Detail
- Klickbare EventLocation und Treffpunkte mit Detailansicht
- OpenStreetMap-Integration für Kartenanzeige
- Koordinaten-Felder (latitude/longitude) für EventLocation und MeetingPoint

### Zusätzliche Features (25)

**Kern-Features (aus Original-Proposal):**
1. **Event-Vorlagen**: Events als Vorlage speichern und wiederverwenden
2. **Event-Duplikation mit Datum-Shift**: Bestehendes Event kopieren, optional Datum um X Wochen verschieben
3. **Checkliste vor Veröffentlichung**: Pflichtfelder-Check bevor Event live geht
4. **Warteliste**: Automatische Warteliste bei vollen Buchungsoptionen
5. **Teilnehmer-Notizen**: Private Notizen pro Teilnehmer für Organisatoren
6. **Event-Reminder**: Automatische Erinnerungen vor Anmeldeschluss und Event-Start
7. **Quick-Edit**: Inline-Bearbeitung von Event-Details direkt im Dashboard
8. **Event-Archiv**: Abgeschlossene Events archivieren und durchsuchen
9. **Anwesenheits-Tracking**: Check-in/Check-out am Event-Tag
10. **Event-Sharing**: Teilbare Links mit Vorschau (Open Graph Meta-Tags)

**Neue Features (aus Kompatibilitäts-Review):**
11. **"Meine Personen"-Verwaltung**: Frontend-UI für die bestehende Person-API (`/api/persons/`), damit Nutzer ihre Personen auch außerhalb der Anmeldung verwalten können
12. **Manuelle Phasenwechsel**: Events manuell auf eine Phase setzen (z.B. "registration" aktivieren ohne Datum), zusätzlich zum zeitbasierten `compute_phase()`
13. **Teilnehmer-Import (CSV/Excel)**: Gegenstück zum bestehenden Export — Gruppenleiter können Teilnehmerlisten importieren
14. **QR-Code Event-Landing**: Druckbare QR-Code-Seite pro Event für Aushänge und Einladungsbriefe, integriert in bestehende Einladungs-PDF
15. **Zimmer-/Zelteinteilung**: Teilnehmer in Untergruppen aufteilen (Zelte, Zimmer, Kleingruppen) — DAS Killer-Feature für Pfadfinder-Lager

**Ökosystem-Features (Cross-Modul):**
16. **Event → Essensplan-Integration**: Events direkt mit einem Essensplan aus dem planner-Modul verknüpfen
17. **Event → Programm-Editor**: Drag-and-Drop-Editor für EventDaySlots mit GroupSession/Game-Verknüpfung (GenericForeignKey existiert schon)
18. **Event-Budget/Kostenkalkulation**: Budget-Dashboard über Buchungsoptionen (Einnahmen) und Supply-Kosten (Ausgaben)
19. **Event-Kalender-Ansicht**: Kalenderdarstellung aller Events neben der Karten-/Listen-Ansicht
20. **Eltern-Kommunikation**: Token-basierter Elternzugang mit eingeschränkter Sicht (nur eigenes Kind, Packliste, Anreise)

## Capabilities

### New Capabilities
- `event-wizard-overhaul`: Kompletter Neubau des Event-Erstellungswizards mit Smart Defaults, Schritt-für-Schritt-Erklärungen, Farben/Icons, Gruppenauswahl, Labels und Custom Fields
- `event-location-detail`: Detailansicht für EventLocation und MeetingPoint mit OpenStreetMap-Kartenintegration und Koordinaten
- `event-tab-consolidation`: Konsolidierung der Dashboard-Tabs und durchgängige Filter
- `event-landing-redesign`: Neugestaltung der Event-Startseite mit Links, Quick-Actions und Übersichten
- `event-phase-guidance`: Verbesserte Statuserklärungen mit konkreten Handlungsanweisungen pro Phase
- `event-templates-duplication`: Event-Vorlagen speichern und Events duplizieren (mit optionalem Datum-Shift)
- `event-checklist`: Veröffentlichungs-Checkliste für vollständige Event-Konfiguration
- `event-waitlist`: Warteliste bei vollen Buchungsoptionen
- `event-attendance`: Anwesenheits-Tracking am Event-Tag
- `event-persons-ui`: Frontend-UI für bestehende Person-API — Personen verwalten außerhalb der Anmeldung
- `event-manual-phase`: Manuelle Phasensteuerung zusätzlich zum zeitbasierten compute_phase()
- `event-participant-import`: CSV/Excel-Import von Teilnehmern
- `event-qr-code`: QR-Code-Generierung für Event-Landing-Pages und Einladungs-PDFs
- `event-room-assignment`: Zimmer-/Zelteinteilung für Teilnehmer
- `event-meal-plan-link`: Verknüpfung von Events mit Essensplänen aus dem planner-Modul
- `event-program-editor`: Drag-and-Drop-Editor für Tagesprogramm (EventDaySlots)
- `event-budget`: Budget-Dashboard mit Einnahmen/Ausgaben-Übersicht
- `event-calendar-view`: Kalenderdarstellung aller Events
- `event-parent-access`: Token-basierter Elternzugang mit eingeschränkter Sicht

### Modified Capabilities
- `event-management`: Slug-Feld wird editierbar, Koordinaten für Locations, Gruppenauswahl bei Erstellung, EventColorChoices und EventIconChoices als TextChoices
- `event-smart-defaults`: Erweiterte Defaults ("Nächstes Wochenende", "Mein Lager 1/2/3")
- `event-member-view`: Tab-Struktur ändert sich durch Konsolidierung
- `event-organizer-dashboard`: Tab-Struktur und Filter ändern sich

## Impact

### Backend (Django `event` App)
- **Models**: `Event` bekommt neue Felder (color, icon, is_template, manual_phase). `EventLocation` und `MeetingPoint` bekommen latitude/longitude. Neue Models: `WaitlistEntry` (person FK mit SET_NULL statt CASCADE), `AttendanceRecord`, `RoomAssignment`, `ParentAccessToken`.
- **Choices**: Neue TextChoices-Klassen: `EventColorChoices` (15 Tailwind-Farben), `EventIconChoices` (30+ Lucide-Icons)
- **Schemas**: Pydantic-Schemas für alle neuen Felder und Models. Schema-Suffix-Konvention: `*CreateIn`, `*UpdateIn`, `*Out`
- **APIs**: Neue Endpunkte für Vorlagen, Duplikation, Warteliste, Anwesenheit, Veröffentlichungs-Check, Personen-UI, Import, QR-Code, Zimmereinteilung, Elternzugang
- **API-Routing**: `check-slug` und `templates` Endpunkte MÜSSEN vor `/{event_slug}/` definiert werden
- **Migrations**: Mehrere Migrationen für neue Felder und Models

### Frontend (React)
- **Schemas**: Zod-Schemas synchron mit Backend erweitern (`frontend/src/schemas/event.ts`)
- **Pages**: `NewEventPage.tsx` komplett neu, `EventDashboardPage.tsx` Tab-Struktur ändern, `EventsPage.tsx` komplett neu
- **Components**: Neue Komponenten für Kartenansicht (Leaflet/OpenStreetMap), Farbpicker, Icon-Picker, Wizard-Steps, Filter-Bars, Kalender-View, Programm-Editor
- **API Hooks**: Neue TanStack Query Hooks für alle neuen Endpunkte
- **Dependencies**: `react-leaflet`, `leaflet`, `@types/leaflet` für OpenStreetMap; `react-hook-form`, `@hookform/resolvers` für Wizard-Formulare
- **Store-Pfad**: `frontend/src/store/` (Singular, konsistent mit bestehendem `useSearchStore.ts` und `useRecipeModificationStore.ts`)

### Betroffene Dateien (Kernliste)
- `backend/event/models/core.py` — Neue Felder, neue Models
- `backend/event/choices.py` — EventColorChoices, EventIconChoices
- `backend/event/schemas/core.py` — Schema-Erweiterungen
- `backend/event/api/events.py` — Neue Endpunkte (ROUTE ORDER BEACHTEN)
- `frontend/src/schemas/event.ts` — Zod-Schema-Sync
- `frontend/src/pages/NewEventPage.tsx` — Wizard-Neubau
- `frontend/src/pages/EventDashboardPage.tsx` — Tab-Konsolidierung
- `frontend/src/pages/EventsPage.tsx` — Landing-Redesign
- `frontend/src/store/eventWizardStore.ts` — Neuer Wizard-Store (store/ Singular!)
- `frontend/src/components/events/dashboard/*.tsx` — Tab-Zusammenführung und Filter
