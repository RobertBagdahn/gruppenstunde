## Why

Die Landing-Page `/events` ist aktuell für nicht-eingeloggte User eine reine Marketing-Seite ohne echte Inhalte. Dabei gibt es in der Plattform öffentliche Events (`Event.is_public=True`), die das Tool konkret und wertvoll bewerben könnten und Interessenten direkten Einstieg in das System bieten.

Der gleiche Mechanismus soll **nicht** für Gruppenstundenplan und Essensplan umgesetzt werden, da deren Datenmodelle (`planner.Planner`, `planner.MealPlan`) kein öffentliches Sichtbarkeits-Konzept haben — diese bleiben Marketing-Landings mit Login-CTA.

## What Changes

- `/events` zeigt für **nicht-eingeloggte** User eine Liste öffentlicher Events (`is_public=True`, kein Template) statt der reinen Marketing-Landing — mit klarem CTA zum Einloggen/Registrieren
- `/events` zeigt für **eingeloggte** User weiterhin das bestehende Dashboard-Layout (unverändert durch `event-landing-redesign`)
- Bei **null öffentlichen Events** zeigt die anonyme View einen Empty-State mit Marketing-Text und Login-CTA (Fallback auf altes Verhalten)
- **Backend-Ergänzung**: neuer Endpunkt oder Parameter `limit` für kompaktere Landing-Abfrage (max. 12 Events statt voller Pagination)
- **Nicht betroffen**: `/session-planner` und `/meal-plans` Landing-Pages bleiben reine Marketing-Seiten
- **Bonus**: App-Routen `/session-planner/app` und `/meal-plans/app` bekommen freundlichere Anonymous-States (keine harten 403, sondern UI-Hinweis "Bitte einloggen")

## Capabilities

### New Capabilities
(keine)

### Modified Capabilities
- `event-landing-redesign`: Anonyme User sehen nicht mehr nur Marketing, sondern eine Liste öffentlicher Events (falls vorhanden)
- `planner`: App-Route zeigt bei fehlender Authentifizierung eine freundliche Login-Aufforderung statt rohem API-Fehler
- `meal-plan`: (bereits freundlicher Auth-Gate vorhanden — nur konsistente UI-Komponente mit Planner sicherstellen)

## Impact

- **Backend**: `backend/event/api/events.py` — optionaler `limit`-Parameter oder neuer Endpunkt `GET /api/events/public-landing/` für die anonyme Landing-Abfrage (nur `is_public=True`, kein Template, nächste bevorstehende nach `start_date`)
- **Backend-Schemas**: Bestehendes Event-List-Schema (Pydantic) wiederverwenden
- **Frontend**:
  - `frontend/src/pages/tools/EventsLandingPage.tsx` — neue Logik: Public-Events-Liste + Empty-State
  - `frontend/src/api/events.ts` — neuer Hook `usePublicLandingEvents()` falls separater Endpunkt
  - `frontend/src/schemas/event.ts` — ggf. Extra-Schema für die kompakte Landing-Liste (oder bestehendes wiederverwenden)
  - `frontend/src/pages/PlannerPage.tsx` und `frontend/src/pages/planning/MealEventListPage.tsx` — konsistente Unauth-States (shared Komponente wiederverwenden)
- **Routing**: Keine Änderungen (`/events` bleibt `EventsLandingPage`, `EventsPage` bleibt unter `/events/app`)
- **Keine Migrations**
