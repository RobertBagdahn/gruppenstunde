## Context

Die aktuelle Food-Architektur berechnet Rezeptmengen an mehreren Stellen separat: Rezept-Caches, MealPlan-Serialisierung, Kostenübersicht, Einkaufslisten-Service und Kochplan-Service. Diese Pfade behandeln Overrides, effektive Portionen, Soft-Deletes und externe Mahlzeiten nicht identisch. Zusätzlich werden Wizard-Zustände asynchron aus API-Daten aufgebaut, aber teilweise nur beim ersten React-Render übernommen.

Der laufende Change `food-permission-hardening` führt parallel zentrale Zugriffs- und Soft-Delete-Grundlagen ein. Dieser Change setzt darauf auf, korrigiert aber nur fachliche Berechnung und Datenfluss. Berechtigungsarchitektur, Event-/MealPlan-Relation und Audit bleiben außerhalb des Scopes, außer wenn ein bestehender Endpoint für den korrekten Datenfluss angepasst werden muss.

## Goals / Non-Goals

**Goals:**

- Eine kanonische Berechnungskette für aktive RecipeItems und MealItems definieren.
- Dieselben aktiven Items, Overrides, Portionen und Faktoren in Einkaufsliste, Kosten, Nährwerten und Kochplan verwenden.
- Referenzierte Portionen beim Import unverändert lassen und vollständige Portion-Schlüssel berücksichtigen.
- Externe Mahlzeiten, effektive Portionen und Reservefaktoren korrekt aggregieren.
- Bestehende Wizard-Daten nach asynchronem Laden rehydrieren und gespeicherte Payloads validieren.
- Pydantic- und Zod-Schemas sowie API-Regressionstests synchron halten.

**Non-Goals:**

- Keine neue Berechtigungs- oder Rollenarchitektur.
- Keine Änderung der fachlichen DGE-Normwerte oder Rezept-Nährwertdefinitionen.
- Keine neue KI-Technologie und keine Änderung des Prompt-Designs.
- Keine Reparatur nicht-foodbezogener OpenSpec- oder Testfehler.

## Decisions

### 1. Ein gemeinsamer aktiver Item-Kontext

Ein wiederverwendbarer Backend-Service im `planner` beziehungsweise `supply` löst für jedes MealItem die aktiven RecipeItems auf. Er filtert nicht verfügbare beziehungsweise soft-gelöschte Portionen, wendet `active_recipe_item_ids`, `excluded` und `quantity_override` an und liefert eine normalisierte Zwischenstruktur mit Rohmenge, Gewicht, Faktor und effektiven Portionen.

Kosten, Einkaufslisten, Nährwerte und Kochplan verwenden diesen Kontext statt eigener Variantenlogik. Eine parallele Berechnung pro Ausgabepfad wird nicht erweitert, weil sie die aktuelle Inkonsistenz fortschreiben würde.

### 2. Präzise Portion-Identität und Immutabilität

Portionen werden beim Import nach `(ingredient, name, measuring_unit, quantity)` aufgelöst. Ein abweichendes Gewicht erzeugt eine neue aktive Portion, wenn die alte Portion referenziert wird; bestehende Rezeptreferenzen werden niemals durch einen Import rückwirkend verändert. Die Datenbankintegritätsregeln bleiben die letzte Schutzschicht.

### 3. Effektive Portionen als einzige Aggregationsbasis

Jede Meal-Berechnung erhält genau eine effektive Portionszahl. Pro-Person-Werte teilen durch diese Zahl, Gesamtwerte multiplizieren mit ihr. `override_portions`, Tagesfaktoren und Reserve werden vor der Aggregation aufgelöst und nicht in einzelnen Ausgabepfaden erneut angewendet.

### 4. Externe Mahlzeiten als eigene Kostenquelle

Externe Mahlzeiten werden nicht künstlich in RecipeItems umgewandelt. Die Kostenübersicht aggregiert `external_cost_per_person × effective_portions` direkt und kennzeichnet diese Position im Response. Nährwerte verwenden weiterhin nur explizit vorhandene externe Nährwertfelder.

### 5. Wizard-Rehydration über explizite Identität

Wizard-Hooks übernehmen keinen dynamischen Initialwert mehr ausschließlich über `useState(initialValue)`. Nach Abschluss der notwendigen Queries wird der Zustand einmal anhand von `planId`, `saveMode` und einem stabilen Datenfingerabdruck rehydriert. LocalStorage-Einträge werden mit Benutzer-/Plan-Kontext gespeichert und vor Verwendung mit Zod validiert.

### 6. Vertragsänderungen zuerst im Backend, dann im Food-Frontend

Pydantic-Out-/In-Schemas werden zuerst festgelegt und getestet. Danach werden die entsprechenden Zod-Schemas, Hooks und UI-Flows angepasst. Felder werden nicht mit `z.any()` oder stillen Defaults kaschiert. Neue oder geänderte Model-Felder erhalten additive Django-Migrationen.

## Risks / Trade-offs

- **[Risiko]** Die gemeinsame Berechnung kann Rundungswerte gegenüber bisherigen Einzelpfaden ändern. → Rohwerte erst am Ausgabeformat runden und Golden-Value-Tests für Gramm, Kosten und Nährwerte ergänzen.
- **[Risiko]** Alte Portionen sind möglicherweise bereits durch fehlerhafte Importe dupliziert. → Keine automatische Datenlöschung im Request; ein separater Prüf-/Reparatur-Command erstellt einen Bericht und bleibt explizit ausführbar.
- **[Risiko]** Strikte Wizard-Zod-Validierung verwirft alte LocalStorage-Payloads. → Versionsmigration für bekannte Zustände, ansonsten kontrolliertes Leeren mit deutscher Hinweismeldung.
- **[Risiko]** Der laufende Permission-Change verändert Models und Router gleichzeitig. → Vor Implementierung Migrationen synchronisieren und die Food-Testgruppen auf einem konsistenten Branch ausführen.
- **[Risiko]** Gemeinsames Prefetching kann große MealPlans speicherintensiver machen. → Querysets begrenzen, benötigte Felder selektieren und Query-/Performance-Tests ergänzen.

## Migration Plan

1. Bestehende Migrationen und den offenen Permission-Change auf einen konsistenten Model-/Router-Stand bringen.
2. Neue Services und Pydantic-Schemas hinter den bestehenden Endpoints mit Regressionstests einführen.
3. Falls erforderlich additive Migrationen für Wizard-Version/Kontext oder fehlende Persistenzfelder erstellen.
4. Rezeptimport, Einkaufsliste, Kosten, Nährwerte und Kochplan auf den gemeinsamen Berechnungskontext umstellen.
5. Food-Frontend-Zod-Schemas, Hooks und Wizard-Rehydration synchron aktualisieren.
6. Backend- und Frontend-Tests inklusive API-Contract-Tests und mobilen Smoke-Tests ausführen.
7. Rollback: Anwendung auf die vorherige Version zurücksetzen. Additive Felder bleiben ungenutzt; keine bestehende Migration wird editiert.

## Open Questions

- Soll die gemeinsame Zwischenstruktur in `planner/services` oder als appübergreifender Service in `content/services` liegen?
- Sollen inkonsistente historische Portionen nur gemeldet oder zusätzlich über einen separaten Management-Command repariert werden?
- Welche externen Nährwertfelder sind fachlich verbindlich, falls eine externe Mahlzeit nur Kosten, aber keine Energie liefert?
