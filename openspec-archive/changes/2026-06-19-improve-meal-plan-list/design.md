## Context

Die aktuelle Essensplan-Liste (`/meal-plans/app`) zeigt alle Pläne als gleichförmige Karten ohne Priorisierung. Ein Gruppenführer mit vielen Plänen kann nicht schnell erkennen, welcher Plan Aufmerksamkeit braucht. Die Änderung führt ein viergeteiltes Sektionslayout mit priorisierten Hero-Karten für die dringendsten Pläne ein.

Die Seite befindet sich in `frontend-food/src/pages/planning/MealEventListPage.tsx` (618 Zeilen). Die API wird über `useMealPlans` aus `frontend-food/src/api/mealPlans.ts` angesprochen. Das Backend-Listing liegt in `backend/planner/api/meal_plan.py` → `list_meal_plans`.

## Goals / Non-Goals

**Goals:**
- Vier Sektionen mit klarer visueller Hierarchie (Top-5 → Weitere → Referenzpläne → Vergangene)
- Hero-Cards für Top-5 mit Ampel, Fortschrittsbalken, Countdown, Quick-Actions
- Compact-Cards für sekundäre Sektionen
- Ampel-Filter-Chips und Zeitraum-Filter-Chips
- Backend liefert `filled_meals_count` via Query-Annotation (kein neues DB-Feld)

**Non-Goals:**
- Keine Allergen- oder Shopping-Status in der Ampel (nur Coverage-basiert, Erweiterung später)
- Keine Persistierung des Sektions-Zustands (collapse/expand) in localStorage
- Keine Drag-and-Drop-Reorder
- Keine Änderung an der Detail-Seite (`/meal-plans/:id`)
- Kein neues `is_template` Feld am MealPlan-Model

## Decisions

### Decision 1: Coverage-basierte Ampel ohne Backend-Caching
**Gewählt**: Annotation `filled_meals_count` im List-Query via `Count('meals', filter=Q(meals__items__isnull=False), distinct=True)`.

**Alternativen verworfen:**
- *Cached JSONField*: Wäre robuster für Allergen/Shopping-Status in Zukunft, aber Overkill für MVP. Kann später ergänzt werden.
- *Separater Batch-Endpoint*: Zusätzliche HTTP-Requests, komplexeres Caching.
- *Client-seitige parallele Detail-Abrufe*: N+1-Problem, langsam bei vielen Plänen.

**Rationale**: Die Annotation ist eine einfache SQL-Erweiterung (LEFT JOIN + COUNT DISTINCT), die ohne Schema-Migration auskommt und `filled_meals_count` in derselben Query liefert wie alle anderen Felder.

### Decision 2: Client-seitige Sektionsaufteilung aus einem API-Call
**Gewählt**: Alle Pläne über `useMealPlans({sort: 'date_oldest'})` laden und client-seitig in vier Sektionen aufteilen.

**Alternativen verworfen:**
- *Getrennte API-Calls pro Sektion*: Würde Backend-Filter für "upcoming", "templates", "past" benötigen. Mehr Requests, mehr Ladezeit.
- *Neuer Aggregations-Endpoint*: Over-Engineering für einen MVP.

**Rationale**: Die Gesamtzahl der Pläne pro User ist typischerweise < 50. Client-seitiges Filtern/Sortieren ist bei dieser Größenordnung performant. Der einzige API-Call cached über TanStack Query.

**Aufteilung-Logik**:
```
allPlans = useMealPlans({sort: 'date_oldest'}).data

now = new Date()

upcomingPlans = allPlans
  .filter(p => !p.end_datetime || p.end_datetime >= now)
  .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime))

referencePlans = allPlans
  .filter(p => p.owner_id === null && p.status === 'verified')
  // Referenztemplate-Pläne ohne Datum oder mit beliebigem Datum

pastPlans = allPlans
  .filter(p => p.end_datetime && p.end_datetime < now)
  .sort((a, b) => new Date(b.end_datetime) - new Date(a.end_datetime))
```

### Decision 3: Kein separates `is_template`-Feld
**Gewählt**: Referenzpläne = Pläne mit `owner_id === null` UND `status === 'verified'`.

**Alternativen verworfen:**
- *Neues BooleanField is_template*: Würde Migration, Schema-Änderung, UI zum Markieren benötigen.
- *Pläne ohne Event-Bindung*: Zu unscharf, viele User-Pläne haben kein Event.

**Rationale**: Die Kombination `owner_id === null` + `status === 'verified'` identifiziert bereits jetzt die Inspi-Community-Vorlagen. Dies ist semantisch korrekt und erfordert keine DB-Änderung.

### Decision 4: Ampel-Filter und Zeitraum-Filter als Client-State
**Gewählt**: Filter-Chips als React-State (`useState`) ohne URL-Parameter.

**Rationale**: Die Sektionsaufteilung ist bereits client-seitig. Die Filter reduzieren nur die angezeigten Pläne innerhalb der Sektionen. Eine URL-Synchronisation wäre Overhead ohne klaren Nutzen (kein Deep-Linking nötig für temporäre List-Filter).

### Decision 5: Hero-Card vs Compact-Card als zwei Komponenten
**Gewählt**: Zwei separate Komponenten `MealPlanHeroCard` und `MealPlanCompactCard`.

**Alternativen verworfen:**
- *Eine Komponente mit variant prop*: Würde zu komplexen Conditional-Rendering-Blöcken führen.

**Rationale**: Die Karten unterscheiden sich stark in Layout, Informationsdichte und Interaktionsmöglichkeiten. Separate Komponenten sind klarer und leichter zu warten.

## Component Tree

```
MealPlanListPage
├── ListPageHero (unverändert)
├── ListPageSearchBar (unverändert)
├── FilterChips (NEU)
│   ├── AmpelChip (Alle | 🟢 | 🟡 | 🔴)
│   └── TimeRangeChip (Diese Woche | Nächste Woche | Nächster Monat)
├── MealPlanSection "Top 5" (immer offen)
│   └── MealPlanHeroCard[] (1-spaltig, volle Breite)
├── MealPlanSection "Weitere Pläne" (collapsed)
│   └── MealPlanCompactCard[] (2-3-spaltig)
├── MealPlanSection "Referenzpläne" (collapsed)
│   └── MealPlanCompactCard[] (2-3-spaltig)
├── MealPlanSection "Vergangene Pläne" (collapsed)
│   └── MealPlanCompactCard[] (2-3-spaltig)
└── CreateDialog (unverändert)
```

## Data Flow

```
┌──────────────┐     GET /api/meal-plans/     ┌────────────────────┐
│ useMealPlans │──────────────────────────────▶│ list_meal_plans()  │
│ (TanStack)   │◀──────────────────────────────│ + annotate(        │
└──────┬───────┘   MealPlanOut[] (mit          │   filled_meals_)   │
       │           filled_meals_count)         └────────────────────┘
       │
       ▼
┌──────────────┐
│ Client-Split │
│ + Sort       │
└──────┬───────┘
       │
  ┌────┼────────┬──────────┐
  ▼    ▼        ▼          ▼
Top5  Weitere  Referenz  Vergangen
```

## Risks / Trade-offs

- **[Risk] Annotation COUNT mit DISTINCT auf Join über zwei Relationen könnte falsche Werte liefern** → Mit Testdaten verifizieren. Falls Probleme: Subquery mit `Exists` oder `Case(When(...))` verwenden.
- **[Risk] Kein dediziertes `is_template`-Feld** → Community-Pläne könnten auch echte Events mit Daten sein und erscheinen dann in zwei Sektionen (Referenz + Upcoming). → Akzeptiert: Ein Plan kann sowohl Referenz als auch aktiv sein. Die Sektionen sind Informations-Gruppierungen, keine disjunkten Mengen.
- **[Trade-off] Client-seitige Filterung** → Bei sehr vielen Plänen (> 200) könnte das Filtern spürbar werden. → Aktuell unrealistisch für Einzel-User. Paginierung kann später ergänzt werden.
- **[Trade-off] Ampel nur Coverage-basiert** → Ein Plan mit 100% Coverage könnte trotzdem Budget-Probleme oder Allergen-Verstöße haben und fälschlich grün sein. → Akzeptiert für MVP. Erweiterung auf Multi-Faktor-Ampel in Folgeänderung.
