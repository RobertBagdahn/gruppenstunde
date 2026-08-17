## Why

Die Content-Kacheln zeigen aktuell nur 3 Kacheln nebeneinander (auf Desktop) und enthalten zu wenig Informationen. Tags, Metadaten und Zusammenfassungen fehlen weitgehend, sodass User den Inhalt nicht einschätzen können, ohne die Detailseite zu öffnen. Außerdem steht der Autor-Bereich prominent oben auf Detailseiten, obwohl er für die meisten User sekundäre Information ist.

## What Changes

### Kachel-Layout
- **5 Kacheln nebeneinander** auf Desktop (statt 3), responsive Abstufung für Tablet und Mobile
- **Mehr Inhalte pro Kachel** je nach Content-Typ: mehr Tags anzeigen, Metadaten (Dauer, Schwierigkeit, Kosten) prominent darstellen, kurze Zusammenfassung (summary) sichtbar machen

### Kachel-Inhalte je Content-Typ
- **Rezept**: Nutri-Score Badge, Rezepttyp, Zubereitungszeit, Schwierigkeit, Kosten-Rating, bis zu 5 Tags
- **Gruppenstunde** (GroupSession): Dauer, Schwierigkeit, Altersgruppe (Scout Levels), bis zu 5 Tags
- **Spiel** (Game): Spieleranzahl, Dauer, Schwierigkeit, bis zu 5 Tags
- **Blog**: Lesezeit (berechnet aus Textlänge), bis zu 5 Tags, summary

### Autor-Positionierung
- **Autor nach unten verschieben** auf allen Content-Detailseiten — unter die Beschreibung, vor die Kommentare

## Capabilities

### New Capabilities
_(keine — rein UI-Änderungen an bestehenden Komponenten)_

### Modified Capabilities
- `content-base`: Layout und Inhaltsdichte der Content-Kacheln ändern, Autor-Position auf Detailseiten
- `recipe`: RecipeCard erhält mehr angezeigte Metadaten und Tags
- `group-session`: SessionCard erhält mehr Metadaten
- `game-content`: GameCard erhält mehr Metadaten
- `blog-content`: BlogCard erhält Lesezeit und Summary

## Impact

### Frontend (React)
- **Content-Card-Komponenten**: `RecipeCard.tsx`, `SessionCard.tsx` (oder äquivalent), `GameCard.tsx`, `BlogCard.tsx` — alle müssen mehr Daten anzeigen
- **Grid-Layout**: CSS-Grid-Konfiguration ändern von 3 auf 5 Spalten (`grid-cols-5` auf xl, responsive Abstufung)
- **Detailseiten**: `RecipeDetailPage.tsx`, `SessionDetailPage.tsx`, `GameDetailPage.tsx`, `BlogDetailPage.tsx` — Autor-Bereich nach unten verschieben
- **Keine Schema-Änderungen**: Alle benötigten Daten sind bereits in den List-Schemas vorhanden (tags, summary, difficulty, execution_time etc.)
- **Keine API-Änderungen**: Rein Frontend
- **Keine Migrationen**: Kein Backend-Eingriff nötig
