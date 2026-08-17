# Design: Search Mine Scope Filter

## Context

Der globale Search-Endpunkt `/api/content/search/` deckt 5 Content-Typen ab: `GroupSession`, `Blog`, `Game`, `Recipe`, `Event`. User haben pro Typ unterschiedliche Beziehungen (Autor, Ersteller, Eingeladener, Angemeldeter, Verantwortlicher). Ein einheitlicher `scope=mine`-Filter soll all diese Semantiken abbilden, ohne 5 separate Endpunkte zu bauen.

## Goals

- Einheitlicher URL-Parameter `scope` für alle indizierten Typen
- Umfassende "Meine"-Semantik (Besitz + Kollaboration + Einladung + Anmeldung, je nach Typ)
- Drafts bei `scope=mine` sichtbar (für eigene unveröffentlichte Beiträge)
- Templates grundsätzlich ausgeschlossen

## Non-Goals

- Planner, MealPlan, Material, Ingredient in Search aufnehmen (separate Change)
- Recipe-Origin-Filter (`verified/community/all`) ablösen — existiert weiter auf Recipe-Listenseite
- Feingranulare Unterscheidung (z.B. "nur Einladungen", "nur Anmeldungen") — nur Boolean mine/all

## Decisions

### Decision 1: Ein Boolean-Toggle statt Multi-Select

**Entscheidung**: `scope=mine` als einfacher Toggle, keine 4-Werte-Enum wie bei Recipe (`all/verified/community/mine`).

**Begründung**: Der globale Search ist typ-übergreifend. Ein `verified`-Filter ergibt nur für Recipes Sinn. User wollen primär "alles was mit mir zu tun hat" — das erfüllt `mine`. Feinere Filter bleiben auf Tool-spezifischen Listenseiten.

### Decision 2: Umfassende Event-Semantik

**Entscheidung**: Ein Event gilt als "mine" wenn der User:
- `created_by` ist, ODER
- in `responsible_persons` M2M gelistet ist, ODER
- in `invited_users` M2M gelistet ist, ODER
- Mitglied einer Gruppe in `invited_groups` M2M ist, ODER
- eine `Registration` für dieses Event hat (unabhängig vom Status).

**Begründung**: Minimale Semantik (nur `created_by`) würde Eingeladene/Angemeldete ausschließen — das ist der häufigste "meine Events"-Use-Case. Die umfassende Definition entspricht dem Mental Model "Events, die mich betreffen".

**Implementierung**: Q-Objekt mit OR-Chain:
```python
Q(created_by=user)
| Q(responsible_persons=user)
| Q(invited_users=user)
| Q(invited_groups__in=user.groups.all())
| Q(registrations__user=user)
```
Mit `.distinct()` zur Duplikat-Vermeidung durch JOINs.

### Decision 3: Drafts bei mine=true sichtbar

**Entscheidung**: Die bestehende Invariante "Search zeigt nur `status=APPROVED`" wird bei `scope=mine` gelockert. Eigene Drafts erscheinen dann in den Ergebnissen.

**Begründung**: User suchen nach eigenen Beiträgen oft, um sie zu finden/weiterzubearbeiten — auch vor der Freigabe. Ohne Drafts wäre "Meine Beiträge" lückenhaft.

**Visuelles Feedback**: Draft-Items bekommen in der Ergebnisliste ein "Entwurf"-Badge. (Frontend-seitig via existierendes Status-Feld.)

### Decision 4: Templates immer ausgeschlossen

**Entscheidung**: Events mit `is_template=True` werden aus jeder Search-Response entfernt, auch bei `scope=mine`.

**Begründung**: Templates sind Baupläne, keine echten Events. Sie gehören nicht in die Ergebnisliste einer Content-Suche. User, die Templates suchen, nutzen die Event-Template-Verwaltung.

### Decision 5: Toggle-Position im UI

**Entscheidung**: Toggle "Nur meine Beiträge" als shadcn/ui `Switch` in der Filter-Zeile neben dem Sort-Select (SearchPage Zeile ~310-323). Nur sichtbar für eingeloggte User.

**Begründung**: Filter-Zeile ist der etablierte Ort für Result-Modifikationen. Switch ist platzsparend und eindeutig binär. Unsichtbar bei Anonymen, weil `scope=mine` ohne Session bedeutungslos ist.

### Decision 6: URL-State

**Entscheidung**: `?scope=mine` wird in der URL persistiert. Default (`scope=all` oder Absenz) wird nicht in die URL geschrieben.

**Begründung**: URL-driven state ist AGENTS.md-Konvention. Sharebare Links funktionieren. Saubere URL ohne Default-Pollution.

## Risks / Trade-offs

- **Performance**: Event-Filter erzeugt mehrere LEFT JOINs. Mitigation: Subquery oder `exists()` statt JOIN wo möglich, `.distinct()` beibehalten.
- **Konsistenz mit Recipe-Origin**: RecipePage hat eigenen `origin=mine` Filter. Wenn User von RecipePage (`origin=mine`) zur globalen Search wechselt und dort `scope=mine` nutzt, sind die Ergebnisse fast identisch — aber nicht exakt (Recipe-`origin=mine` ≠ `owner`; globaler `scope=mine` = `owner OR authors`). Akzeptabel, da beide Filter dokumentiert unterschiedliche Semantik haben.
- **Draft-Leak**: Durch Draft-Sichtbarkeit bei mine=true muss der Backend-Filter zwingend gegen `request.user` matchen — kein User darf fremde Drafts sehen. Test-Coverage erforderlich.

## Migration Plan

Nicht-breaking. Alte Requests ohne `scope` verhalten sich unverändert (default `all`). Frontend-Toggle ist additiv.

## Open Questions

Keine offenen Punkte. Alle semantischen Entscheidungen mit User abgestimmt.
