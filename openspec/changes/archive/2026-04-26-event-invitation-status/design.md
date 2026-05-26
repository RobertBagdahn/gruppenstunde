## Context

`Event` hat bereits alle Datenstrukturen für Einladungen:
- `invited_users` M2M → User
- `invited_groups` M2M → UserGroup (User via `GroupMembership` indirekt eingeladen)
- `Event.user_is_invited(user)` Methode kombiniert bereits public + invited_users + invited_groups + managed

Im bestehenden `list_events`-Endpoint wird bereits pro Event ein `_is_registered`-Flag gesetzt (durch Lookup in `Registration`). Wir folgen demselben Pattern für `is_invited`, aber: die bestehende `user_is_invited`-Methode beinhaltet auch `is_public`, was für den Status-Badge falsch wäre — wir brauchen "persönlich eingeladen", nicht "sichtbar".

Im Frontend zeigt `EventCard` (`EventsPage.tsx:91-104`) zwei Badges abhängig von `is_registered` und `phase`. Der neue Zustand ergänzt das orthogonal.

## Goals / Non-Goals

**Goals:**
- Klares Signal "offene Einladung" auf jeder Event-Card
- Keine N+1-Queries beim Listen-Abruf
- Schema-Synchronität Pydantic ↔ Zod

**Non-Goals:**
- Keine neue Invitation-Workflow-Logik (Einladungen versenden, Erinnerungen, etc.)
- Kein "Ablehnen"-Status (User kann heute schon nicht explizit ablehnen, nur ignorieren)
- Keine Änderung an der separaten "Eingeladene Events"-Sektion — die bleibt als Aggregatsicht bestehen
- Keine CTA-Quick-Action "Jetzt anmelden" direkt aus der Card heraus (könnte Folge-Change sein)

## Decisions

### Entscheidung: Eigene Methode `user_is_personally_invited(user)` auf Event
`user_is_invited` kombiniert bereits verschiedene Sichtbarkeitsquellen (public, invited_users, invited_groups, managed). Für den Badge-Zustand brauchen wir eine striktere Version: **nur** invited_users ODER invited_groups∩my_groups. `responsible_persons` und `created_by` zählen NICHT als "eingeladen" — diese User sind Organisatoren, kein Einladungsempfänger.

### Entscheidung: Prefetch + In-Memory-Evaluation
Um N+1 zu vermeiden:
- `prefetch_related('invited_users', 'invited_groups')` am QuerySet
- User-Gruppen einmalig laden (`user.groupmemberships.values_list('group_id', flat=True)`)
- Pro Event in Python prüfen

Alternative: SQL-Subquery mit `Exists`. Bei den erwarteten Listengrößen (typ. <50 pro Seite) ist Prefetch einfacher und schnell genug.

### Entscheidung: Badge-Priorität
Reihenfolge im UI (nur der höchste gewinnt):
1. `is_registered=True` → "Angemeldet" (grün, `check_circle`)
2. `is_invited=True AND NOT is_registered AND phase ∈ {pre_registration, registration}` → "Anmeldung steht aus" (amber, `pending_actions`)
3. `NOT is_invited AND NOT is_registered AND phase=registration` → "Anmeldung offen" (violett, `app_registration`)
4. sonst: kein Badge (nur `PhaseBadge`)

## Risks / Trade-offs

- **Risk**: Performance bei sehr großen Event-Listen durch Prefetch + Gruppen-Lookup. → **Mitigation**: Pagination limitiert auf `page_size=20`; Gruppen-IDs werden einmal pro Request geladen.
- **Risk**: Badge-Vielfalt überladet die Card visuell. → **Mitigation**: Nur ein Status-Badge gleichzeitig gerendert (Priorität-Regel).
- **Trade-off**: Kein expliziter "Ablehnen"-Mechanismus — User kann Einladung nur durch Anmeldung oder Ignorieren beantworten. Bewusste Vereinfachung.
