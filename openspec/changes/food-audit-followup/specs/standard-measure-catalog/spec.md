## MODIFIED Requirements

### Requirement: Standardmaß und Zutaten-Portion verwenden eine nachvollziehbare gemeinsame Umrechnung
Das System SHALL bei der Umrechnung zwischen Standardmaß und Zutaten-Portion denselben zugrunde liegenden Grammwert verwenden. Eine Umrechnung SHALL die physische Menge erhalten; unterschiedliche Bezeichnungen oder Portionsgrößen dürfen keine unerklärte Mengenänderung erzeugen. Gleichzeitig angebotene Optionen mit gleicher Bezeichnung und unterschiedlichen Grammwerten MUST entweder fachlich unterscheidbar beschriftet oder als Duplikat entfernt werden.

#### Scenario: Tassenmenge behält Masse bei
- **GIVEN** eine Zutatenmenge wird als Standardmaß „Tasse“ erfasst und anschließend als Zutaten-Portion dargestellt
- **WHEN** beide Darstellungen in Gramm umgerechnet werden
- **THEN** SHALL die zugrunde liegende Masse bis auf die dokumentierte Rundungsgenauigkeit gleich bleiben

#### Scenario: Doppelte Maßnamen sind unterscheidbar
- **GIVEN** eine Zutat hat ein Standardmaß „Tasse“ und eine eigene Portion mit dem Namen „Tasse“ und abweichendem Gewicht
- **WHEN** beide Optionen im Mengen-Dialog angeboten werden
- **THEN** SHALL die Anzeige die unterschiedlichen Größen eindeutig benennen oder eine der fachlich redundanten Optionen ausblenden

#### Scenario: Volumenmaß mit bekannter Dichte
- **GIVEN** eine Zutat hat eine explizite Dichte
- **WHEN** ein Standard-Volumenmaß in eine Zutaten-Portion umgerechnet wird
- **THEN** SHALL die Dichte genau einmal angewendet werden und die angezeigte Gramm-Äquivalenz der gespeicherten Menge entsprechen
