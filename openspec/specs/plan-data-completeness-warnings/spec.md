# plan-data-completeness-warnings Specification

## Purpose
Anforderungen an plan data completeness warnings: Fehlende Nährwerte werden im Plan gekennzeichnet; Rezeptzeilen ohne Zutat erzeugen eine Warnung; Zutaten ohne Portion sind im Editor nicht unerwartet fehlerhaft.
## Requirements
### Requirement: Fehlende Nährwerte werden im Plan gekennzeichnet
Das System SHALL für jede Mahlzeit ausweisen, welche verwendeten Zutaten keine Nährwerte besitzen, und den Plan-Check um eine Warnung `missing_nutrition` ergänzen. Die Energiesumme MUST als unvollständig gekennzeichnet werden, wenn Zutaten ohne Nährwerte enthalten sind; sie MUST NOT eine Unterdeckung („Zu wenig Energie“) ohne diesen Hinweis ausweisen.

#### Scenario: Zutat ohne Nährwerte
- **GIVEN** ein Rezept mit 100 g einer Zutat ohne Nährwerte und einer Zutat mit Nährwerten in einem Plan
- **WHEN** der Plan geladen wird
- **THEN** nennt die Mahlzeit die Zutat als „ohne Nährwerte“
- **AND** der Plan-Check enthält eine Warnung `missing_nutrition`
- **AND** der Hinweis „Zu wenig Energie“ enthält den Zusatz, dass Nährwerte unvollständig sind

### Requirement: Rezeptzeilen ohne Zutat erzeugen eine Warnung
Das System SHALL für Rezeptzeilen ohne Portion bzw. Zutat im Plan-Check eine Warnung mit Rezeptname ausgeben, statt sie stillschweigend auszulassen.

#### Scenario: Zeile ohne Portion
- **GIVEN** ein Rezept mit einer Zeile `portion_id = null` in einem Plan
- **WHEN** der Plan-Check berechnet wird
- **THEN** enthält er eine Warnung mit dem Rezeptnamen
- **AND** die Zeile fließt weiterhin nicht in Einkaufsliste und Summen ein

### Requirement: Zutaten ohne Portion sind im Editor nicht unerwartet fehlerhaft
Der Rezept-Editor SHALL beim Hinzufügen einer Zutat ohne definierte Portion eine Standard-Gramm-Portion verwenden. Ist das nicht möglich, MUST die Zutat im Dropdown mit Hinweis markiert und nicht auswählbar sein; der Toast „Keine Portion für diese Zutat gefunden“ MUST NOT der erste Hinweis sein.

#### Scenario: Verifizierte Zutat ohne Portion
- **WHEN** der Nutzer eine Zutat ohne Portion im Dropdown auswählt
- **THEN** wird sie mit einer Gramm-Portion zur Rezeptzeile hinzugefügt
