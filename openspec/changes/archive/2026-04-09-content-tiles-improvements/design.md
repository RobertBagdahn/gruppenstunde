## Context

Die Content-Listenansichten verwenden ein CSS-Grid mit aktuell 3 Spalten auf Desktop. Jede Content-Card-Komponente (RecipeCard, etc.) zeigt Bild, Titel, wenige Tags und Basis-Metadaten. Die Schemas liefern bereits deutlich mehr Daten (summary, alle Tags, difficulty, execution_time, costs_rating etc.), die im Frontend nicht genutzt werden.

Der Autor-Bereich steht auf Detailseiten im oberen Info-Block — neben Scout Levels und Servings. Das verdrängt wichtigere Informationen.

## Goals / Non-Goals

**Goals:**
- Mehr Kacheln pro Zeile auf Desktop (5 statt 3) für bessere Übersichtlichkeit
- Kacheln zeigen genug Informationen, um ohne Klick eine Einschätzung zu ermöglichen
- Content-Type-spezifische Metadaten sind prominent sichtbar
- Autor steht auf allen Detailseiten konsistent unten

**Non-Goals:**
- Keine neuen API-Felder oder Backend-Änderungen
- Keine neuen Ansichtsmodi (nur Grid verbessern, nicht List-View hinzufügen)
- Keine Änderungen an der Filter-Sidebar

## Decisions

### 1. Responsive Grid-Breakpoints

**Entscheidung:** `grid-cols-1` (Mobile <640px), `sm:grid-cols-2` (640px+), `md:grid-cols-3` (768px+), `lg:grid-cols-4` (1024px+), `xl:grid-cols-5` (1280px+).

**Begründung:** 5 Spalten auf Desktop nutzen den Platz optimal. Kleinere Kacheln erfordern aber kompaktere Darstellung der Metadaten.

**Alternative:** 4 Spalten als Maximum — abgelehnt, weil der User explizit 5 wünscht.

### 2. Content-Type-spezifische Card-Varianten

**Entscheidung:** Jede Card-Komponente erhält eine eigene Metadaten-Zeile, die zum Content-Typ passt. Gemeinsame Basis: Bild, Titel, Tags. Typ-spezifisch: individuelle Meta-Icons.

**Begründung:** Rezepte haben andere relevante Metadaten als Spiele. Eine generische Card würde entweder zu wenig oder irrelevante Daten zeigen.

### 3. Kompakte Card-Darstellung bei 5 Spalten

**Entscheidung:** Bei 5 Spalten wird die Card kompakter: Titel einzeilig (truncate), Tags als kleine Chips (max 3 sichtbar, „+N" für Rest), Metadaten als Icons mit Kurztext.

**Begründung:** Bei 5 Spalten ist jede Card ca. 220px breit. Text muss kompakt sein, Icons sparen Platz.

## Risks / Trade-offs

**[Kleine Kacheln auf 1280px-Screens]** → Cards könnten bei 5 Spalten auf knapp 1280px-Screens zu eng wirken. Mitigation: `xl:grid-cols-5` erst ab 1280px, darunter 4 Spalten.

**[Mehr DOM-Elemente pro Card]** → Leicht höherer Render-Aufwand durch mehr Tags und Metadaten. Bei 20 Cards pro Seite vernachlässigbar.
