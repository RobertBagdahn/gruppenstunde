# group-management Specification

## Purpose

Hierarchisches Gruppenverwaltungssystem für Pfadfinder-Organisationen. Unterstützt verschachtelte Gruppen (z.B. Stamm -> Sippe), Mitgliedschaft mit Rollen (Admin/Mitglied), drei Beitrittsmechanismen (offen, Beitrittscode, Beitrittsanfrage) und Mitgliedschaftsvererbung durch die Gruppenhierarchie. Gruppen sind soft-deletable.

## Requirements

### Requirement: Gruppen CRUD

Das System MUST vollständige CRUD-Operationen für UserGroups über `/api/groups/` bereitstellen. Gruppen werden per Slug identifiziert.

#### Scenario: Gruppe erstellen

- GIVEN ein authentifizierter Benutzer
- WHEN der Benutzer POST `/api/groups/` mit Name, Beschreibung, `is_visible`, `free_to_join`, `join_code` und optionaler `parent_id` absendet
- THEN wird die Gruppe erstellt mit einem auto-generierten Slug
- AND der Ersteller wird als Admin-Mitglied hinzugefügt

#### Scenario: Gruppe aktualisieren (nur Admin)

- GIVEN ein Gruppen-Admin
- WHEN der Admin PUT `/api/groups/{slug}/` absendet
- THEN werden die Gruppendetails aktualisiert

#### Scenario: Gruppe soft-löschen

- GIVEN ein Gruppen-Admin
- WHEN der Admin die Gruppe löscht
- THEN wird `is_deleted=true` und `date_deleted` gesetzt (nicht physisch entfernt)
- AND Kindgruppen und Mitgliedschaften bleiben bestehen, sind aber effektiv inaktiv

### Requirement: Hierarchische Gruppenstruktur

Das System SHALL Eltern-Kind-Gruppenbeziehungen über das `parent`-Feld (FK zu sich selbst, nullable) für die Organisationshierarchie unterstützen.

#### Scenario: Kindgruppe erstellen

- GIVEN eine Elterngruppe "Stamm Adler"
- WHEN ein Gruppen-Admin eine Kindgruppe "Sippe Falken" mit `parent_id` der Elterngruppe erstellt
- THEN referenziert das `parent`-Feld der Kindgruppe "Stamm Adler"
- AND die Kindgruppe erscheint in der `children`-Liste der Elterngruppe

#### Scenario: Mitgliedschaftsvererbung

- GIVEN ein Benutzer, der Mitglied der Elterngruppe "Stamm Adler" ist
- WHEN die Gruppenmitgliedschaften des Benutzers abgefragt werden
- THEN gilt der Benutzer durch Vererbung auch als Mitglied der Kindgruppen
- AND die Gruppendetail-Antwort enthält `inherited_member_count`

#### Scenario: Vorfahren-Kette

- GIVEN eine verschachtelte Gruppenstruktur (z.B. Bund -> Stamm -> Sippe)
- WHEN die Gruppendetails einer Sippe abgerufen werden
- THEN enthält die Antwort `ancestors` als geordnete Liste aller Vorfahren

### Requirement: Mitgliederverwaltung

Das System MUST Gruppenmitgliedschaften mit rollenbasiertem Zugriff verwalten. Rollen sind `member` und `admin` (definiert als `MembershipRoleChoices`).

#### Scenario: Mitglied hinzufügen

- GIVEN ein Gruppen-Admin
- WHEN der Admin einen Benutzer zur Gruppe hinzufügt
- THEN wird eine GroupMembership mit Rolle "member" erstellt
- AND die Kombination `(user, group)` ist unique (keine doppelten Mitgliedschaften)

#### Scenario: Zum Admin befördern

- GIVEN ein Gruppen-Admin und ein bestehendes Mitglied
- WHEN der Admin das Mitglied befördert
- THEN ändert sich die Rolle des Mitglieds auf "admin"
- AND das Mitglied erhält Gruppen-Verwaltungsberechtigungen

#### Scenario: Mitglied entfernen (Gruppe verlassen)

- GIVEN ein Gruppen-Mitglied
- WHEN das Mitglied die Gruppe per DELETE `/api/groups/{slug}/members/{membershipId}/` verlässt
- THEN wird die GroupMembership gelöscht
- AND der Benutzer verliert Zugriff auf gruppenspezifische Funktionen

### Requirement: Beitrittsmodus

Das System SHALL den Beitrittsmodus einer Gruppe über ein explizites Feld `join_mode` steuern. Derzeit im Code als Kombination aus `free_to_join` (BooleanField) und `join_code` (CharField) implementiert — Migration zu `join_mode` ist geplant.

#### Scenario: Offener Gruppenbeitritt

- GIVEN eine Gruppe mit `free_to_join=true`
- WHEN ein authentifizierter Benutzer POST `/api/groups/{slug}/join/` aufruft
- THEN wird der Benutzer sofort als Mitglied hinzugefügt (Response: 200 mit GroupMember)

#### Scenario: Beitritt per Code

- GIVEN eine Gruppe mit `free_to_join=false` und gesetztem `join_code`
- WHEN ein Benutzer POST `/api/groups/{slug}/join-by-code/` mit `{ join_code: string }` einreicht
- THEN wird der Beitrittscode validiert
- AND bei gültigem Code wird der Benutzer als Mitglied hinzugefügt

#### Scenario: Beitrittsanfrage-Workflow

- GIVEN eine Gruppe mit `free_to_join=false` und leerem `join_code`
- WHEN ein Benutzer POST `/api/groups/{slug}/join/` aufruft
- THEN wird eine GroupJoinRequest mit Status "pending" erstellt (Response: 201 mit JoinRequest)
- AND der Gruppen-Admin kann die Anfrage genehmigen oder ablehnen

#### Scenario: Beitrittsanfrage genehmigen

- GIVEN eine ausstehende GroupJoinRequest
- WHEN ein Gruppen-Admin die Anfrage genehmigt
- THEN wird der Benutzer als Mitglied hinzugefügt
- AND der Anfrage-Status ändert sich auf "approved"

#### Scenario: Beitrittsanfrage ablehnen

- GIVEN eine ausstehende GroupJoinRequest
- WHEN ein Gruppen-Admin die Anfrage ablehnt
- THEN ändert sich der Anfrage-Status auf "rejected"
- AND der Benutzer wird nicht zur Gruppe hinzugefügt

### Requirement: Gruppen-Auflistung

Das System SHALL Gruppen-Erkennung und -Auflistung bereitstellen.

#### Scenario: Eigene Gruppen auflisten

- GIVEN ein authentifizierter Benutzer, der Mitglied mehrerer Gruppen ist
- WHEN der Benutzer GET `/api/profile/me/groups/` aufruft
- THEN werden alle Gruppen zurückgegeben, denen der Benutzer angehört

#### Scenario: Eigene Beitrittsanfragen auflisten

- GIVEN ein authentifizierter Benutzer mit ausstehenden Beitrittsanfragen
- WHEN der Benutzer GET `/api/profile/me/requests/` aufruft
- THEN werden alle JoinRequests des Benutzers zurückgegeben

#### Scenario: Gruppen suchen

- GIVEN öffentliche Gruppen im System
- WHEN ein Benutzer GET `/api/groups/?q=adler` aufruft
- THEN werden passende Gruppen basierend auf dem Suchbegriff zurückgegeben

#### Scenario: Gruppendetail mit Mitgliedern

- GIVEN eine Gruppe mit Mitgliedern
- WHEN ein Benutzer GET `/api/groups/{slug}/` aufruft
- THEN werden die Gruppendetails mit `members`, `children`, `ancestors`, `inherited_member_count` und `join_code` (nur für Admins sichtbar) zurückgegeben

## Planned Features

Die folgenden Features sind geplant, aber noch nicht implementiert:

### Planned: Explizites join_mode Feld

- Derzeit wird der Beitrittsmodus über die Kombination `free_to_join` + `join_code` bestimmt.
- Geplant: Neues Feld `join_mode` (TextChoices: `open`, `code`, `request`) als einzelnes steuerndes Feld. `free_to_join` und `join_code` werden in einer Migration konsolidiert.
