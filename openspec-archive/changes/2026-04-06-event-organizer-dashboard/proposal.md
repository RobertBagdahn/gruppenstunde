## Why

Die Event-App bietet aktuell grundlegende CRUD-Funktionalität für Events, Buchungsoptionen, Registrierungen und Teilnehmer. Veranstaltern fehlen jedoch essenzielle Werkzeuge zur effizienten Verwaltung: Es gibt keine Teilnehmer-Timeline (wer hat sich wann an-/abgemeldet), kein Payment-Tracking (nur ein Boolean-Feld), keinen Teilnehmer-Export, keine Statistiken, keine E-Mail-Funktionalität, keine Custom Fields und keine vernünftige Landing Page. Diese Features sind in professionellen Event-Tools wie CampFlow Standard und für Pfadfinder-Gruppenführer unverzichtbar.

Zusätzlich sind die bestehenden Django-Apps (event, content, supply, profiles, recipe, planner) als monolithische Einzeldateien organisiert (ein großes `models.py`, `api.py`, `schemas.py` pro App). Bei wachsender Codebasis (content: 7.022 Zeilen, supply: 3.154, event: 2.261) wird dies unübersichtlich. Vor dem Hinzufügen neuer Features wird die Codebasis in eine saubere Package-Struktur umgebaut.

## What Changes

### Phase 0: Package-Umbau aller großen Django-Apps (Refactoring, keine neuen Features)

Alle großen Django-Apps werden intern als Python-Packages aufgeteilt. Die App bleibt eine einzige Django-App, aber `models.py`, `api.py` und `schemas.py` werden zu Packages mit thematisch getrennten Modulen. `__init__.py` re-exportiert alles, sodass bestehende Imports kompatibel bleiben.

Betroffene Apps:
- **`content`** (7.022 Zeilen) — models/, api/, schemas/ Packages; 31 Inline-Schemas in api.py werden in schemas/ extrahiert
- **`event`** (2.261 Zeilen) — models/, api/, schemas/ Packages; Vorbereitung für neue Features
- **`supply`** (3.154 Zeilen) — models/, api/, schemas/ Packages; Trennung Material vs. Ingredient
- **`profiles`** (1.309 Zeilen) — models/, api/, schemas/ Packages; Trennung Profile vs. Groups
- **`recipe`** (2.208 Zeilen) — models/, api/, schemas/ Packages; Trennung Recipe vs. Items/Nutrition
- **`planner`** (1.451 Zeilen) — models/, api/, schemas/ Packages; meal_plan_api.py wird integriert

Nicht umgebaut (zu klein, nur 1 Model): `session`, `game`, `blog`

### Phase 1–4: Neue Event-Features

- **`event` App erweitern**: Kontaktpersonen-Anzeige (responsible_persons Daten exponieren), Custom Fields (benutzerdefinierte Fragen pro Event), Teilnehmer-Labels, erweiterte Teilnehmer-Filterung
- **Timeline**: Vollständige Audit-Timeline für alle Teilnehmer-Aktionen (Anmeldung, Abmeldung, Statusänderungen, Zahlungen) mit Event-Log
- **Payment-Tracking**: Manuelles Payment-Tracking mit Zahlungsmethode (Bar, PayPal, Überweisung), Betrag, Datum, Ort, Teilzahlungen, Zahlungsstatus-Berechnung. `is_paid` DB-Feld wird entfernt und durch computed Property ersetzt.
- **Export**: Excel/CSV/PDF-Export von Teilnehmerlisten mit konfigurierbarer Spaltenauswahl und Filtern
- **Rundmails**: Manuelle Rundmails an Teilnehmer (einzeln, gefiltert, alle) mit Platzhalter-System
- **Statistiken**: KPIs (Auslastung, Bezahlt-Quote, Geschlechterverteilung, Altersverteilung, Ernährung, Anmelde-Timeline)
- **Custom Fields**: Veranstalter-definierte Fragen pro Event
- **Labels**: Farbige Tags für Teilnehmer (z.B. "Zelt A", "Küchendienst")

### Frontend
- **Organizer Dashboard**: Übersichtliche Veranstalter-Ansicht mit Tabs (Übersicht, Teilnehmer, Zahlungen, Timeline, E-Mails, Exporte, Einstellungen)
- **Teilnehmer-Timeline**: Chronologische Ansicht aller Aktionen pro Teilnehmer und pro Event
- **Payment-Tracking UI**: Zahlungen erfassen (Methode, Betrag, Datum, Bemerkung), Zahlungsstatus auf einen Blick
- **Export-Dialog**: Spaltenauswahl, Format-Wahl (Excel/CSV/PDF), Filter-basierter Export
- **Rundmail-Composer**: E-Mail-Editor mit Platzhaltern, Empfänger-Auswahl (alle, gefiltert, einzeln)
- **Statistik-Dashboard**: Visuelle KPIs mit Charts (Auslastung, Zahlungen, Demographie)
- **Custom Fields**: Veranstalter definiert eigene Fragen, Teilnehmer beantworten sie bei Anmeldung
- **Teilnehmer-Labels**: Tags zuweisen, filtern, in Exports nutzen
- **Verbesserte Landing Page** (`/events`): Feature-Showcase, Walkthrough-Abschnitte

### **BREAKING** Änderungen
- `Participant.is_paid` DB-Feld wird **entfernt** (Migration). Ersetzt durch computed `@property` basierend auf Payment-Summe vs. BookingOption-Preis.
- Neue Pydantic- und Zod-Schemas für alle neuen Entitäten
- Neue Migrations für alle neuen Models
- Bestehende Imports bleiben kompatibel (re-exports via `__init__.py`)

## Capabilities

### New Capabilities
- `package-restructuring`: Alle großen Django-Apps (content, event, supply, profiles, recipe, planner) intern als Python-Packages organisiert
- `event-timeline`: Audit-Log-System für alle Teilnehmer- und Event-Aktionen (Anmeldung, Abmeldung, Zahlung, Statusänderung)
- `event-payment`: Manuelles Payment-Tracking mit Zahlungsmethode, Betrag, Datum, Ort und Teilzahlungs-Support
- `event-export`: Konfigurierbarer Export von Teilnehmerlisten als Excel, CSV und PDF mit Spaltenauswahl und Filter
- `event-mail`: Manuelle Rundmails an Teilnehmer mit Platzhalter-System und Empfänger-Filterung
- `event-statistics`: Statistiken und KPIs für Veranstalter (Auslastung, Zahlungen, Demographie, Ernährung)
- `event-custom-fields`: Benutzerdefinierte Formularfelder pro Event (Text, Auswahl, Checkbox, Datum)
- `event-labels`: Teilnehmer-Labels/Tags für organisatorische Zwecke (Zelt-Einteilung, Aufgaben, etc.)
- `event-landing-page`: Verbesserte öffentliche Landing Page mit Feature-Showcase und Walkthrough
- `event-organizer-dashboard`: Zentrale Veranstalter-Oberfläche mit Tab-basierter Navigation

### Modified Capabilities
- `event-management`: Erweiterung um Kontaktperson-Anzeige (responsible_persons Daten in API), `is_paid` wird computed aus Payments (DB-Feld entfernt), erweiterte Teilnehmer-Filter-API, Participant bekommt Labels-M2M

## Impact

### Backend (Django)
- **Package-Umbau**: 6 Apps werden intern als Packages organisiert (models/, api/, schemas/)
- **Neue Models in `event`**: TimelineEntry, Payment, CustomField, CustomFieldValue, ParticipantLabel
- **Neue Pydantic Schemas**: TimelineEntryOut, PaymentOut/CreateIn, ExportConfigIn, MailCreateIn, StatsOut, CustomFieldOut/CreateIn, LabelOut/CreateIn
- **Neue Services in `event/services/`**: timeline.py, payment.py, export.py, mail.py, stats.py
- **Migrations**: Neue Tabellen + Entfernung von `Participant.is_paid` DB-Feld
- **Dependencies**: `openpyxl` (Excel-Export), `reportlab` (PDF-Export)

### Frontend (React)
- **Neue Zod Schemas**: Für alle neuen API-Responses
- **Neue TanStack Query Hooks**: Für Timeline, Payments, Export, Mail, Stats, Custom Fields, Labels
- **Neue Pages/Komponenten**: EventDetailPage (Organizer Dashboard), TimelineView, PaymentTracker, ExportDialog, MailComposer, StatsView, CustomFieldEditor, LabelManager
- **Erweiterte Landing Page**: Feature-Karten, Walkthrough-Sektionen

### API-Endpunkte (neu)
- `GET /api/events/{slug}/timeline/` — Event-weite Timeline
- `GET/POST /api/events/{slug}/payments/` — Zahlungen verwalten
- `DELETE /api/events/{slug}/payments/{id}/` — Zahlung löschen
- `POST /api/events/{slug}/export/` — Teilnehmer exportieren
- `GET /api/events/{slug}/export/columns/` — Verfügbare Export-Spalten
- `POST /api/events/{slug}/send-mail/` — Rundmail senden
- `GET /api/events/{slug}/stats/` — Statistiken abrufen
- `GET/POST /api/events/{slug}/custom-fields/` — Custom Fields verwalten
- `PATCH/DELETE /api/events/{slug}/custom-fields/{id}/`
- `PATCH /api/events/{slug}/participants/{id}/custom-fields/` — Custom Field Werte setzen
- `GET/POST /api/events/{slug}/labels/` — Labels verwalten
- `PATCH/DELETE /api/events/{slug}/labels/{id}/`
- `POST /api/events/{slug}/participants/{id}/labels/` — Label zuweisen
- `DELETE /api/events/{slug}/participants/{id}/labels/{label_id}/` — Label entfernen
