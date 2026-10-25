# Spec Delta: platform-permissions

## Purpose

Legt fest, welche Rechte plattformweit geteilt werden: Nutzer, Plattform-Rollen und Gruppenmitgliedschaften gelten in allen Apps gleich und werden an einer Stelle geprüft. Produktspezifische Rechte bauen darauf auf.

## ADDED Requirements

### Requirement: Ein Nutzer, eine Identität in allen Apps
Ein Nutzer SHALL in allen Apps dieselbe Nutzer-ID, dieselben Profildaten, dieselben Gruppenmitgliedschaften und dieselben Plattform-Rollen haben, egal mit welcher Methode und in welcher App er sich angemeldet hat.

#### Scenario: Gleiche Identität
- **GIVEN** ein Nutzer hat sich im Essensplan per E-Mail-Link und in Gruppenstunde per Google angemeldet, beide mit `max@example.org`
- **WHEN** beide Apps `GET /api/auth/me/` aufrufen
- **THEN** liefern beide dieselbe `user.id`

### Requirement: Plattform-Rollen zentral
Die Plattform-Rolle „Inspi-Team“ (`is_staff`) SHALL nur in der Konto-App oder im Django-Admin vergeben werden und in allen Apps dieselben Sonderrechte gewähren. Alle Apps MUST dieselbe zentrale Prüfung verwenden und dasselbe Fehlerformat liefern: HTTP 401 `auth_required` für anonyme, HTTP 403 `staff_required` bzw. `permission_denied` für angemeldete Nutzer ohne Recht.

#### Scenario: Staff im Food-Admin
- **GIVEN** ein Admin macht in der Konto-App einen Nutzer zum Inspi-Team
- **WHEN** der Nutzer den Food-Admin im Essensplan öffnet
- **THEN** hat er Zugriff, ohne sich neu anzumelden

#### Scenario: Anonymer Zugriff
- **WHEN** ein nicht angemeldeter Client einen Staff-Endpunkt einer beliebigen App aufruft
- **THEN** antwortet das System mit HTTP 401 und `code: "auth_required"`

#### Scenario: Ohne Staff-Rolle
- **WHEN** ein angemeldeter Nutzer ohne Staff-Rolle einen Staff-Endpunkt aufruft
- **THEN** antwortet das System mit HTTP 403 und `code: "staff_required"`

### Requirement: Gruppenrechte zentral geprüft
Ob ein Nutzer Mitglied oder Admin einer Gruppe ist, auch über die Gruppenhierarchie vererbt, SHALL ausschließlich die Plattform beantworten. Produkte MUST Gruppenrechte über diese Prüfung ableiten und MUST NOT eigene Kopien von Mitgliedschaften speichern.

#### Scenario: Vererbte Mitgliedschaft
- **GIVEN** ein Nutzer ist Mitglied im „Stamm Adler“, und „Sippe Falken“ ist dessen Kindgruppe
- **WHEN** er in der Anmelde-App eine nur für die Sippe sichtbare Aktion öffnet
- **THEN** darf er sie sehen, genauso wie im Essensplan einen Essensplan der Sippe

#### Scenario: Austritt wirkt überall
- **WHEN** ein Nutzer in der Konto-App aus einer Gruppe austritt
- **THEN** verliert er beim nächsten API-Aufruf in allen Apps die Rechte, die er nur über diese Gruppe hatte

### Requirement: Produktrechte verweisen nur auf Plattform-Nutzer und -Gruppen
Produktspezifische Rechte (z. B. Mitbearbeitende von Inhalten, Essensplänen, Stundenplänen, Einkaufslisten, Aktionsteams) SHALL im jeweiligen Produkt bleiben. Sie MUST sich ausschließlich auf Plattform-Nutzer und -Gruppen beziehen. Die Personensuche zum Einladen SHALL in allen Apps dieselbe Plattform-Suche (`GET /api/users/search/`, paginiert mit `page` und `page_size`) verwenden.

#### Scenario: Mitbearbeiter in einer anderen App einladen
- **GIVEN** ein Nutzer sucht im Essensplan eine Person, um sie zum Essensplan einzuladen
- **WHEN** er „Anna“ eingibt
- **THEN** findet er dieselben Personen wie bei der Einladung zu einer Aktion in der Anmelde-App

#### Scenario: Anonyme Personensuche
- **WHEN** ein nicht angemeldeter Client `GET /api/users/search/?q=anna` aufruft
- **THEN** antwortet das System mit HTTP 401 und `code: "auth_required"`

### Requirement: Rechte über Produktgrenzen hinweg
Braucht ein Produkt die Rechte eines anderen Produkts (z. B. Einkaufstouren einer Aktion für das Aktionsteam und die Bearbeitenden des verknüpften Essensplans), SHALL es diese über die öffentliche Schnittstelle des anderen Produkts abfragen und MUST NOT dessen Rechte nachbauen.

#### Scenario: Aktionsteam plant Einkaufstouren
- **GIVEN** eine Person ist im Team einer Aktion, aber nicht Mitbearbeiterin des verknüpften Essensplans
- **WHEN** sie im Essensplan die Einkaufstouren dieser Aktion öffnet
- **THEN** darf sie die Touren planen, weil die Anmelde-App sie als Aktionsteam bestätigt
