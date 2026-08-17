## Context

Die SearchPage, EntityLink/EntityType und CommandPalette sind die zentralen Navigationseinstiege der Plattform. Aktuell sind drei Bugs vorhanden: (1) SearchPage verweist auf `EntityLink`, `EntityLinkContext` und `EntityType` ohne Import (Compile-Error), (2) `EntityType` in `entityUrls.ts` enthält kein `'recipe'`, obwohl Suchergebnisse für Rezepte zurückkommen (Runtime-Throw), und (3) die CommandPalette navigiert auf falsche Routen (`/sessions/new` statt `/create/session`, `/planner` statt `/session-planner/app`).

## Goals / Non-Goals

**Goals:**
- SearchPage kompiliert und zeigt Rezept-Suchergebnisse korrekt verlinkt an
- CommandPalette navigiert auf existierende Routen
- EntityType deckt alle Content-Typen ab, die in Suchergebnissen auftauchen

**Non-Goals:**
- Keine neuen Features (z.B. keine neue EntityLink-Integration an Stellen, die aktuell nicht EntityLink nutzen)
- Keine Veränderung der Such-API oder des Backend-Suchindex
- Recipe-Detail-Seite im Haupt-Frontend (Rezept-Links gehen zum Food-Frontend)

## Decisions

### 1. EntityType um `recipe` erweitern

**Entscheidung**: `EntityType` in `entityUrls.ts` um `'recipe'` erweitern. Route: `/recipes/:slug`.

**Begründung**: Die Such-API liefert `result_type: "recipe"` zurück. Der `default`-Case in `getEntityUrl` ist typed als `never` und wirft im Dev-Modus. `recipe` muss in der EntityType-Union sein.

**Alternative**: Recipe-Ergebnisse nur im Food-Frontend anzeigen und aus dem Haupt-Frontend-Suchindex entfernen. Abgelehnt, weil die Such-API unitary ist und Recipe als Content-Typ im Index verbleiben soll — Nutzer erwarten, Rezepte in der globalen Suche zu finden.

### 2. Recipe-Linkziel

**Entscheidung**: Recipe-Links zeigen auf `/recipes/:slug`. Da das Haupt-Frontend keine Recipe-Detail-Route hat, wird Recipe als EntityLink-Sonderfall behandelt: Klick öffnet `/recipes/:slug`, was im Haupt-Frontend eine 404 ergibt. Dies ist akzeptabel, weil Recipe-Detail-Seiten im Food-Frontend leben.

**Alternative**: Recipe-Links auf `https://food.gruppenstunde.de/recipes/:slug` weiterleiten. Kommt als Folge-Change, wenn Domain-Redirects stehen. Für diesen Bugfix: Recipe im EntityType aufnehmen, Link-Ziel korrekt auflösen.

### 3. CommandPalette-Routen korrigieren

**Entscheidung**: Route-Mapping auf die in `App.tsx` definierten Pfade anpassen. Keine neue Wildcard-Route einführen.

### 4. SearchPage-Imports

**Entscheidung**: Fehlende Imports hinzufügen. Kein Refactoring des SearchPage-Components über das Minimum hinaus.

## Risks / Trade-offs

- **Recipe-Links im Haupt-Frontend führen zu 404**, solange keine Recipe-Detail-Route existiert → Akzeptabel als Zwischenzustand, da Recipe ein Food-Feature ist. Folge-Change: Cross-Domain-Linking.
- **EntityType-Erweiterung erfordert Test-Update** → `entityUrls.test.ts` hat irreführende Testnamen, die beim Refactoring korrigiert werden müssen.

## Migration Plan

Keine Migration nötig. Reiner Frontend-Fix. Deployment über normalen Build-Prozess.
