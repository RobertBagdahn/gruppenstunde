# Spec Delta

## MODIFIED Requirements

### Requirement: Rezept von der Detailseite in einen Essensplan legen
Die Rezeptdetailseite SHALL im Seitenkopf und in der Mobile-Aktionsleiste die Aktion „Zum Essensplan“ anbieten. Die Aktion SHALL nicht in Rezeptlisten oder `RecipeCard` erscheinen. Auf Viewports unter 768 px MUST die Mobile-Aktionsleiste die Hauptaktion dauerhaft am unteren Rand zeigen, ohne Inhalt zu verdecken.

#### Scenario: Eingeloggter Nutzer öffnet den Dialog
- **WHEN** ein eingeloggter Nutzer auf „Zum Essensplan“ tippt
- **THEN** öffnet sich ein Dialog mit den Schritten Plan, Tag/Mahlzeit und Portionen

#### Scenario: Anonymer Besucher
- **WHEN** ein nicht eingeloggter Besucher auf „Zum Essensplan“ tippt
- **THEN** wird er zum Login geleitet und danach zur Rezeptseite zurückgeführt

#### Scenario: Mobile Aktionsleiste
- **WHEN** ein Nutzer ein Rezept auf 390 px Breite liest
- **THEN** bleibt „Zum Essensplan“ am unteren Rand erreichbar und der letzte Inhaltsblock ist nicht verdeckt
