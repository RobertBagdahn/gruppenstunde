## ADDED Requirements

### Requirement: Hinweis auf veraltete Zubereitungsschritte
Wurden die Zubereitungsschritte per KI generiert und danach Zutaten hinzugefügt, entfernt oder ersetzt, SHALL der Wizard im Schritt „Zubereitung“ einen Hinweis „Zutaten wurden geändert – bitte Schritte prüfen“ zeigen. Reine Mengenänderungen MUST keinen Hinweis auslösen.

#### Scenario: Zutat nach Generierung entfernt
- **WHEN** Schritte generiert wurden und danach eine Zutat entfernt wird
- **THEN** zeigt der Schritt „Zubereitung“ den Hinweis

#### Scenario: Nur Menge geändert
- **WHEN** nach der Generierung nur eine Menge geändert wird
- **THEN** erscheint kein Hinweis
