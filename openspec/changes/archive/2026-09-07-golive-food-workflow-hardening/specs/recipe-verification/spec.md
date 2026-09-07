### Requirement: Portionsskalierung bei Nährwert-Regeln in der Verifikation
Das System SHALL Nährwertregeln bei der Verifikationsprüfung (`check_verification_readiness`) mit demselben Portionsfaktor auswerten wie in der regulären Rezept-Regelprüfung (`recipe_checks`). Die im Rezept gecachten Nährwerte (pro 100g) SHALL vor der Regel-Auswertung mit dem Portionsgewicht (`serving_weight / 100`) multipliziert werden, sofern die Regel nicht auf 100g oder abstrakte Scores bezogen ist.

#### Scenario: Rezept erfüllt Portionsschwellenwert
- **GIVEN** ein Rezept hat ein Gesamtgewicht von 400g bei 1 Portion (400g/Portion) und 150 kcal/100g (gesamt 600 kcal)
- **AND** es existiert eine aktive Rezept-Regel mit `min_green: 500 kcal`
- **WHEN** die Verifikationsbereitschaft (`check_verification_readiness`) geprüft wird
- **THEN** SHALL die Regel als erfüllt eingestuft werden (Status grün) und KEINE Nährwert-Warnung erzeugen

#### Scenario: Verifikations-Cache Invalidation nach Rezeptänderung
- **GIVEN** ein Rezept wurde wegen eines fehlenden Bildes mit Verifikations-Warnungen im Frontend angezeigt
- **WHEN** der Nutzer ein Bild hochlädt oder Metadaten speichert
- **THEN** SHALL der Query-Key `['recipe-verification-status', recipeId]` invalidiert werden und der Status-Badge im Frontend unmittelbar den aktualisierten Verifikationsstatus anzeigen
