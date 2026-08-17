## Context

Der Review hat gezeigt, dass Food-Zugriffe über mehrere Django-Ninja-Router verteilt sind. Einige Endpoints verwenden zentrale Visibility-Helfer, andere laden Recipes, Ingredients oder MealPlans direkt per ID. Das Frontend erhält Permission-Felder nicht überall und kann dadurch Controls nicht zuverlässig ausblenden. Zusätzlich bestehen zwei Datenmodellrisiken: gelöschte Inhalte werden noch referenziert und Event/MealPlan kann über zwei Foreign Keys widersprüchlich verknüpft sein.

Der Change betrifft `recipe`, `supply`, `planner`, `event`, `content` und `profiles` sowie `frontend-food`. Die Änderung ist absichtlich auf Zugriffsschutz, Verträge, Audit und Datenintegrität begrenzt; die fachliche Korrektur der Nährwert-/Austauschberechnung bleibt ein separater Change.

## Goals / Non-Goals

**Goals:**

- Eine zentrale, testbare Policy für Recipe-, Ingredient-, Portion-, Package-, MealPlan- und Event-Zugriffe bereitstellen.
- Owner, Collaborator, Gruppenmitglied, Gruppenadmin und Staff-Regeln eindeutig abbilden.
- Öffentliche Kataloge und Suchresultate vor privaten Daten schützen.
- Alle betroffenen Responses mit serverseitigen `can_edit`/`can_delete`-Feldern und typisierten Pydantic-Schemas ausliefern.
- Soft-Delete mit `deleted_at` einführen, ohne bestehende MealItem-/RecipeItem-Referenzen zu zerstören.
- Die Event-/MealPlan-Beziehung auf eine kanonische Relation mit genau einem Event pro MealPlan migrieren.
- Autorisierung und Frontend-Controls mit Happy Path sowie 401/403/404 absichern.

**Non-Goals:**

- Keine Korrektur der Varianten-, Nährwert-, Preis- oder Kochplanberechnung.
- Keine Reparatur der globalen OpenSpec-Validierung außerhalb der betroffenen Specs.
- Keine Änderung der Food/Main-Frontend-Trennung.
- Keine neue Login- oder Rollenarchitektur.
- Keine Cache-Invalidierungsarchitektur; Zugriff wird bei jeder API-Abfrage geprüft.

## Decisions

### 1. Zentrale Policy statt verteilter Einzelprüfungen

`content/services/food_access.py` stellt Resolver und Prädikate für Sichtbarkeit, Lesen, Bearbeiten, Löschen, Forking und Export bereit. Jeder betroffene Router ruft diese Policy auf, statt eigene Owner-/Staff-Bedingungen zu implementieren.

Alternativen: Bestehende Helfer unverändert weiterverwenden würde die gefundenen Lücken nicht verhindern; eine generische Policy für alle Content-Typen wäre wegen Ingredient als standalone Model zu unpräzise.

### 2. Sichtbarkeit und Rollen

Public ist anonym lesbar. Private Recipes sind für Owner, Collaborators und explizit zugeordnete aktive Gruppenmitglieder sichtbar; private Ingredients bleiben auf Owner und Staff beschränkt. Gruppenadmins dürfen gruppensichtbare Recipes und Ingredients bearbeiten. Collaborators erhalten vollständige Recipe-Rechte. Staff darf alle Food-Daten lesen und ändern.

Unsichtbare Ressourcen antworten mit 404, damit ihre Existenz nicht verraten wird. Sichtbare Ressourcen ohne erforderliche Aktion antworten mit 403. Öffentliche Kataloge enthalten ausschließlich öffentliche oder systemweit freigegebene Daten.

### 3. Soft-Delete

Recipe und Ingredient erhalten `deleted_at: DateTimeField(null=True, blank=True)`. Normale Queries und Listen schließen gelöschte Datensätze aus. Detailzugriff auf gelöschte Daten ist nur Owner, berechtigten MealItem-Kontexten und Staff erlaubt. Neue Zuordnungen zu gelöschten Ressourcen werden abgelehnt; bestehende MealItems bleiben erhalten und werden bei Berechnungen übersprungen.

Alternativen: Hard-Delete würde Referenzen und historische Pläne beschädigen; ein Status-String würde die Löschzeit und Wiederherstellung schlechter ausdrücken.

### 4. Event-/MealPlan-Relation

Eine neue Relation-Tabelle speichert `event_id`, `meal_plan_id`, Audit-Zeitstempel und eine Unique-Constraint auf `meal_plan_id`. Bestehende Daten werden in einer Datenmigration übertragen. Bei widersprüchlichen bidirektionalen Foreign Keys gewinnt die MealPlan-Verknüpfung. Nach erfolgreicher Migration werden die alten Foreign Keys in einem separaten, reversiblen Schritt entfernt.

Alternativen: Beide Foreign Keys synchron zu halten würde die bisherige Inkonsistenz fortsetzen; ein einzelnes FK-Feld im Event oder MealPlan würde die fachliche Relation unnötig asymmetrisch machen.

### 5. Audit nur für Staff-Detail- und Exportzugriffe

Ein Audit-Modell im `content`-Bereich speichert User, Ressourcentyp, Ressource-ID, Endpoint, Zeitpunkt und Erfolg. Nur Staff-Zugriffe auf Detail- und Export-Endpoints werden protokolliert; Aufbewahrung beträgt 30 Tage. Ein Cleanup-Mechanismus löscht ältere Einträge. Such- und Listenabfragen werden nicht einzeln geloggt.

### 6. Strikte API-Verträge

Betroffene Pydantic-Responses werden als benannte `Out`-Schemas definiert. Detail- und List-Resource-Schemas erhalten verpflichtende Permission-Felder gemäß `permissionBaseSchema`. Zod validiert diese Felder strikt; fehlende Felder gelten als API-Fehler und werden nicht mit Defaults kaschiert.

### 7. Teststrategie

Die Tests konzentrieren sich auf die kritischen Livegang-Flows: Recipe-Detail/Fork/Nutrition, Ingredient-Detail/Portion/Package/Alias, MealItem-Referenzen, Soft-Delete und Event-/MealPlan-Verknüpfung. Frontend-seitig werden nur Edit/Delete/Fork-Controls und die zentrale Zod-Permission-Validierung geprüft. Eine vollständige Legacy-Suite ist nicht Bestandteil dieses Changes.

## Risks / Trade-offs

- **[Risiko]** Die strikte Zod-Validierung kann bisher tolerierte alte Responses brechen. → Backend zuerst deployen oder abgestimmten atomaren Release verwenden; Contract-Tests vor dem Rollout ausführen.
- **[Risiko]** Eine Relation-Migration kann widersprüchliche Produktionsdaten vorfinden. → Vorab-Dry-Run und Konfliktreport; MealPlan gewinnt deterministisch.
- **[Risiko]** Staff-Audit erzeugt zusätzliche Daten. → Nur Detail-/Exportzugriffe erfassen und nach 30 Tagen batchweise löschen.
- **[Risiko]** Zentrale Policies können N+1-Queries erzeugen. → `select_related`/`prefetch_related`, Policy-Kontext pro Request und Query-count-Tests verwenden.
- **[Risiko]** Soft-Delete kann alte Admin- oder Exportpfade übersehen. → Alle Food-Querysets und Export-Resolver über gemeinsame Manager/Policies führen.

## Migration Plan

1. Neue Audit- und Relation-Modelle sowie `deleted_at`-Felder per additive Migration ausrollen.
2. Datenbank- und API-Policies deployen, während alte Foreign-Key-Felder noch lesbar bleiben.
3. Relation-Dry-Run und Datenqualitätsreport ausführen; widersprüchliche Daten nach MealPlan-Regel migrieren.
4. Backend- und Frontend-Contract-Tests sowie Autorisierungsmatrix ausführen.
5. Frontend mit strikt erforderlichen Permission-Feldern deployen.
6. Nach Beobachtung die alten Event-/MealPlan-Foreign Keys entfernen und die Unique-Constraint aktivieren.
7. Rollback: Anwendung auf vorherige Version zurücksetzen; additive Felder bleiben ungenutzt. Die Relation-Entfernung darf erst nach erfolgreicher Datenmigration erfolgen und wird bei Bedarf über eine Reverse-Migration zurückgesetzt.

## Open Questions

- Der genaue Name und Speicherort des Staff-Audit-Modells muss an das bestehende Audit-Modell angepasst werden.
- Die bestehende transitive-visibility-Spec widerspricht teilweise den neuen Nutzungsvoraussetzungen und muss beim Spec-Archivieren bewusst ersetzt werden.
