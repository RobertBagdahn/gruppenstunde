## ADDED Requirements

### Requirement: Verwendete Rezepte nicht löschbar
Das System SHALL das Löschen eines Rezepts mit `409` ablehnen, solange es in mindestens einer Mahlzeit eines Essensplans verwendet wird. Die Fehlermeldung MUST die Anzahl der betroffenen Pläne nennen.

#### Scenario: Rezept ist in einem Plan
- **WHEN** ein Nutzer `DELETE /api/recipes/{id}/` für ein Rezept aufruft, das in einem Essensplan verwendet wird
- **THEN** antwortet das System mit `409`
- **AND** das Rezept bleibt unverändert und `deleted_at` bleibt leer

#### Scenario: Rezept ist in keinem Plan
- **WHEN** ein berechtigter Nutzer ein unbenutztes Rezept löscht
- **THEN** wird das Rezept soft-gelöscht

### Requirement: Nutzung eines Rezepts abfragen
Das System SHALL `GET /api/recipes/{id}/usage/` bereitstellen. Die Antwort MUST `plan_count` mit der Gesamtzahl der verwendenden Pläne enthalten und `plans` (ID, Name) nur für Pläne, die der anfragende Nutzer sehen darf.

#### Scenario: Plan eines anderen Nutzers
- **WHEN** ein Rezept in einem privaten Plan eines anderen Nutzers verwendet wird
- **THEN** zählt `plan_count` diesen Plan mit
- **AND** `plans` enthält ihn nicht

### Requirement: Lösch-Dialog zeigt Nutzung
Der Lösch-Dialog der Rezept-Detailseite SHALL vor der Bestätigung die Nutzung laden. Wird das Rezept verwendet, MUST der Dialog die sichtbaren Pläne mit Link nennen und den Löschen-Button deaktivieren.

#### Scenario: Dialog bei verwendetem Rezept
- **WHEN** der Nutzer bei einem in einem Plan verwendeten Rezept auf „Löschen“ klickt
- **THEN** nennt der Dialog „Wird in N Essensplan(en) verwendet“ mit Links zu den sichtbaren Plänen
- **AND** der Bestätigungs-Button ist deaktiviert

#### Scenario: Dialog bei unbenutztem Rezept
- **WHEN** das Rezept in keinem Plan verwendet wird
- **THEN** zeigt der Dialog den bisherigen Text und der Button ist aktiv
