## Purpose
Diese Spec definiert die Integritätsregeln für Portionsdaten und ihre Erzeugungspfade.

## Requirements

### Requirement: Zentrale weight_g-Berechnung

Das System MUST `Portion.weight_g` über eine einzige, wiederverwendbare Model-Methode (z. B. `Portion.compute_weight_g()`) berechnen. Alle Erzeugungspfade (API, URL-Import, Legacy-Import, Admin) MÜSSEN diese Methode verwenden; es DARF keine duplizierte Berechnungslogik in einzelnen Endpunkten oder Commands geben.

#### Scenario: Automatische Berechnung ohne expliziten Wert
- **WHEN** eine Portion mit `quantity` und `measuring_unit` aber ohne expliziten `weight_g` erstellt wird
- **THEN** MUSS `weight_g = quantity × measuring_unit.quantity` gesetzt werden

#### Scenario: Expliziter Wert hat Vorrang
- **WHEN** eine Portion mit explizitem `weight_g` erstellt wird
- **THEN** MUSS der explizite Wert übernommen und NICHT überschrieben werden

#### Scenario: Gewicht von genau 1 Gramm ist gültig
- **WHEN** `quantity × measuring_unit.quantity = 1.0` ergibt (z. B. „1 g", „1 ml", „1 Stück")
- **THEN** MUSS `weight_g = 1.0` gesetzt werden und NICHT `None`

#### Scenario: Nicht-positives Gewicht wird verworfen
- **WHEN** die berechnete Menge `≤ 0` ist
- **THEN** MUSS `weight_g = None` gesetzt werden

### Requirement: Portion-Name ist Pflicht

`Portion.name` MUST ein nicht-leeres Feld sein. Das Model DARF KEINEN Default-Wert `"g"` und KEIN `blank=True` haben. Ein fehlender Name MUSS zu einem Validierungsfehler führen statt still zu einem Platzhalter zu werden.

#### Scenario: Authentifizierter User erstellt Portion ohne Namen
- **WHEN** ein authentifizierter User `POST /api/ingredients/{slug}/portions/` ohne `name` (oder mit leerem `name`) sendet
- **THEN** MUSS die API mit HTTP 422 (Validierungsfehler) antworten
- **THEN** DARF KEINE Portion erstellt werden

#### Scenario: Nicht-authentifizierter User
- **WHEN** ein nicht-authentifizierter User `POST /api/ingredients/{slug}/portions/` aufruft
- **THEN** MUSS die API mit HTTP 403 antworten

#### Scenario: Pydantic- und Zod-Schema synchron
- **WHEN** das Backend-Schema `PortionCreateIn` `name` als required deklariert
- **THEN** MUSS das Frontend-Zod-Schema `name` ebenfalls als required (min. 1 Zeichen) deklarieren

### Requirement: Einheiten-Kanonisierung

Beim Erstellen von Portionen MUST das System Einheiten auf vorhandene kanonische `MeasuringUnit`-Einträge mappen. Das System DARF NICHT per `get_or_create(name=...)` neue Dubletten-Einheiten (z. B. „g" neben „Gramm", „EL" neben „Esslöffel") anlegen.

#### Scenario: Bekannter Einheitenname wird gemappt
- **WHEN** ein Erzeugungspfad eine Einheit „g" verarbeitet und eine kanonische Einheit „Gramm" existiert
- **THEN** MUSS die Portion die kanonische `MeasuringUnit` referenzieren

#### Scenario: Unbekannter Einheitenname
- **WHEN** ein Einheitenname keiner kanonischen Einheit (per Name oder Alias) zugeordnet werden kann
- **THEN** MUSS der Import die Zeile als ungültig markieren oder auf eine definierte Fallback-Einheit abbilden, aber KEINE neue Dubletten-Einheit anlegen

### Requirement: Portion-Deduplizierung pro Zutat

Innerhalb einer Zutat MUST das System Portionen über alle Erzeugungspfade hinweg über
`(ingredient, name, measuring_unit, quantity)` eindeutig halten. Ein abweichendes `weight_g` DARF
eine referenzierte Portion nicht verändern; dafür MUSS eine neue Portion angelegt werden. Bei
identischem Schlüssel MUSS die bestehende Portion wiederverwendet werden.

#### Scenario: URL-Import legt keine Duplikat-Portion an
- **WHEN** der URL-Import eine Portion mit `(ingredient, name, measuring_unit, quantity)` erzeugen will, die bereits existiert
- **THEN** MUSS die bestehende `portion_id` zurückgegeben werden statt eine neue zu erstellen

#### Scenario: Referenzierte Portion mit anderem Gewicht
- **WHEN** der URL-Import dieselbe fachliche Portion mit abweichendem Gewicht findet und die alte Portion referenziert ist
- **THEN** bleibt das Gewicht der alten Portion unverändert
- **THEN** wird eine separate Portion für das neue Gewicht verwendet oder angelegt

#### Scenario: Cleanup-Migration entfernt bestehende Duplikate
- **WHEN** die Daten-Migration läuft und eine Zutat mehrere identische Portionen hat (z. B. „Pralinen" mit 146 Portionen, 2 distinkte Definitionen)
- **THEN** MUSS pro distinkter `(name, measuring_unit, quantity)`-Kombination genau eine Portion behalten und die übrigen soft-gelöscht werden
- **THEN** MÜSSEN referenzierende `RecipeItem`-Einträge auf die behaltene Portion umgehängt werden

### Requirement: Cleanup bestehender kaputter Portionen

Eine Daten-Migration MUST bestehende kaputte Portionen reparieren: `weight_g = NULL` nachberechnen und leere/Default-Namen aus der Einheit ableiten.

#### Scenario: weight_g wird nachberechnet
- **WHEN** die Migration eine Portion mit `weight_g = NULL` und gültiger `measuring_unit` findet
- **THEN** MUSS `weight_g = quantity × measuring_unit.quantity` gesetzt werden, sofern das Ergebnis `> 0` ist

#### Scenario: Leerer Name wird abgeleitet
- **WHEN** die Migration eine Portion mit leerem oder Default-Namen (`""` oder `"g"`) findet
- **THEN** MUSS ein sinnvoller Name aus der zugehörigen `measuring_unit` abgeleitet werden

### Requirement: Frontend kennzeichnet unvollständige Portionen

Die Portionsliste im Food-Frontend MUST Portionen mit fehlendem `weight_g` oder fehlendem Namen sichtbar als unvollständig markieren statt eine leere Zeile darzustellen.

#### Scenario: Unvollständige Portion wird markiert
- **WHEN** eine Portion ohne `weight_g` oder mit leerem Namen in `IngredientDetailPage` gerendert wird
- **THEN** MUSS eine sichtbare Warnung (z. B. „⚠ Unvollständig") angezeigt werden statt einer leeren Zeile
