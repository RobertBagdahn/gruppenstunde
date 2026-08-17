## ADDED Requirements

### Requirement: Neue-Zutat-Button im Dialog
Der `IngredientDetailSearchDialog` SHALL einen permanenten [+]-Button im Dialog-Header anzeigen, der die Navigation zur Zutaten-Erstellungsseite erm�glicht.

#### Scenario: Button sichtbar und klickbar
- **WHEN** der `IngredientDetailSearchDialog` ge�ffnet ist
- **THEN** SHALL ein [+]-Button im Dialog-Header (neben dem Suchfeld oder in der Titelzeile) sichtbar sein
- **THEN** der Button SHALL das Label "Neue Zutat" oder ein "+"-Icon mit Tooltip "Neue Zutat" anzeigen

#### Scenario: Klick auf +-Button navigiert zur Erstellungsseite
- **WHEN** der Nutzer auf den [+]-Button klickt
- **THEN** SHALL das System zu `/ingredients/new?redirectTo=<aktuelle Seiten-URL>` navigieren
- **THEN** der Dialog SHALL geschlossen werden

### Requirement: R�ckkehr aus Zutaten-Erstellung mit auto-add
Wenn der Nutzer nach erfolgreicher Zutaten-Erstellung zur�ck zum Dialog kommt, SHALL die neu erstellte Zutat automatisch selektiert werden.

#### Scenario: R�ckkehr-Parameter enth�lt neue Zutat
- **WHEN** die Seite einen `?newIngredientSlug=<slug>` Query-Parameter enth�lt und der Dialog sich �ffnet (oder bereits offen ist)
- **THEN** SHALL das System die Zutat per Slug laden (`GET /api/ingredients/<slug>/`)
- **THEN** SHALL der `IngredientQuantityDialog` f�r diese Zutat ge�ffnet werden
- **THEN** nach Best�tigung SHALL die Zutat mit gew�hlter Menge/Portion dem Rezept hinzugef�gt werden

#### Scenario: Ung�ltiger newIngredientSlug
- **WHEN** der `newIngredientSlug` auf keine existierende Zutat verweist
- **THEN** SHALL das System den Parameter still ignorieren (kein Fehler-Toast, kein Crash)
