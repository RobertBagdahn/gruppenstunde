## MODIFIED Requirements

### Requirement: Einkaufslisten zeigen erkannte Mengen eindeutig
Wenn ein Einkaufslisteneintrag einer Zutat zugeordnet ist, SHALL die Anzeige eine eindeutige Menge und passende Einheit aus den kanonischen Mengendaten darstellen. Die Portionsbezeichnung SHALL nicht doppelt mit einer zweiten Einheit erscheinen. Einheiten wie Gramm, Stück oder Volumen SHALL der gespeicherten Menge entsprechen.

#### Scenario: Freitext entspricht einer vorhandenen Zutat
- **GIVEN** ein Eintrag enthält „2 kg Zimt“ und eine aktive Zutat „Zimt“ ist vorhanden
- **WHEN** der Einkaufslisten-Eintrag ausgewertet wird
- **THEN** SHALL das System die Zutat nur dann verknüpfen, wenn die Zuordnung eindeutig ist, und Menge sowie Einheit ohne Informationsverlust anzeigen

#### Scenario: Portion mit Mengenanzeige
- **GIVEN** ein Eintrag hat eine Portionsbezeichnung und eine berechnete Menge
- **WHEN** die Einkaufsliste gerendert wird
- **THEN** SHALL die Menge nicht als widersprüchliche Kombination wie „≈ 2,6 1 TL Zimt“ oder „≈ 13,2 g“ hinter „13 g“ erscheinen

#### Scenario: Kein sicherer Zutaten-Match
- **GIVEN** ein Freitext-Eintrag kann mehreren Zutaten zugeordnet werden
- **WHEN** das System keinen eindeutigen Match bestimmen kann
- **THEN** SHALL es den Eintrag als Freitext erhalten und darf keine falsche Zutat automatisch auswählen

#### Scenario: Flüssige Zutat erhält keine Stück-Äquivalenz
- **GIVEN** ein verknüpfter flüssiger Artikel wie Olivenöl hat eine fehlerhafte oder unpassende Stück-Portion
- **WHEN** die Einkaufsliste Mengen-Äquivalenzen berechnet
- **THEN** SHALL sie die Menge über Dichte als ml anzeigen und keine Stück-Äquivalenz ausgeben
