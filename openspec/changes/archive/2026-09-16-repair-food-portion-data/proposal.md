## Why

Die Bestandsdaten enthalten Portionen, die als Stück benannt sind, aber an Gramm-Einheiten hängen oder durch fehlende Gewichte effektiv `1 g` bedeuten. Diese Fehler wirken sich auf viele bestehende Rezepte, Preise, Nährwerte und Einkaufslisten aus und werden durch neue Importlogik allein nicht repariert.

Die Reparatur soll KI-gestützt erfolgen, aber nur bei hoher Konfidenz automatisch. Referenzierte gemeinsame Portionen dürfen nicht global verändert werden; stattdessen entstehen korrigierte Portionen und gezielte Rezeptitem-Umstellungen.

## What Changes

- Ein auditierbarer Bestandsdaten-Scan identifiziert verdächtige Stück-/Gramm-Portionen, fehlende Gewichte, unplausible rank-1-Gewichte und fachlich widersprüchliche Einheitennamen.
- Gemini bewertet verdächtige Datensätze und liefert strukturierte Reparaturvorschläge inklusive Konfidenz, Begründung, vorgeschlagener Portion und Zielgewicht.
- Vorschläge mit hoher Konfidenz können automatisch angewendet werden; unsichere Vorschläge bleiben als Prüffälle erhalten.
- Referenzierte Portionen werden nicht in place verändert, wenn sich ihr Gewicht ändern würde.
- Für geteilte oder referenzierte Portionen werden neue korrigierte Portionen angelegt und betroffene `RecipeItem`s gezielt umgestellt.
- Rezept-, Nährwert-, Preis- und Einkaufslistencaches werden nach erfolgreicher Reparatur invalidiert oder neu berechnet.
- Jeder automatische Eingriff wird mit vorherigem Wert, neuem Wert, KI-Konfidenz und Ausführungszeit protokolliert.
- Ein Admin-/Data-Quality-Workflow zeigt automatische Ergebnisse und offene unsichere Fälle.
- Die Reparatur ist idempotent und darf bereits korrigierte Daten nicht erneut verschlechtern.

## Capabilities

### New Capabilities

- `food-portion-data-repair`: KI-gestützter Scan, Konfidenzbewertung, automatische Reparatur und Auditierung verdächtiger Portionsdaten.

### Modified Capabilities

- `portion-integrity-guardrails`: Reparaturen referenzierter Portionen erfolgen über neue Portionen und gezieltes Rebinding statt globaler Gewichtsänderung.
- `food-quality-integrity`: Portionsqualität und Reparaturstatus werden in Datenqualität und Berechnungskonsistenz berücksichtigt.

## Impact

- Backend-Apps `supply`, `recipe`, `planner`, `shopping` und `content`.
- Neue Management-Command-/Service-/Auditlogik, KI-Schemas, Admin-API und Food-Frontend-Data-Quality-Ansicht.
- Migrationen nur für Audit-/Repair-Metadaten; bestehende Portionen und RecipeItems werden ausschließlich über idempotente, getestete Reparaturprozesse verändert.
- Hohe Anforderungen an Dry-Run, Rollback-/Sicherheitsgrenzen und vollständige Regressionstests.
