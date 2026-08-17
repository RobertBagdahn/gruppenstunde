## MODIFIED Requirements

### Requirement: HealthRule CRUD

Das System MUST Staff-Usern erlauben, vereinheitlichte Food-Regeln (`Rule`) zu erstellen, bearbeiten und löschen. Die Regelverwaltung MUST die Scopes `recipe`, `meal`, `day` und `meal_event` sowie Parameter für Nährwerte, Preis, Gewicht und Nutri-Score unterstützen.

Die UI MUST klar machen, dass Rezeptregeln auf Rezeptebene nur für Kalte und Warme Mahlzeiten sinnvoll sind, während Mahlzeit-, Tages- und Planregeln im Planer auf alle Mahlzeittypen angewandt werden.

#### Scenario: Rule erstellen
- **WHEN** Staff-User auf "Neu" klickt und alle Felder (name, description, parameter, scope, min/max green/yellow, unit, tip_text, is_active, sort_order) eingibt
- **THEN** wird eine neue Rule erstellt und in der Tabelle angezeigt

#### Scenario: Rule bearbeiten
- **WHEN** Staff-User die Bearbeiten-Aktion einer Rule wählt
- **THEN** öffnet sich ein Dialog mit den aktuellen Werten, der nach Speichern die Änderungen persistiert

#### Scenario: Rule löschen
- **WHEN** Staff-User die Löschen-Aktion einer Rule wählt und bestätigt
- **THEN** wird die Rule entfernt

#### Scenario: Rule deaktivieren
- **WHEN** Staff-User `is_active` auf false setzt
- **THEN** wird die Rule nicht mehr in Rezeptregeln oder Planer-Vorschlägen angewendet

#### Scenario: Erweiterte Parameter auswählen
- **WHEN** Staff-User eine Rule erstellt oder bearbeitet
- **THEN** kann der User Parameter wie `price_total`, `weight_g` und `nutri_class` auswählen
- **THEN** zeigt das Formular passende Einheiten oder Hinweise für diese Parameter an

#### Scenario: Hinweis bei Rezept-Scope
- **WHEN** Staff-User `scope="recipe"` auswählt
- **THEN** zeigt das Formular einen deutschen Hinweis, dass diese Regeln nur für Kalte und Warme Mahlzeiten auf Rezeptebene gelten

#### Scenario: Planer-Scope gilt für alle Mahlzeiten
- **WHEN** Staff-User `scope="meal"`, `scope="day"` oder `scope="meal_event"` auswählt
- **THEN** zeigt das Formular oder die Beschreibung an, dass diese Regeln im Planer aggregiert auf alle Mahlzeittypen angewandt werden
