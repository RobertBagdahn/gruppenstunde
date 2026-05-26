## Context

Die Einstiegspunkte der drei prominentesten Tools (`/events`, `/session-planner`, `/meal-plans`) verhalten sich heute uneinheitlich:

- **Events**: `EventsLandingPage` = reine Marketing-Seite (statisch). App-Inhalt unter `/events/app` (`EventsPage`).
- **Session-Planner**: `SessionPlannerLandingPage` = Marketing. App unter `/session-planner/app` wirft bei Anonymous einen rohen 403-Fehler.
- **Meal-Plan**: `MealPlanLandingPage` = Marketing. App unter `/meal-plans/app` hat bereits einen freundlichen "Bitte einloggen"-Hinweis.

Gleichzeitig besitzt **nur** `event.Event` ein öffentliches Sichtbarkeits-Flag (`is_public=True`). `Planner` und `MealPlan` haben kein Public-Konzept.

Das bisherige Spec `event-landing-redesign` zweigt schon auf Auth-Status auf (Dashboard für User, Marketing für Anonyme). Diese Change erweitert nur den Anonymous-Zweig um echten öffentlichen Content.

## Goals / Non-Goals

**Goals:**
- Anonyme `/events`-Besucher sehen echte Inhalte (öffentliche Events) als Inspiration und Social Proof
- Klare CTAs zum Einloggen/Registrieren bleiben prominent
- Konsistente Unauth-States auch bei `/session-planner/app` und `/meal-plans/app`
- Keine Regression für eingeloggte User

**Non-Goals:**
- Kein Public-Flag für Planner/MealPlan (bewusste Design-Entscheidung)
- Keine Änderung der Events-Marketing-Inhalte (Features, FAQ, Hero) — die werden nur in den Empty-State verschoben
- Keine Änderung der Routing-Struktur

## Decisions

### Entscheidung: Eigener Endpunkt `GET /api/events/public-landing/`
Alternativen:
- **(a)** `limit`-Parameter an `GET /api/events/` anfügen
- **(b)** Eigener Endpunkt mit gezielter Query und Cache-Freundlichkeit

Gewählt: **(b)**. Gründe:
- Anonyme Abfrage ist speziell (nur `is_public=True`, kein Template, nur bevorstehende oder jüngst vergangene, sortiert nach `start_date`, max 12 Items)
- Cacheable als Public-Endpoint (gleiche Antwort für alle anonymen User)
- Saubere Trennung von der authentifizierten Listen-Logik mit komplexen Sichtbarkeits-Rules

### Entscheidung: Empty-State fällt auf Marketing-Layout zurück
Wenn keine öffentlichen Events existieren: Die Seite zeigt statt der Event-Liste wieder die `ToolLandingPage`-Komponente (Hero + Features + FAQ + CTA). Das schützt die UX in frühen Phasen oder zwischen Events.

### Entscheidung: Shared Unauth-Gate-Komponente
Statt pro Tool eigene Auth-Gate-Logik zu schreiben, kommt eine wiederverwendbare `<UnauthGate>` Komponente in `components/shared/`: nimmt einen Titel, Beschreibung und optional eine CTA-Route. Wird von Planner- und Meal-Plan-App-Route genutzt.

## Risks / Trade-offs

- **Risk**: Öffentliche Events können als Spam/ungeeigneter Content auf der Landing erscheinen. → **Mitigation**: `is_public=True` setzen Admins explizit; Moderation bleibt Verantwortung der Event-Ersteller; falls später problematisch → zusätzlicher Approval-Filter möglich.
- **Risk**: Landing-Query wird bei wachsender Event-Zahl langsam. → **Mitigation**: Hart auf 12 Items limitiert; Index auf `(is_public, is_template, start_date)` falls noch nicht vorhanden prüfen.
- **Trade-off**: Eigener Endpunkt = kleine Code-Duplikation vs. flexibler Listenendpunkt. → Die Cache-Vorteile und semantische Klarheit rechtfertigen den Mehraufwand.

## Open Questions

- Sollen vergangene öffentliche Events auf der Landing erscheinen, wenn keine bevorstehenden existieren? (Default: ja, sortiert `start_date DESC`, letzte 12 — als Social Proof "das haben wir gemacht")
