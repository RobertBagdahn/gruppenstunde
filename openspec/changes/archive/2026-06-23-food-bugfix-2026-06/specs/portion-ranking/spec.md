## ADDED Requirements

### Requirement: Stückzahl-Anzeige aus rank=1-Portion in Einkaufsliste

Ergänzend zu den bestehenden ▲/▼-Buttons für die Portionsreihenfolge: Die Einkaufsliste SHALL für Zutaten mit einer Stück-Portion (rank=1, Nicht-Gramm-Einheit) die Gramm-Menge in Stückzahl umrechnen und anzeigen. Dieses Verhalten ist in `shopping-list-piece-equivalents` spezifiziert.

#### Scenario: rank=1 Portion wird für Stückzahl-Berechnung verwendet

- **WHEN** eine Zutat in der Einkaufsliste angezeigt wird
- **THEN** wird die Portion mit dem niedrigsten `rank`-Wert (höchste Priorität) als Basis für die Stückzahl-Umrechnung verwendet
- **THEN** nur Portionen mit `weight_g > 0` und nicht-Gramm-Einheit werden als Stück-Portionen akzeptiert

## MODIFIED Requirements

### Requirement: Portionen-Reihenfolge per Buttons ändern

Das System MUSS dem Nutzer ▲/▼ Buttons pro Portion anzeigen, mit denen die Sortierreihenfolge geändert werden kann. Drag&Drop wird nicht unterstützt (zu komplex für Touch-Bedienung).

#### Scenario: Portion nach oben verschieben

- **WHEN** der Nutzer auf den ▲-Button einer Portion klickt die nicht bereits an erster Stelle steht
- **THEN** tauscht die Portion ihren `rank`-Wert mit der darüberliegenden Portion
- **THEN** wird die Liste sofort in neuer Reihenfolge angezeigt (optimistic update)

#### Scenario: Portion nach unten verschieben

- **WHEN** der Nutzer auf den ▼-Button einer Portion klickt die nicht bereits an letzter Stelle steht
- **THEN** tauscht die Portion ihren `rank`-Wert mit der darunterliegenden Portion
- **THEN** wird die Liste sofort in neuer Reihenfolge angezeigt

#### Scenario: Button deaktiviert an Grenzen

- **WHEN** eine Portion an erster Stelle steht
- **THEN** ist der ▲-Button deaktiviert (disabled)
- **WHEN** eine Portion an letzter Stelle steht
- **THEN** ist der ▼-Button deaktiviert (disabled)
