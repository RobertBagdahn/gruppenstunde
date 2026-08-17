## Context

Der "Neuen Essensplan erstellen"-Dialog in `frontend-food/src/pages/planning/MealEventListPage.tsx` hat aktuell ein separates Duplikat-Dialog-Fenster. Der Create-Dialog hat keine Default-Daten, der Duplikat-Dialog erfordert manuelle Eingabe aller Felder. Der Backend-Stack ist vollständig: `POST /api/meal-plans/` erstellt leere Pläne (mit optionaler Default-Meal-Generierung), `POST /api/meal-plans/{id}/duplicate/` kopiert tief.

## Goals / Non-Goals

**Goals:**
- Ein einziger Dialog für "Neu erstellen" und "Aus Vorlage kopieren"
- Default-Werte für alle Formularfelder
- Datum default: nächstes Wochenende (Freitag–Sonntag), Smart-Computing (diesen Fr bei Mo–Mi, nächsten Fr bei Do–So)
- Bei Auswahl einer Quelle: Enddatum aus Quell-Dauer berechnen, Portionen übernehmen, " (Kopie)"-Suffix an den Namen hängen
- "Als Vorlage verwenden"-Dropdown öffnet den Create-Dialog mit vorausgewählter Quelle
- Keine Backend-Änderungen

**Non-Goals:**
- Keine neue Route (bleibt Dialog-basiert, kein `/meal-plans/new`)
- Keine Änderung am Duplikat-API-Endpunkt
- Keine Änderung an MealPlan-Meal-Generierungslogik

## Decisions

### 1. Zwei Endpunkte statt einem (Frontend-Routing)
**Entscheidung:** Frontend ruft je nach Checkbox-Zustand entweder `POST /api/meal-plans/` oder `POST /api/meal-plans/{id}/duplicate/` auf.

**Alternativen:**
- **Single Endpoint**: `source_plan_id` in `MealPlanCreateIn` aufnehmen → backend unified logic. Dagegen: kein erkennbarer Vorteil, mehr Backend-Code, breaking change am Schema.

### 2. Dialog statt separater Page
**Entscheidung:** Der Create-Dialog bleibt ein Dialog auf der Listenseite (`MealEventListPage.tsx`). Wird nicht in eine eigene Route extrahiert.

**Begründung:** Der Dialog ist einfach genug, eine eigene Route (`/meal-plans/new`) würde zusätzliche Navigation und Ladezustände erfordern. Der aktuelle Dialog-basierte Flow ist etabliert.

### 3. Neue Utility `getNextWeekend()`
**Entscheidung:** Eine reine Funktion `getNextWeekend()` in `frontend-food/src/lib/date.ts` (oder neue `dateUtils.ts`), die `{ friday: string, sunday: string }` im `datetime-local`-kompatiblen Format (`YYYY-MM-DDTHH:MM`) zurückgibt.

**Logik:**
- Mo–Mi: dieser Freitag
- Do–So: nächster Freitag
- Startzeit: 18:00, Endzeit: 14:00

### 4. Vorlage-Badge statt Name-Overwrite
**Entscheidung:** Bei Auswahl einer Quelle wird das Namensfeld nicht überschrieben. Stattdessen erscheint ein Badge: `Vorlage: <name> (<meals_count> Mahlzeiten)`. Der gesendete Name wird mit " (Kopie)"-Suffix versehen, wenn eine Quelle ausgewählt ist.

### 5. Pre-fill nur bei Quell-Auswahl
**Entscheidung:** Bei Auswahl einer Quelle werden `norm_portions` und `end_datetime` basierend auf der Quelle vorbefüllt. `start_datetime` bleibt beim Default (nächstes Wochenende). Der Nutzer kann alle Felder manuell überschreiben.

## Risks / Trade-offs

- **[UX-Risiko]** Checkbox "Von Plan kopieren" könnte übersehen werden → **Mitigation**: Das Dropdown-Menü "Als Vorlage verwenden" öffnet den Dialog mit bereits aktivierter Checkbox und vorausgewählter Quelle
- **[Daten-Risiko]** Quellplan könnte zwischenzeitlich gelöscht werden → **Mitigation**: `duplicate`-Endpoint gibt 404, wird im Error-Handling gezeigt
- **[Datum-Risiko]** `getNextWeekend()` könnte Browser-Zeitzonenunterschiede haben → **Mitigation:** Loses `datetime-local` (keine Zeitzonen), der Backend macht `timezone.make_aware()`
