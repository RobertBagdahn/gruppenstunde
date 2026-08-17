## Context

Das Event-System ist das zweitgrößte Modul der Inspi-Plattform. Der aktuelle Event-Erstellungsprozess (`NewEventPage.tsx`) ist ein 4-Schritt-Wizard (Grunddaten → Ort → Buchungsoptionen → Einladung), der nur die grundlegendsten Felder abdeckt. Erweiterte Konfigurationen (Labels, Custom Fields, Gruppeneinladungen) sind erst nach der Erstellung im Dashboard möglich.

Das Event-Dashboard (`EventDashboardPage.tsx`) hat 12 Tabs in einer horizontalen Tab-Leiste, die auf mobilen Geräten kaum benutzbar ist. Statusmeldungen wie "Das Event befindet sich noch im Entwurf" geben keine Handlungsanweisungen. EventLocation und MeetingPoint haben keine Koordinaten und sind nicht klickbar.

Die Event-Startseite (`EventsLandingPage.tsx`) ist eine Marketing-Seite ohne Schnellzugriffe für eingeloggte Nutzer. Die Person-API (`/api/persons/`) existiert, hat aber kein Frontend-UI. Der `planner` App-Modul hat Essensplanung, ist aber nicht mit Events verknüpft. `EventDaySlot` hat einen `GenericForeignKey` zu GroupSession/Game, aber das UI dafür ist minimal.

### Betroffene Dateien
- `backend/event/models/core.py` — Event, EventLocation, MeetingPoint Models
- `backend/event/models/waitlist.py` — WaitlistEntry (NEU)
- `backend/event/models/attendance.py` — AttendanceRecord (NEU)
- `backend/event/models/room_assignment.py` — RoomAssignment (NEU)
- `backend/event/models/parent_access.py` — ParentAccessToken (NEU)
- `backend/event/choices.py` — EventColorChoices, EventIconChoices (NEU)
- `backend/event/schemas/core.py` — Pydantic-Schemas
- `backend/event/api/events.py` — Event CRUD Endpunkte (ROUTE ORDER!)
- `frontend/src/pages/NewEventPage.tsx` — Event-Erstellungswizard
- `frontend/src/pages/EventDashboardPage.tsx` — Dashboard mit Tabs
- `frontend/src/pages/EventsPage.tsx` — Event-Listenansicht
- `frontend/src/pages/EventsLandingPage.tsx` — Event-Landing-Page
- `frontend/src/schemas/event.ts` — Zod-Schemas
- `frontend/src/api/events.ts` — TanStack Query Hooks
- `frontend/src/store/eventWizardStore.ts` — Wizard-Store (NEU, in store/ Singular!)
- `frontend/src/components/events/dashboard/*.tsx` — Dashboard-Tab-Komponenten

## Goals / Non-Goals

**Goals:**
- Event-Erstellung wird ein vollständiger, geführter Prozess mit allen Konfigurationsmöglichkeiten
- Smart Defaults reduzieren den Konfigurationsaufwand (nächstes Wochenende, "Mein Lager 1/2/3")
- Event-Slug wird angezeigt und ist editierbar
- Gruppenauswahl am Anfang des Wizards mit direkter Einladungsoption
- Dashboard-Tabs werden konsolidiert und um Filter erweitert
- Status-Erklärungen zeigen konkrete Handlungsanweisungen
- EventLocation und MeetingPoint werden klickbar mit Kartenansicht (OpenStreetMap)
- Event-Startseite wird zur funktionalen Hub-Seite mit Links und Quick-Actions
- 20 neue Features inkl. Personen-Verwaltung, Manuelle Phasen, Import, QR-Code, Zimmereinteilung, Essensplan, Programm-Editor, Budget, Kalender, Elternzugang
- Alle Architektur-Inkonsistenzen aus dem Kompatibilitäts-Review werden behoben

**Non-Goals:**
- Keine native App oder PWA-Features
- Kein Echtzeit-Collaboration (WebSockets) im Wizard
- Keine Integration mit externen Kalender-Systemen (Google Calendar, etc.)
- Keine Zahlungsabwicklung (Stripe, PayPal Integration)
- Kein Multi-Language-Support (nur Deutsch)

## Decisions

### 1. Wizard-Architektur: Stepper mit zustandsbasiertem Formular

**Entscheidung**: Der Wizard wird als Multi-Step-Stepper mit React Hook Form + Zod implementiert. Jeder Schritt hat sein eigenes Zod-Schema. Der Gesamtzustand wird in einem Zustand-Store zwischengespeichert, bis der Nutzer am Ende "Erstellen" klickt.

**Neue Dependencies** (fehlten im Original):
- `react-hook-form` — Formular-Management
- `@hookform/resolvers` — Zod-Integration für react-hook-form

**Store-Pfad**: `frontend/src/store/eventWizardStore.ts` — im bestehenden `store/`-Verzeichnis (Singular), konsistent mit `useSearchStore.ts` und `useRecipeModificationStore.ts`.

**Alternativen**:
- *Einzelnes großes Formular mit Sektionen*: Weniger komplex, aber überfordernd für Nutzer. Mobile-First erfordert fokussierte Schritte.
- *Serverseitiges Speichern nach jedem Schritt (Draft-Modus)*: Zu komplex für den aktuellen Stand. Events werden erst beim finalen Submit erstellt.

**Rationale**: React Hook Form bietet performante Formulare mit Zod-Validation pro Schritt. Zustand hält den State zwischen Schritten. Ein Store statt URL-State, weil der Wizard-State komplex und temporär ist.

### 2. Wizard-Schritte (8 Schritte)

| Schritt | Titel | Inhalt |
|---------|-------|--------|
| 1 | Grunddaten | Name (mit Slug-Vorschau), Farbe, Icon, Beschreibung |
| 2 | Gruppe & Einladung | Optionale Gruppenauswahl, direkte Personeneinladung |
| 3 | Datum & Ort | Start/Ende (Default: nächstes Wochenende), Location, Treffpunkt, Abholpunkt |
| 4 | Anmeldung | Registrierungszeitraum, Sichtbarkeit, Gast-Registrierung, Deadline |
| 5 | Buchungsoptionen | Preise, Kontingente, Buchungszeiträume |
| 6 | Packliste & Felder | Packliste zuordnen, Custom Fields erstellen, Labels definieren |
| 7 | Einladungstext | Markdown-Editor, AI-Generierung, Vorschau |
| 8 | Zusammenfassung | Übersicht aller Einstellungen, Veröffentlichungs-Checkliste |

**Rationale**: 8 Schritte statt 4, weil jeder Schritt nun fokussierter ist und Kontext-Hilfe bietet. Schritt 2 (Gruppe) kommt früh, damit Einladungen sofort möglich sind.

### 3. Smart Defaults

**Entscheidung**: Defaults werden clientseitig berechnet, nicht vom Server.

- **Datum**: `nextSaturday()` bis `nextSunday()` aus `date-fns`
- **Name**: "Mein Lager" + fortlaufende Nummer basierend auf existierenden Events des Nutzers (API-Abfrage: `GET /api/events/?created-by=me&name-prefix=Mein+Lager`)
- **Slug**: Auto-generiert aus Name via `slugify()`, editierbar mit Uniqueness-Check (Debounced API-Call: `GET /api/events/check-slug/?slug=...`)
- **Buchungsoption**: "Standard" mit Preis = Anzahl Tage × 10€
- **Registrierungs-Deadline**: Freitag vor dem Event um 23:59

**Alternative**: Server-generierte Defaults via API-Endpunkt. Abgelehnt, weil die Logik einfach genug für den Client ist und keinen extra Roundtrip braucht.

### 4. Tab-Konsolidierung im Dashboard

**Entscheidung**: Von 12 Tabs auf 7 Tabs konsolidieren.

| Vorher | Nachher | Begründung |
|--------|---------|------------|
| Übersicht + Anmeldung | **Übersicht** | Anmeldestatus gehört zur Übersicht |
| Teilnehmende + Verwaltung | **Teilnehmende** | Eine Ansicht mit Rollen-Toggle (Mitglied-Ansicht vs. Admin-Ansicht) |
| Einladung + Eingeladene | **Einladung & Gäste** | Zusammengehörig |
| Packliste | **Packliste** | Bleibt |
| Zahlungen | **Zahlungen** | Bleibt, bekommt Filter |
| Timeline + E-Mails + Exporte | **Aktivität** | Zusammenfassung aller Logs |
| Einstellungen | **Einstellungen** | Bleibt |

**Rationale**: 7 Tabs passen auf einen Mobilscreen. Logisch zusammengehörende Inhalte werden gruppiert.

### 5. OpenStreetMap-Integration

**Entscheidung**: `react-leaflet` mit OpenStreetMap Tiles für Kartenansicht.

**Neue Felder** auf `EventLocation` und `MeetingPoint`:
- `latitude: FloatField(null=True, blank=True)`
- `longitude: FloatField(null=True, blank=True)`

**Geocoding**: Clientseitig via Nominatim API (kostenlos, keine API-Keys). Nutzer gibt Adresse ein → Koordinaten werden via Nominatim aufgelöst → auf der Karte angezeigt. Nutzer kann Pin manuell verschieben.

**Alternative**: Google Maps API — abgelehnt wegen Kosten und API-Key-Verwaltung. Mapbox — abgelehnt, weil Nominatim + Leaflet komplett kostenlos ist.

**Detailansicht**: Klick auf Location/MeetingPoint öffnet eine Vollbild-Karte mit Adresse, Beschreibung und Routenlink zu OpenStreetMap.

### 6. Event-Farben und Icons

**Entscheidung**: Vorgegebene Farbpalette (15 Farben) und Icon-Set (30+ Icons aus Lucide). Kein freier Farbpicker.

**WICHTIG**: Event-Farben nutzen Tailwind-Klassen-Namen (nicht Hex wie `ParticipantLabel.color`). Das ist bewusst anders, weil Event-Farben für UI-Theming verwendet werden (Karten-Akzent, Dashboard-Header), nicht als freie Farbwahl.

**Validierung**: Neue `EventColorChoices` und `EventIconChoices` als TextChoices in `backend/event/choices.py` — konsistent mit dem bestehenden Pattern (`GenderChoices`, `PaymentMethodChoices`, etc.).

```python
class EventColorChoices(models.TextChoices):
    SLATE = "slate", _("Schiefergrau")
    RED = "red", _("Rot")
    ORANGE = "orange", _("Orange")
    AMBER = "amber", _("Bernstein")
    YELLOW = "yellow", _("Gelb")
    LIME = "lime", _("Limette")
    GREEN = "green", _("Grün")
    EMERALD = "emerald", _("Smaragd")
    TEAL = "teal", _("Türkis")
    CYAN = "cyan", _("Cyan")
    BLUE = "blue", _("Blau")
    VIOLET = "violet", _("Violett")
    PURPLE = "purple", _("Lila")
    PINK = "pink", _("Pink")
    ROSE = "rose", _("Rosa")

class EventIconChoices(models.TextChoices):
    TENT = "tent", _("Zelt")
    FLAME = "flame", _("Feuer")  # Nicht "campfire" — existiert nicht in Lucide!
    COMPASS = "compass", _("Kompass")
    MAP = "map", _("Karte")
    MOUNTAIN = "mountain", _("Berg")
    # ... etc.
```

**Icon-Fix**: `campfire` existiert nicht in `lucide-react@0.447.0` — stattdessen `flame` verwenden. Alle Icon-Namen müssen gegen die installierte Lucide-Version verifiziert werden.

**Datenmodell**: `Event.color: CharField(20, choices=EventColorChoices.choices, default=EventColorChoices.BLUE)`, `Event.icon: CharField(30, choices=EventIconChoices.choices, default=EventIconChoices.TENT)`

**Rationale**: Feste Palette mit Choices-Validierung sorgt für konsistentes Design und DB-Integrität. Lucide Icons sind bereits im Projekt via shadcn/ui.

### 7. Event-Vorlagen und Duplikation

**Entscheidung**: Kein separates `EventTemplate`-Model. Stattdessen ein `is_template: BooleanField` auf `Event`. Vorlagen sind Events die nie veröffentlicht werden und als Kopiervorlage dienen.

**Templates-Filterung**: `GET /api/events/` muss Templates per Default ausschließen (`.exclude(is_template=True)`). Templates nur über `GET /api/events/templates/` abrufbar.

**Duplikation mit Datum-Shift**: `POST /api/events/{slug}/duplicate/` erstellt eine tiefe Kopie (Event + BookingOptions + CustomFields + Labels). Personen/Registrierungen werden NICHT kopiert. Optionaler Body: `{ "date_shift_weeks": 4 }` verschiebt alle Datumsfelder um X Wochen.

**Alternative**: Separates Template-Model mit eigener API. Abgelehnt, weil die Datenstruktur identisch ist und ein Flag einfacher ist.

### 8. Veröffentlichungs-Checkliste

**Entscheidung**: Clientseitige Validierung. Keine serverseitige Blockade — Events können im Entwurf bleiben, aber eine Checkliste zeigt was fehlt.

Pflichtfelder für Veröffentlichung:
- Name gesetzt
- Start- und Enddatum gesetzt
- Mindestens eine Buchungsoption
- Registrierungszeitraum konfiguriert
- Location oder Beschreibung vorhanden

**Anzeige**: In der Übersicht als Card mit Fortschrittsbalken und Einzelpunkten (grün/rot).

### 9. Warteliste

**Neues Model**: `WaitlistEntry(event, booking_option, user, person, created_at, notified_at, expired_at)`

**FK-Pattern-Fix**: `WaitlistEntry.person` nutzt `SET_NULL` (nicht CASCADE) — konsistent mit `Participant.person` (line 486 in core.py). Wenn ein Person-Record gelöscht wird, bleibt der Wartelisten-Eintrag erhalten.

**Logik**: Wenn `BookingOption.is_full` → Nutzer kann sich auf Warteliste setzen. Bei Stornierung wird automatisch der erste Wartelisten-Eintrag benachrichtigt (E-Mail). Reservierung läuft nach 48h ab.

### 10. Anwesenheits-Tracking

**Neues Model**: `AttendanceRecord(participant, checked_in_at, checked_out_at, checked_in_by)`

**UI**: Manuelle Check-in-Liste im Dashboard. Einfacher Toggle pro Teilnehmer. Batch-Check-in für mehrere Teilnehmer gleichzeitig.

### 11. Phasen-Erklärungen

**Entscheidung**: Jede Phase bekommt eine kontextuelle Erklärung mit konkreter Handlungsanweisung.

| Phase | Erklärung | Handlung |
|-------|-----------|---------|
| `draft` | "Dein Event ist noch nicht veröffentlicht. Teilnehmer können sich noch nicht anmelden." | "Konfiguriere dein Event und setze ein Registrierungsdatum, um die Anmeldung zu aktivieren." |
| `pre_registration` | "Die Anmeldung beginnt am {date}." | "Lade in der Zwischenzeit Teilnehmer ein." |
| `registration` | "Die Anmeldung ist offen bis {date}." | "Teile den Anmeldelink mit deiner Gruppe." |
| `pre_event` | "Die Anmeldung ist geschlossen. Das Event beginnt am {date}." | "Überprüfe die Teilnehmerliste und Zahlungen." |
| `running` | "Das Event läuft gerade!" | "Nutze das Anwesenheits-Tracking." |
| `completed` | "Das Event ist abgeschlossen." | "Exportiere Teilnehmerdaten und archiviere das Event." |

### 12. API-Route-Order (KRITISCH)

**Entscheidung**: Alle statischen Event-Routen MÜSSEN vor `@event_router.get("/{event_slug}/")` definiert werden. Sonst werden URL-Segmente wie "check-slug" oder "templates" als Slugs interpretiert.

Bestehende Routen vor dem Slug-Catch-All (Zeilen 47-91 in events.py):
- `/my-invited/`
- `/my-registered/`
- `/choices/gender/`
- `/choices/participant-visibility/`
- `/generate-invitation/`

**Neue statische Routen** (müssen DAVOR):
- `/check-slug/`
- `/templates/`

### 13. Schema-Suffix-Konvention

**Entscheidung**: Alle neuen Pydantic-Schemas folgen der bestehenden Konvention:
- Response: `*Out` (z.B. `WaitlistEntryOut`)
- Create: `*CreateIn` (z.B. `WaitlistEntryCreateIn`) — NICHT `*Create`
- Update: `*UpdateIn` (z.B. `WaitlistEntryUpdateIn`)

### 14. Manuelle Phasensteuerung

**Entscheidung**: Neues optionales Feld `Event.manual_phase: CharField(20, choices=EventPhaseChoices, null=True, blank=True)`.

**Logik**: Wenn `manual_phase` gesetzt ist, überschreibt es `compute_phase()`. Nutzer kann über Settings-Tab eine Phase manuell erzwingen (z.B. "registration" ohne Registrierungsdatum). `manual_phase = None` bedeutet automatische Berechnung.

**Neues `EventPhaseChoices`** in `choices.py`:
```python
class EventPhaseChoices(models.TextChoices):
    DRAFT = "draft", _("Entwurf")
    PRE_REGISTRATION = "pre_registration", _("Vor der Anmeldung")
    REGISTRATION = "registration", _("Anmeldung offen")
    PRE_EVENT = "pre_event", _("Vor dem Event")
    RUNNING = "running", _("Event läuft")
    COMPLETED = "completed", _("Abgeschlossen")
```

### 15. Personen-Verwaltung UI

**Entscheidung**: Neues Frontend unter `/events/app/persons` — nutzt die bestehende Person-API (`/api/persons/`). Kein Backend-Aufwand nötig.

**UI**: CRUD-Liste mit Suche, ähnlich wie die Ingredient-Verwaltung. Personen können erstellt, bearbeitet und gelöscht werden.

### 16. Teilnehmer-Import

**Entscheidung**: Neuer API-Endpunkt `POST /api/events/{slug}/import/` akzeptiert CSV oder Excel. Backend parst die Datei, erstellt Personen und Registrierungen.

**Mapping**: Upload-Dialog zeigt Spalten-Mapping (Vorname, Nachname, E-Mail, Buchungsoption). Nutzer ordnet Spalten zu.

**Abhängigkeit**: Nutzt bestehenden Export-Service als Referenz für Spalten-Format.

### 17. QR-Code Event-Landing

**Entscheidung**: Clientseitige QR-Code-Generierung via `qrcode.react` Library. QR-Code zeigt URL `https://gruppenstunde.de/events/{slug}/register`.

**Integration**: Einbettbar in bestehende Einladungs-PDF (`invitation_pdf.py`). Auch als eigenständige druckbare Seite im Dashboard.

### 18. Zimmer-/Zelteinteilung

**Neues Model**: `RoomAssignment(event FK, name CharField, capacity IntegerField, participants M2M Participant)`.

**UI**: Drag-and-Drop-Interface im Teilnehmende-Tab (Admin-Ansicht). Teilnehmer können per Drag in Räume/Zelte gezogen werden. Nicht zugewiesene Teilnehmer erscheinen in einer "Nicht eingeteilt"-Sektion.

### 19. Event → Essensplan-Integration

**Entscheidung**: Neues FK-Feld `Event.meal_plan: FK(planner.MealEvent, null=True, SET_NULL)`. Verknüpft ein Event mit einem bestehenden Essensplan.

**UI**: Button "Essensplan verknüpfen" im Dashboard. Alternativ: "Neuen Essensplan erstellen" → erstellt `MealEvent` und verknüpft automatisch.

### 20. Event → Programm-Editor

**Entscheidung**: Verbessertes UI für `EventDaySlot`. Drag-and-Drop mit `@dnd-kit/core` (bereits performant für React). Slots können GroupSessions und Games via GenericForeignKey verknüpfen.

**Alternative**: `react-beautiful-dnd` — deprecated. `@dnd-kit` ist der aktuelle Standard.

### 21. Event-Budget

**Entscheidung**: Kein eigenes Model. Budget wird berechnet aus:
- **Einnahmen**: Summe aller Payments
- **Erwartete Einnahmen**: Summe(Participant × BookingOption.price)
- **Ausgaben**: Manuell erfasst via neues `BudgetItem`-Model oder berechnet aus Supply-Preisen

**UI**: Budget-Card im Übersicht-Tab mit Einnahmen/Ausgaben-Balken.

### 22. Event-Kalender-Ansicht

**Entscheidung**: Kalender-View auf der Event-Startseite als Ansichtsmodus-Toggle (Liste / Kalender). Nutzt einfaches CSS-Grid für Monatsansicht, keine externe Kalender-Library.

**Alternative**: `react-big-calendar` — zu komplex und schwer zu stylen mit Tailwind. Eigenes Grid ist leichtgewichtiger.

### 23. Eltern-Kommunikation

**Neues Model**: `ParentAccessToken(participant FK, token UUIDField, created_at, expires_at, email CharField)`.

**Logik**: Organisator generiert Token pro Teilnehmer. Token wird per E-Mail an Eltern geschickt. URL: `/events/{slug}/parent/{token}` — zeigt nur: Name des Kindes, Packliste, Anreise/Treffpunkt, Event-Datum. Kein Login nötig.

**Sicherheit**: Token läuft 30 Tage nach Event-Ende ab. Kein Zugriff auf andere Teilnehmer.

## Risks / Trade-offs

**[8-Schritt-Wizard könnte Nutzer abschrecken]** → Mitigation: Schritte 2-7 sind optional und können übersprungen werden. Nur Schritt 1 (Name) und Schritt 8 (Zusammenfassung) sind Pflicht. Skip-Button an jedem Schritt.

**[Nominatim Rate Limiting]** → Mitigation: Debouncing auf 1 Sekunde, Caching der letzten 100 Geocoding-Ergebnisse im LocalStorage. Fallback: Nutzer gibt Koordinaten manuell ein.

**[react-leaflet Bundle-Größe (~40KB gzipped)]** → Mitigation: Lazy Loading der Kartenkomponente via `React.lazy()`. Karte wird nur geladen wenn Nutzer die Detailansicht öffnet.

**[Tab-Konsolidierung bricht bestehende URLs]** → Kein Risiko, da Rückwärtskompatibilität nicht nötig ist. Alte `?tab=`-Parameter werden auf neue gemappt.

**[Smart-Default "Mein Lager" Namenskollision]** → Mitigation: Slug-Uniqueness-Check. Nummer wird inkrementiert bis ein freier Slug gefunden wird.

**[Cross-Modul-Abhängigkeiten]** → Essensplan-Integration und Programm-Editor erzeugen FK-Beziehungen zwischen `event` und `planner` Apps. Mitigation: Nullable FKs mit SET_NULL. Kein Circular Import dank Django's String-Referenz (`"planner.MealEvent"`).

**[Scope-Umfang mit 25 Features]** → Mitigation: Features sind unabhängig voneinander implementierbar. Priorisierung: Kern-Features zuerst (Wizard, Tabs, Landing), dann Zusatzfeatures, zuletzt Ökosystem-Features.

**[react-hook-form als neue Dependency]** → Mitigation: Nur im Wizard verwendet. Kein Refactoring bestehender Formulare nötig. ~8KB gzipped.

### API-Endpunkt-Änderungen

| Methode | Pfad | Änderung |
|---------|------|----------|
| POST | `/api/events/` | Request-Schema erweitert: `color`, `icon`, `is_template`, `group_id`, `invited_user_ids` |
| GET | `/api/events/check-slug/` | **NEU**: Slug-Verfügbarkeit prüfen (VOR `/{slug}/`!) |
| GET | `/api/events/templates/` | **NEU**: Vorlagen-Liste (VOR `/{slug}/`!) |
| POST | `/api/events/{slug}/duplicate/` | **NEU**: Event duplizieren (mit optionalem date_shift_weeks) |
| POST | `/api/events/{slug}/waitlist/` | **NEU**: Auf Warteliste setzen |
| DELETE | `/api/events/{slug}/waitlist/{id}/` | **NEU**: Von Warteliste entfernen |
| GET | `/api/events/{slug}/waitlist/` | **NEU**: Warteliste anzeigen |
| POST | `/api/events/{slug}/attendance/` | **NEU**: Check-in |
| PATCH | `/api/events/{slug}/attendance/{id}/` | **NEU**: Check-out |
| GET | `/api/events/{slug}/attendance/` | **NEU**: Anwesenheitsliste |
| GET | `/api/events/{slug}/checklist/` | **NEU**: Veröffentlichungs-Checkliste |
| POST | `/api/events/{slug}/import/` | **NEU**: Teilnehmer-Import (CSV/Excel) |
| GET | `/api/events/{slug}/rooms/` | **NEU**: Zimmereinteilung |
| POST | `/api/events/{slug}/rooms/` | **NEU**: Raum erstellen |
| PATCH | `/api/events/{slug}/rooms/{id}/` | **NEU**: Raum bearbeiten / Teilnehmer zuordnen |
| DELETE | `/api/events/{slug}/rooms/{id}/` | **NEU**: Raum löschen |
| POST | `/api/events/{slug}/parent-tokens/` | **NEU**: Eltern-Token generieren |
| GET | `/events/{slug}/parent/{token}` | **NEU**: Eltern-Ansicht (kein /api/-Prefix, öffentlich) |
| PATCH | `/api/locations/{id}/` | Schema erweitert: `latitude`, `longitude` |
| PATCH | `/api/meeting-points/{id}/` | Schema erweitert: `latitude`, `longitude` |

### Datenbank-Migrationen

1. `Event`: Neue Felder `color`, `icon`, `is_template`, `manual_phase`, `meal_plan` (FK)
2. `EventLocation`: Neue Felder `latitude`, `longitude`
3. `MeetingPoint`: Neue Felder `latitude`, `longitude`
4. Neues Model `WaitlistEntry` (person FK mit SET_NULL)
5. Neues Model `AttendanceRecord`
6. Neues Model `RoomAssignment` (mit M2M zu Participant)
7. Neues Model `ParentAccessToken`
