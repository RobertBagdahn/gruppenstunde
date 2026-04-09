## Context

Die Event-App (`backend/event/`) bietet aktuell grundlegende CRUD-Funktionalität: Events mit Buchungsoptionen, Registrierungen, Teilnehmer-Verwaltung, Einladungen (User + Gruppen), Tagesplan (EventDaySlot) und AI-generierte Einladungstexte. Die Frontend-App (`frontend/src/pages/EventsPage.tsx`) nutzt ein Master-Detail-Layout mit Sidebar.

Veranstaltern fehlen jedoch professionelle Verwaltungswerkzeuge:
- **Keine Timeline**: Kein Audit-Log über An-/Abmeldungen und Statusänderungen
- **Kein Payment-Tracking**: Nur ein `is_paid` Boolean, keine Details zu Zahlungen
- **Kein Export**: Keine Möglichkeit, Teilnehmerlisten als Excel/CSV/PDF zu exportieren
- **Keine E-Mails**: Keine Möglichkeit, Teilnehmer direkt zu kontaktieren
- **Keine Statistiken**: Nur einfache Zähler, keine visuellen KPIs
- **Keine Custom Fields**: Veranstalter können keine eigenen Fragen definieren
- **Keine Labels**: Keine Möglichkeit, Teilnehmer zu taggen/organisieren

Zusätzlich sind alle großen Django-Apps als monolithische Einzeldateien organisiert (ein großes `models.py`, `api.py`, `schemas.py`). Die größte App (`content`) hat 7.022 Zeilen mit 31 Inline-Schemas in `api.py` und keinem eigenen `schemas.py`. Vor dem Hinzufügen neuer Features muss die Codebasis restrukturiert werden.

## Goals / Non-Goals

**Goals:**
- Alle großen Django-Apps in Hybrid Package-Struktur umbauen (Phase 0)
- Veranstaltern ein vollständiges Dashboard mit Tab-Navigation für alle Verwaltungsaufgaben bereitstellen
- Vollständige Audit-Timeline für alle Teilnehmer-Aktionen
- Manuelles Payment-Tracking mit Zahlungsmethode, Betrag, Datum und Bemerkung
- Konfigurierbarer Export von Teilnehmerlisten (Excel, CSV, PDF) mit Spaltenauswahl
- Manuelle Rundmails an Teilnehmer mit Platzhalter-System
- Visuelle Statistiken (Auslastung, Zahlungen, Demographie, Ernährung)
- Custom Fields: Veranstalter definiert eigene Fragen pro Event
- Teilnehmer-Labels für organisatorische Zwecke
- Kontaktperson klar erkennbar (responsible_persons Daten exponieren)
- Verbesserte Landing Page mit Feature-Showcase und Walkthrough

**Non-Goals:**
- Automatischer Bankonto-Abgleich (SEPA-Matching) — nur manuelles Tracking
- Automatische E-Mails (bei Anmeldung, Zahlung etc.) — nur manuelle Mails
- Warteliste — explizit ausgeschlossen
- Teilnehmer-Karte mit Wohnorten — später
- Preisstufen/Rabatte — ein Preis pro BookingOption reicht
- Zuschuss-Feature — kann über Custom Fields abgebildet werden
- Formular-Einbettung auf externen Webseiten
- Online-Zahlung (PayPal-Integration etc.) — nur Tracking der Offline-Zahlung
- Package-Umbau für kleine Apps (session, game, blog) — zu klein, nicht lohnend

## Decisions

### 1. Package-Struktur: Option C — Hybrid Package-Struktur (eine App, intern als Packages)

**Entscheidung**: Alle großen Django-Apps behalten ihre Identität als einzelne Django-App, werden aber intern als Python-Packages organisiert. `models.py` wird zu `models/`, `api.py` zu `api/`, `schemas.py` zu `schemas/`. Jedes Package hat ein `__init__.py` das alles re-exportiert, sodass bestehende Imports (`from event.models import Event`) weiterhin funktionieren.

**Betroffene Apps und ihre Package-Aufteilung**:

```
# EVENT (2.261 Zeilen → wird massiv erweitert)
backend/event/
  models/
    __init__.py         → re-exports
    core.py             → Event, BookingOption, EventLocation, Person, Registration, Participant
    day_slots.py        → EventDaySlot
    timeline.py         → TimelineEntry (NEU)
    payment.py          → Payment (NEU)
    custom_fields.py    → CustomField, CustomFieldValue (NEU)
    labels.py           → ParticipantLabel (NEU)
  api/
    __init__.py         → re-exports router
    events.py           → Event CRUD, Einladungen
    participants.py     → Teilnehmer-Verwaltung, Filter
    persons.py          → Person CRUD
    locations.py        → EventLocation CRUD
    day_slots.py        → EventDaySlot CRUD
    timeline.py         → Timeline-Endpunkte (NEU)
    payment.py          → Payment-Endpunkte (NEU)
    export.py           → Export-Endpunkte (NEU)
    mail.py             → Mail-Endpunkte (NEU)
    stats.py            → Statistik-Endpunkte (NEU)
    custom_fields.py    → Custom Field Endpunkte (NEU)
    labels.py           → Label-Endpunkte (NEU)
  schemas/
    __init__.py         → re-exports
    core.py             → Event, BookingOption, Location, Person, Registration, Participant Schemas
    day_slots.py        → EventDaySlot Schemas
    timeline.py         → Timeline Schemas (NEU)
    payment.py          → Payment Schemas (NEU)
    export.py           → Export Schemas (NEU)
    mail.py             → Mail Schemas (NEU)
    stats.py            → Stats Schemas (NEU)
    custom_fields.py    → Custom Field Schemas (NEU)
    labels.py           → Label Schemas (NEU)
  services/
    timeline.py         → TimelineService (NEU)
    payment.py          → PaymentService (NEU)
    export.py           → ExportService (NEU)
    mail.py             → MailService (NEU)
    stats.py            → StatsService (NEU)

# CONTENT (7.022 Zeilen — DRINGENDSTER UMBAU)
backend/content/
  models/
    __init__.py         → re-exports
    core.py             → SoftDeleteModel, Content (abstract)
    tags.py             → Tag, ScoutLevel, TagSuggestion
    interactions.py     → ContentComment, ContentEmotion, ContentView
    links.py            → ContentLink, EmbeddingFeedback
    approval.py         → ApprovalLog, FeaturedContent
    search.py           → SearchLog
  api/
    __init__.py         → re-exports router
    search.py           → Search + Autocomplete Endpunkte
    ai.py               → KI-Features (improve-text, suggest-tags, refurbish, generate-image, suggest-supplies)
    approval.py         → Approval-Workflow + Admin-Approval + Queue
    admin.py            → Admin-Endpunkte (Embeddings, Feedback)
    content_links.py    → ContentLink CRUD + Feedback
    featured.py         → Featured Content
    tags.py             → Tags + Tag-Vorschläge
  schemas/
    __init__.py         → re-exports
    base.py             → ContentListOut, ContentDetailOut, ContentCreateIn, etc. (aus base_schemas.py)
    search.py           → UnifiedSearchFilterIn, UnifiedSearchResultOut, etc. (aus api.py inline)
    ai.py               → AiImproveTextIn/Out, AiRefurbishIn/Out, etc. (aus api.py inline)
    approval.py         → ApprovalQueueItemOut, ApprovalActionIn/Out, etc. (aus api.py inline)
    admin.py            → EmbeddingStatusItemOut, etc. (aus api.py inline)
    content_links.py    → ContentLinkDetailOut, etc. (aus api.py inline)
    tags.py             → TagOut, TagTreeOut, etc. (aus base_schemas.py)
  services/             → bleibt wie bisher (8 Dateien)

# SUPPLY (3.154 Zeilen)
backend/supply/
  models/
    __init__.py         → re-exports
    material.py         → Supply (abstract), Material, ContentMaterialItem
    ingredient.py       → Ingredient, IngredientAlias, Portion, Price
    reference.py        → MeasuringUnit, NutritionalTag, RetailSection
  api/
    __init__.py         → re-exports router
    materials.py        → Material CRUD + Suche
    ingredients.py      → Ingredient CRUD + Portionen + Preise + Aliases
    reference.py        → MeasuringUnits, NutritionalTags, RetailSections
  schemas/
    __init__.py         → re-exports
    materials.py        → Material Schemas
    ingredients.py      → Ingredient + Portion + Price Schemas
    reference.py        → MeasuringUnit, NutritionalTag, RetailSection Schemas
  services/             → bleibt wie bisher (5 Dateien)

# PROFILES (1.309 Zeilen)
backend/profiles/
  models/
    __init__.py         → re-exports
    profile.py          → UserProfile, UserPreference
    groups.py           → UserGroup, GroupMembership, GroupJoinRequest
  api/
    __init__.py         → re-exports router
    profile.py          → Profile/Preferences CRUD
    groups.py           → Group CRUD, Members, Join-Requests
  schemas/
    __init__.py         → re-exports
    profile.py          → Profile + Preference Schemas
    groups.py           → Group + Membership Schemas

# RECIPE (2.208 Zeilen)
backend/recipe/
  models/
    __init__.py         → re-exports
    recipe.py           → Recipe
    items.py            → RecipeItem
    hints.py            → RecipeHint
  api/
    __init__.py         → re-exports router
    recipes.py          → Recipe CRUD + Image + Similar + Interactions
    items.py            → RecipeItem CRUD
    nutrition.py        → NutriScore, Nutrition-Breakdown, Recipe-Checks
  schemas/
    __init__.py         → re-exports
    recipes.py          → Recipe List/Detail/Create/Update Schemas
    items.py            → RecipeItem Schemas
    nutrition.py        → NutriScore, NutritionBreakdown Schemas
  services/             → bleibt wie bisher (recipe_checks.py)

# PLANNER (1.451 Zeilen)
backend/planner/
  models/
    __init__.py         → re-exports
    planner.py          → Planner, PlannerEntry, PlannerCollaborator
    meal_plan.py        → MealPlan, MealDay, Meal, MealItem
  api/
    __init__.py         → re-exports router
    planner.py          → Planner CRUD + Entries + Invite
    meal_plan.py        → MealPlan CRUD + Days + Meals + Items + Nutrition + Shopping
  schemas/
    __init__.py         → re-exports
    planner.py          → Planner Schemas
    meal_plan.py        → MealPlan Schemas
```

**Begründung**: Bietet die Vorteile kleiner Dateien (Übersichtlichkeit, Git-Merge-Freundlichkeit, Feature-Isolation) ohne die Nachteile separater Django-Apps (circular imports, komplexe INSTALLED_APPS, Admin-Registrierung). Re-Exports in `__init__.py` garantieren Rückwärtskompatibilität.

**Alternativen**:
- (A) Separate Django-Apps — abgelehnt wegen circular dependencies und Overhead
- (B) Alles in einer Datei belassen — abgelehnt wegen wachsender Unübersichtlichkeit

### 2. Timeline: Einfaches Event-Log-Model statt Django-Signals

**Entscheidung**: Ein `TimelineEntry` Model mit expliziten Service-Aufrufen statt automatischer Signal-basierter Erfassung.

**Begründung**: Signals sind schwer zu debuggen, testen und kontrollieren. Explizite `TimelineService.log()` Aufrufe in den API-Endpunkten sind transparenter und erlauben granulare Kontrolle über welche Aktionen geloggt werden.

**Model**: `TimelineEntry(event, participant (nullable), user (nullable), action_type, description, metadata (JSONField), created_at)`

**Action Types**: `registered`, `unregistered`, `payment_received`, `payment_removed`, `booking_changed`, `label_added`, `label_removed`, `custom_field_updated`, `mail_sent`, `participant_updated`

### 3. Payment: Separates Payment-Model, `is_paid` DB-Feld wird entfernt

**Entscheidung**: Ein `Payment` Model wird hinzugefügt. Das bestehende `is_paid` BooleanField auf `Participant` wird **per Migration entfernt**. Stattdessen wird `is_paid` als `@property` implementiert, das `total_paid >= booking_option.price` berechnet.

**Model**: `Payment(participant, amount, method (bar/paypal/überweisung/sonstige), received_at, location, note, created_by, created_at)`

**Begründung**: Ein Property kann kein gleichnamiges DB-Feld überschreiben. Das DB-Feld muss also entfernt werden. Da das Projekt sich in aktiver Entwicklung befindet und keine Rückwärtskompatibilität nötig ist, ist dies die sauberste Lösung. Bestehende Participant-Einträge haben keine Payments, also wird `is_paid` automatisch `False`.

**Migration**:
1. `Payment` Model hinzufügen
2. `is_paid` Feld von `Participant` entfernen
3. `is_paid` als `@property` auf `Participant` implementieren

### 4. Export: Serverseitiger Export statt Client-seitig

**Entscheidung**: Export wird serverseitig generiert (Django Endpoint gibt Datei zurück) statt client-seitig (jspdf/xlsx im Browser).

**Begründung**: Serverseitiger Export hat Zugriff auf alle Daten (inkl. Custom Fields, Labels, Payments) ohne große API-Calls. Libraries: `openpyxl` für Excel, `csv` stdlib für CSV, `reportlab` für PDF. Der Client sendet eine Export-Konfiguration (gewünschte Spalten, Filter, Format) und erhält die Datei als Download.

### 5. Mail: Django send_mail statt externer Service

**Entscheidung**: Mails werden über Django's `send_mail()` mit dem konfigurierten SMTP-Backend gesendet.

**Begründung**: Einfachste Lösung für manuelle Mails. Kein externer Service nötig. Platzhalter werden server-seitig ersetzt. Verfügbare Platzhalter: `{vorname}`, `{nachname}`, `{event_name}`, `{buchungsoption}`, `{preis}`.

### 6. Custom Fields: Separate Models statt JSONField

**Entscheidung**: Custom Field Definitionen werden als `CustomField` Model gespeichert. Die Antworten werden als `CustomFieldValue` Model mit FK zum Participant gespeichert.

**Model**: 
- `CustomField(event, label, field_type (text/select/checkbox/date/number), options (JSONField für Select-Optionen), is_required, sort_order)`
- `CustomFieldValue(custom_field, participant, value (TextField))`

**Begründung**: Separate Models erlauben Validierung, Filterung und Export pro Feld. JSONField für die Optionen von Select-Feldern ist flexibel genug.

### 7. Frontend: Tab-basiertes Dashboard statt Master-Detail-Erweiterung

**Entscheidung**: Die Organizer-Ansicht wird als eigene Page `/events/app/:slug` mit horizontaler Tab-Navigation implementiert:
- **Übersicht** (Zusammenfassung, KPIs, Kontaktperson, Quick Actions)
- **Teilnehmer** (Liste mit Filter, Labels, Custom Fields)
- **Zahlungen** (Payment-Übersicht, neue Zahlung erfassen)
- **Timeline** (Chronologische Aktions-Historie)
- **E-Mails** (Rundmail-Composer)
- **Exporte** (Spaltenauswahl, Format, Download)
- **Einstellungen** (Custom Fields, Labels, Event-Daten bearbeiten)

**Begründung**: Tabs trennen Concerns klar und sind Mobile-freundlich (swipeable). Die bestehende EventsPage bleibt als Event-Liste/Auswahl erhalten, aber der Klick auf ein Event navigiert zu `/events/app/:slug`.

### 8. Labels: Einfaches Tag-Model

**Entscheidung**: `ParticipantLabel(event, name, color)` mit M2M-Relation zu `Participant`.

**Begründung**: Labels sind event-spezifisch (z.B. "Zelt A" gilt nur für ein bestimmtes Lager). Farben ermöglichen visuelle Unterscheidung in der Teilnehmerliste.

### 9. Kontaktperson: responsible_persons Daten exponieren

**Entscheidung**: Kein neues Model. Die API exponiert die Daten (Name, E-Mail) der `responsible_persons` im Event-Detail. Das Frontend zeigt diese prominent im Übersicht-Tab an.

**Begründung**: Die verantwortlichen Personen SIND die Kontaktpersonen. Ein separates Feld wäre redundant. Die User-Daten werden über den bestehenden User-FK aufgelöst.

### 10. Kein Payment-Update/PATCH — Buchungsprinzip

**Entscheidung**: Payments haben keinen PATCH/PUT-Endpunkt. Zahlungen sind nach Erstellung unveränderlich. Wenn ein falscher Betrag erfasst wurde, muss die Zahlung gelöscht und eine neue erstellt werden.

**Begründung**: Buchungsprinzip — nachträgliche Änderungen an Zahlungseinträgen sind aus Revisionssicht problematisch. Das Löschen + Neuerstellen erzeugt einen sauberen Timeline-Eintrag (payment_removed + payment_received) und ist für den typischen Pfadfinder-Anwendungsfall (wenige Zahlungen pro Teilnehmer) ausreichend einfach.

### 11. Statistiken im Übersicht-Tab, kein separater Tab

**Entscheidung**: Alle Statistiken (KPI-Cards, Charts) werden direkt im Übersicht-Tab angezeigt. Es gibt keinen separaten "Statistiken"-Tab.

**Begründung**: Die Statistiken sind die wichtigste Information für den Veranstalter und sollten sofort sichtbar sein. KPI-Cards (Teilnehmer, Bezahlt, Einnahmen) stehen oben, darunter folgen Charts (Geschlechterverteilung, Altersverteilung, Anmelde-Timeline). Der Tab ist scrollbar. Ein separater Tab würde die Statistiken verstecken.

## Risks / Trade-offs

**[R1] Package-Umbau betrifft viele Dateien** → Mitigation: Re-Exports in `__init__.py` garantieren Rückwärtskompatibilität. Umbau wird als Phase 0 VOR neuen Features durchgeführt. Jede App wird einzeln umgebaut und getestet.

**[R2] `is_paid` Migration ist breaking** → Mitigation: Feld wird per Migration entfernt. Keine Datenmigration nötig — bestehende Participants haben keine Payments und `is_paid` war `False`. Projekt erfordert keine Rückwärtskompatibilität.

**[R3] E-Mail-Delivery** → Mitigation: Mails werden über Django's konfiguriertes SMTP-Backend gesendet. In Development: Console-Backend. In Production: Tatsächlicher SMTP-Server. Fehlgeschlagene Mails werden in der Timeline geloggt.

**[R4] Export-Performance bei großen Events** → Mitigation: Für die erste Version synchron (die meisten Pfadfinder-Events haben <200 Teilnehmer).

**[R5] Custom Fields: Untypisierte Werte** → Mitigation: Validierung im Backend anhand des `field_type`. Select-Werte werden gegen `options` geprüft. Frontend zeigt den passenden Input-Typ.

## Betroffene Dateien

### Phase 0: Package-Umbau (Refactoring)
- `backend/content/models.py` → `backend/content/models/` (core.py, tags.py, interactions.py, links.py, approval.py, search.py)
- `backend/content/api.py` → `backend/content/api/` (search.py, ai.py, approval.py, admin.py, content_links.py, featured.py, tags.py)
- `backend/content/base_schemas.py` + inline schemas → `backend/content/schemas/` (base.py, search.py, ai.py, approval.py, admin.py, content_links.py, tags.py)
- `backend/event/models.py` → `backend/event/models/` (core.py, day_slots.py)
- `backend/event/api.py` → `backend/event/api/` (events.py, participants.py, persons.py, locations.py, day_slots.py)
- `backend/event/schemas.py` → `backend/event/schemas/` (core.py, day_slots.py)
- `backend/supply/models.py` → `backend/supply/models/` (material.py, ingredient.py, reference.py)
- `backend/supply/api.py` → `backend/supply/api/` (materials.py, ingredients.py, reference.py)
- `backend/supply/schemas.py` → `backend/supply/schemas/` (materials.py, ingredients.py, reference.py)
- `backend/profiles/models.py` → `backend/profiles/models/` (profile.py, groups.py)
- `backend/profiles/api.py` → `backend/profiles/api/` (profile.py, groups.py)
- `backend/profiles/schemas.py` → `backend/profiles/schemas/` (profile.py, groups.py)
- `backend/recipe/models.py` → `backend/recipe/models/` (recipe.py, items.py, hints.py)
- `backend/recipe/api.py` → `backend/recipe/api/` (recipes.py, items.py, nutrition.py)
- `backend/recipe/schemas.py` → `backend/recipe/schemas/` (recipes.py, items.py, nutrition.py)
- `backend/planner/models.py` → `backend/planner/models/` (planner.py, meal_plan.py)
- `backend/planner/api.py` + `meal_plan_api.py` → `backend/planner/api/` (planner.py, meal_plan.py)
- `backend/planner/schemas.py` → `backend/planner/schemas/` (planner.py, meal_plan.py)

### Phase 1–4: Event-Features (Backend)
- `backend/event/models/timeline.py` — NEU: TimelineEntry
- `backend/event/models/payment.py` — NEU: Payment
- `backend/event/models/custom_fields.py` — NEU: CustomField, CustomFieldValue
- `backend/event/models/labels.py` — NEU: ParticipantLabel + M2M auf Participant
- `backend/event/models/core.py` — Participant.is_paid entfernt, @property hinzugefügt
- `backend/event/api/timeline.py` — NEU
- `backend/event/api/payment.py` — NEU
- `backend/event/api/export.py` — NEU
- `backend/event/api/mail.py` — NEU
- `backend/event/api/stats.py` — NEU
- `backend/event/api/custom_fields.py` — NEU
- `backend/event/api/labels.py` — NEU
- `backend/event/schemas/` — Neue Schema-Dateien für alle Features
- `backend/event/services/` — Neue Service-Dateien
- `backend/event/admin.py` — Neue Models registrieren

### Phase 1–4: Event-Features (Frontend)
- `frontend/src/schemas/event.ts` — Neue Zod Schemas
- `frontend/src/api/events.ts` — Neue TanStack Query Hooks
- `frontend/src/pages/EventDetailPage.tsx` — NEUE Page mit Tab-Dashboard
- `frontend/src/pages/EventsPage.tsx` — Navigation zu Detail-Page anpassen
- `frontend/src/pages/EventsLandingPage.tsx` — Feature-Showcase erweitern
- `frontend/src/components/events/` — Neue Komponenten
- `frontend/src/App.tsx` — Neue Route `/events/app/:slug`

### Neue API-Endpunkte

| Method | Path | Request | Response | Auth |
|--------|------|---------|----------|------|
| GET | `/api/events/{slug}/timeline/` | `?page=1&page_size=20` | Paginated TimelineEntryOut | Manager |
| GET | `/api/events/{slug}/payments/` | `?page=1&page_size=20` | Paginated PaymentOut | Manager |
| POST | `/api/events/{slug}/payments/` | PaymentCreateIn | PaymentOut | Manager |
| DELETE | `/api/events/{slug}/payments/{id}/` | — | 204 | Manager |
| GET | `/api/events/choices/payment-methods/` | — | List[ChoiceOut] | Any |
| POST | `/api/events/{slug}/export/` | ExportConfigIn | File (Excel/CSV/PDF) | Manager |
| GET | `/api/events/{slug}/export/columns/` | — | List[ExportColumnOut] | Manager |
| POST | `/api/events/{slug}/send-mail/` | MailCreateIn | MailResultOut | Manager |
| GET | `/api/events/{slug}/stats/` | — | StatsOut | Manager |
| GET | `/api/events/{slug}/custom-fields/` | — | List[CustomFieldOut] | Manager |
| POST | `/api/events/{slug}/custom-fields/` | CustomFieldCreateIn | CustomFieldOut | Manager |
| PATCH | `/api/events/{slug}/custom-fields/{id}/` | CustomFieldUpdateIn | CustomFieldOut | Manager |
| DELETE | `/api/events/{slug}/custom-fields/{id}/` | — | 204 | Manager |
| GET | `/api/events/{slug}/labels/` | — | List[LabelOut] | Manager |
| POST | `/api/events/{slug}/labels/` | LabelCreateIn | LabelOut | Manager |
| PATCH | `/api/events/{slug}/labels/{id}/` | LabelUpdateIn | LabelOut | Manager |
| DELETE | `/api/events/{slug}/labels/{id}/` | — | 204 | Manager |
| POST | `/api/events/{slug}/participants/{id}/labels/` | LabelAssignIn | 200 | Manager |
| DELETE | `/api/events/{slug}/participants/{id}/labels/{label_id}/` | — | 204 | Manager |
| PATCH | `/api/events/{slug}/participants/{id}/custom-fields/` | CustomFieldValuesIn | 200 | Owner/Manager |

### Datenbank-Migrations
- Neue Tabelle: `event_timelineentry`
- Neue Tabelle: `event_payment`
- Neue Tabelle: `event_customfield`
- Neue Tabelle: `event_customfieldvalue`
- Neue Tabelle: `event_participantlabel`
- Neue Tabelle: `event_participant_labels` (M2M)
- Alteration: `event_participant` — `is_paid` Feld wird **entfernt** (Migration)
