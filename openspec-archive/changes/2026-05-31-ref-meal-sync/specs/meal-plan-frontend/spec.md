## MODIFIED Requirements

### Requirement: Verknüpfungs-Status in Planübersicht
Die Meal-Plan-Übersicht SHALL für jedes Meal visuell anzeigen, ob es mit einem RefMeal verknüpft ist (z.B. Link-Icon), entkoppelt ist, oder kein RefMeal für seinen Typ existiert.

#### Scenario: Verknüpftes Meal anzeigen
- **WHEN** ein Meal `is_synced=True` und `ref_meal` gesetzt hat
- **THEN** wird ein Verknüpfungs-Icon (🔗) neben dem Meal angezeigt

#### Scenario: Entkoppeltes Meal anzeigen
- **WHEN** ein Meal `is_synced=False` hat (mit oder ohne ref_meal)
- **THEN** wird kein Verknüpfungs-Icon angezeigt und das Meal erscheint als eigenständig

### Requirement: Sync-Dialog bei Änderung
Die UI SHALL beim Bearbeiten eines konkreten Meals (das einen RefMeal-Typ hat) fragen, ob die Änderung nur für dieses Meal oder für alle (via RefMeal-Update + Sync) übernommen werden soll.

#### Scenario: Änderung mit Sync-Option
- **WHEN** User ein verknüpftes Frühstücks-Meal bearbeitet und speichert
- **THEN** wird ein Dialog angezeigt: "Nur dieses Frühstück" oder "Alle Frühstücke (RefMeal aktualisieren)"

#### Scenario: Nur dieses Meal ändern
- **WHEN** User "Nur dieses Frühstück" wählt
- **THEN** wird das Meal entkoppelt (`is_synced=False`) und die Änderung nur lokal gespeichert

#### Scenario: Alle via RefMeal ändern
- **WHEN** User "Alle Frühstücke" wählt
- **THEN** wird das RefMeal mit den neuen Items aktualisiert und auf alle verknüpften Meals synchronisiert

### Requirement: RefMeal-Editor erreichbar aus Planübersicht
Die Planübersicht SHALL einen Button/Link zum RefMeal-Editor für jeden vorhandenen meal_type bereitstellen.

#### Scenario: RefMeal-Editor öffnen
- **WHEN** User auf "RefMeal bearbeiten" für Frühstück klickt
- **THEN** wird der RefMeal-Editor für das Frühstücks-RefMeal des Plans geöffnet
