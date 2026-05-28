## Context

Das food-frontend (`frontend-food/`) hat keinen Admin-Bereich. Stammdaten (RetailSection, NutritionalTag, HealthRule) werden aktuell nur über Django-Admin verwaltet. RecipeHints haben eine Admin-Seite im Haupt-Frontend, die ins food-frontend migriert werden soll.

Bestehende Backend-APIs bieten nur List-Endpunkte. RecipeHint ist die einzige Entität mit vollständigem CRUD (`recipe/api/hints.py`).

## Goals / Non-Goals

**Goals:**
- Einheitlicher Admin-Bereich im food-frontend unter `/admin`
- CRUD für RetailSection, NutritionalTag, HealthRule, RecipeHint
- Staff-only Zugriff (Auth-Guard)
- Konsistentes UI-Pattern: Tabelle + Dialog-Formular

**Non-Goals:**
- Generische/dynamische Admin-Engine (jeder Typ bekommt ein eigenes Formular)
- Tags/ScoutLevel/DgeReference (nicht im Scope)
- Rollen-/Berechtigungssystem (nur is_staff-Prüfung)

## Decisions

### 1. Route-Struktur

`/admin` als Top-Level-Route im food-frontend mit Tab-Navigation.

```
/admin              → Redirect zu /admin/retail-sections
/admin/:section     → retail-sections | nutritional-tags | recipe-hints | health-rules
```

**Warum:** Einfach, URL-driven, bookmarkbar. Kein verschachteltes Routing nötig.

### 2. Auth-Guard

Staff-Prüfung über bestehenden Auth-Store (Zustand). FoodLayout zeigt Admin-Link nur für Staff-User. Route ist durch eine `StaffGuard`-Komponente geschützt die auf `/login` redirected.

**Warum:** Konsistent mit Session-Auth-Architektur. Kein separater Admin-Auth nötig.

### 3. UI-Pattern: Tabelle + Dialog

Jeder Tab zeigt eine sortierbare Tabelle (shadcn DataTable). Aktionen: Erstellen (Button oben), Bearbeiten/Löschen (Row-Actions). Create/Edit öffnet einen shadcn `Dialog` mit individuellem Formular (React Hook Form + Zod).

**Warum Dialoge statt Inline-Edit:** HealthRule und RecipeHint haben 10+ Felder — Inline wäre zu eng. Konsistenz über alle Typen.

### 4. Backend-API-Erweiterung

Neue CRUD-Endpunkte (staff-only) folgen dem bestehenden Pattern aus `recipe/api/hints.py`:

| Endpunkt | Methode | Pfad |
|----------|---------|------|
| List RetailSections | GET | `/api/supply/retail-sections/` (existiert) |
| Create RetailSection | POST | `/api/supply/retail-sections/` |
| Update RetailSection | PATCH | `/api/supply/retail-sections/{id}/` |
| Delete RetailSection | DELETE | `/api/supply/retail-sections/{id}/` |
| List NutritionalTags | GET | `/api/supply/nutritional-tags/` (existiert) |
| Create NutritionalTag | POST | `/api/supply/nutritional-tags/` |
| Update NutritionalTag | PATCH | `/api/supply/nutritional-tags/{id}/` |
| Delete NutritionalTag | DELETE | `/api/supply/nutritional-tags/{id}/` |
| HealthRule CRUD | ALL | `/api/recipes/health-rules/` (neu) |

RecipeHint-Endpunkte existieren bereits vollständig unter `/api/recipes/hints/`.

### 5. Pydantic/Zod Schema-Strategie

- Backend: `RetailSectionIn`, `NutritionalTagIn`, `HealthRuleIn` (Create/Update-Schemas)
- Frontend: Korrespondierende Zod-Schemas in `frontend-food/src/schemas/`
- Out-Schemas für Responses nutzen bestehende oder erweitern sie um `id`

### 6. Keine Pagination für Stammdaten

Stammdaten-Listen sind klein (< 50 Einträge). Einfache List-Endpunkte ohne Pagination reichen. RecipeHints behalten ihre bestehende Pagination.

**Warum:** Unnötige Komplexität für Tabellen die nie > 50 Rows haben.

## Risks / Trade-offs

- **[Risk] Staff-Check nur client-seitig** → Backend-Endpunkte prüfen `is_staff` serverseitig. Frontend-Guard ist nur UX.
- **[Risk] Löschen von referenzierten Stammdaten** → Backend gibt 400/409 zurück wenn FK-Constraints verletzt. Frontend zeigt Fehlermeldung.
- **[Trade-off] Keine Pagination für Stammdaten** → Akzeptabel solange Datenmenge klein bleibt. Bei Wachstum nachträglich ergänzen.

## Open Questions

- Soll der Admin-Link in der Navigation nur für Staff sichtbar sein, oder soll die Route für alle sichtbar aber gesperrt sein? (Entscheidung: nur für Staff sichtbar)
