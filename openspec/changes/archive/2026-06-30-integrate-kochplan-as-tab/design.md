## Context

Der Kochplan und das Küchen-Dashboard sind aktuell als zwei separate Seiten auf eigenen Routen realisiert:

- `/meal-plans/:id/cooking-schedule` → `CookingSchedulePage` (Tabellen-Ansicht)
- `/meal-plans/:id/cooking-schedule/kitchen` → `CookingScheduleKitchenPage` (Timeline-Dashboard)
- `/meal-plans/:id/cooking-schedule/print` → `CookingSchedulePrintPage` (druckoptimiert)

Von der `MealPlanDetailPage` wird per externem Link (`<a href>`) auf die Kochplan-Seiten verwiesen — der Nutzer verlässt den Tab-Kontext. Backend-API (`GET /api/meal-plans/{id}/cooking-schedule/`) und alle Schemas bleiben unverändert.

## Goals / Non-Goals

**Goals:**
- Kochplan als Tab in `MealPlanDetailPage` nach dem Tab "Tabelle" einfügen
- Küchen-Dashboard (Timeline) als alleinige Ansicht im Tab rendern
- Drucken-Button im Tab-Kopf (öffnet Print-Seite in neuem Tab)
- Separate Routen `/cooking-schedule` und `/cooking-schedule/kitchen` entfernen
- ChefHat-"Kochplan"-Button im Header entfernen
- `CookingSchedulePage.tsx` löschen (wird nicht mehr benötigt)

**Non-Goals:**
- Keine Änderungen am Backend
- Keine Änderungen an Pydantic- oder Zod-Schemas
- Keine Änderungen an `CookingSchedulePrintPage`
- Keine Änderungen am Print-Routing oder Print-Layout
- Keine neuen Features jenseits der Tab-Integration

## Decisions

1. **Nur Timeline-Ansicht**: Statt beide Views (Tabelle + Timeline) zu integrieren, wird nur die Timeline-Ansicht (ex-`CookingScheduleKitchenPage`) in den Tab übernommen. Die Tabellen-Ansicht entfällt — sie war redundant zur Timeline, die mehr Kontext für die Küchenarbeit bietet.

2. **Neue Komponente `CookingScheduleTab`**: Statt `CookingScheduleKitchenPage` direkt zu importieren, wird sie umgebaut:
   - `BackButton` entfernt (keine Navigation nötig — Tab-Wechsel übernimmt der Tab-Controller)
   - Seiten-Header (`<h1>Küchen-Dashboard</h1>`) ersetzt durch einen kompakten Tab-Header mit:
     - Titel "Kochplan" + `ChefHat`-Icon
     - Plan-Name, Personenanzahl, Gesamtkosten
     - **Drucken-Button** → `target="_blank"` auf `/meal-plans/:id/cooking-schedule/print`
   - Warn-Banner für `excluded_meal_count` bleibt
   - Empty-State bleibt
   - Daten-Fetching (`useMealPlan`, `useCookingSchedule`) bleibt

3. **Tab-Eintrag in `MealEventDetailPage`**:
   - Neuer Tab `cooking-schedule` direkt nach `table` in der `TAB_KEYS`-Liste
   - Icon: `ChefHat`
   - Label: "Kochplan"
   - Content: `<CookingScheduleTab mealPlanId={mealPlanId} />`

4. **Keine Sub-Routen im Tab**: Der Tab-Zustand ist URL-basiert (`/meal-plans/:id/cooking-schedule`). Es gibt keine Unter-Ansichten, daher kein zusätzliches Routing nötig. Die alte Route `/meal-plans/:id/cooking-schedule` wird durch den Tab belegt — konkret: das Wildcard-Pattern `:id/*` matched `cooking-schedule` und zeigt den Tab-Inhalt.

5. **Drucken in neuem Tab**: Die bestehende Print-Route `/meal-plans/:id/cooking-schedule/print` bleibt erhalten. Der Drucken-Button im Tab öffnet diese Route via `target="_blank"`, genau wie der bisherige Button auf `CookingSchedulePage`.

## Component Tree (neu)

```
MealPlanDetailPage
  ├── Header (ohne ChefHat-Button)
  ├── Tab-Bar
  │   ├── Tagesplan
  │   ├── Tabelle
  │   ├── Kochplan ← NEU
  │   ├── Nährwerte
  │   ├── Kosten
  │   ├── Einkaufsliste
  │   ├── Vorschläge
  │   └── Zutaten-Radar
  └── Tab-Content
      └── activeTab === 'cooking-schedule'
          └── CookingScheduleTab (ex-CookingScheduleKitchenPage)
              ├── Tab-Header: Titel, Metadaten, [🖨️ Drucken]
              ├── Warn-Banner (excluded_meal_count)
              ├── Empty-State
              └── DayTimeline[]
                  ├── Day-Header (sticky)
                  └── TimelineItem[]
```

## Risks / Trade-offs

- **Kein BackButton in der Timeline**: Im Tab-Kontext entfällt der Zurück-Button. Nutzer, die über externe Lesezeichen auf `/meal-plans/:id/cooking-schedule` kommen, landen jetzt im Tab-Universum der Detailseite — das ist konsistenter.
- **`CookingSchedulePage`-Tabellenansicht entfällt**: Nutzer, die die tabellarische Übersicht bevorzugt haben, verlieren diese Perspektive. Die Timeline bietet jedoch mehr Detailtiefe (Zutaten, Schritte, Allergene) und ist für die Küchenarbeit besser geeignet.
- **Route-Konflikt ausgeschlossen**: Da das Wildcard-Pattern `meal-plans/:id/*` bereits existiert und `cooking-schedule` als Tab-Pfad matchen wird, muss nur die separate `CookingSchedulePage`-Route aus `App.tsx` entfernt werden, damit kein Konflikt entsteht.
