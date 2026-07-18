## Context

Derzeit verwenden `RecipeCard` und `RecipeTableRow` die Tailwind-Klasse `truncate` für Rezepttitel. Das erzeugt `overflow: hidden; text-overflow: ellipsis; white-space: nowrap` – Titel werden auf eine Zeile gezwungen und abgeschnitten. Bei ~190px Kachelbreite in der 5-Spalten-Grid-Ansicht passen nur ~14 Zeichen pro Zeile, was ~75 % der Titel betrifft.

Die `summary`-Darstellung in denselben Komponenten verwendet bereits `line-clamp-2` – ein etabliertes Pattern im Food Frontend. Titel sollen auf dieselbe Weise behandelt werden.

## Goals / Non-Goals

**Goals:**
- Rezepttitel in Kachel- und Tabellenansicht auf bis zu 2 Zeilen anzeigen
- Konsistentes Verhalten zwischen `RecipeCard` und `RecipeTableRow`

**Non-Goals:**
- Keine Änderung an `RecipeSearchCard` (Such-Dropdown behält `truncate`)
- Keine Änderung an MealPlan-, Suggestion- oder anderen Komponenten
- Kein Tooltip, kein `title`-Attribut, keine zusätzliche UI
- Keine Backend-, Schema- oder API-Änderungen

## Decisions

### Entscheidung: `line-clamp-2` statt anderer Ansätze

| Ansatz | Pro | Contra |
|--------|-----|--------|
| `line-clamp-2` (gewählt) | Deckt 87 % aller Titel ab; konsistent mit `summary`-Pattern; minimaler Eingriff | Sehr lange Titel (>~28 Zeichen) werden weiterhin abgeschnitten |
| `line-clamp-3` | Deckt ~97 % ab | Karten werden spürbar höher |
| `break-words` ohne Clamp | Kein Informationsverlust | Extrem hohe Karten, ungleichmäßiges Grid |
| Tooltip bei Hover | Voller Titel immer sichtbar | Schlecht auf Mobile; unnötige Komplexität |

**Begründung:** `line-clamp-2` ist der minimale Eingriff mit maximaler Wirkung. Das Pattern wird bereits für `summary` verwendet und ist im gesamten Tailwind-Ökosystem Standard für mehrzeilige Textbeschneidung.

### Entscheidung: Kein `min-h-[2lh]` oder feste Titel-Höhe

Die Karten im Grid haben bereits variable Höhen durch optionale `summary`, Tags und Meta-Info. CSS Grid mit `align-items: stretch` gleicht Zeilen aus. Ein `min-height` auf dem Titel würde nur unnötig Platz verschwenden, wenn der Titel kurz ist.

### Entscheidung: Keine responsive Staffelung (`line-clamp-3 sm:line-clamp-2`)

Auf Mobile (1-Spalte) wäre mehr Platz für Titel, aber die zusätzliche Komplexität rechtfertigt den marginalen Gewinn nicht – 87 % Abdeckung ist ausreichend.

## Risks / Trade-offs

- **[Lange Titel weiterhin abgeschnitten]**: ~13 % der Titel (>28 Zeichen) erhalten weiterhin "…" auf Zeile 2. Bei 255 Zeichen Max-Length ist das akzeptabel – extrem lange Titel sind selten.
- **[Tabellenzeilen werden höher]**: `RecipeTableRow` mit `line-clamp-2` kann doppelt so hoch werden. Da es sich um ein Card-basiertes Tabellen-Pattern handelt (jede Zeile ist eine eigenständige Karte), ist das unkritisch.
- **[Kein Regressionstest nötig]**: Reine CSS-Änderung ohne Logik-Impact.
