## ADDED Requirements

### Requirement: Menge ändern und Teilmenge einkaufen
Ein Mitglied mit Bearbeitungsrecht SHALL die Menge eines nicht abgehakten Eintrags mit bekannter Einheit in der Listenansicht und in der kompakten Board-Ansicht (Einkaufsmodus) ändern können, etwa wenn nur eine Teilmenge erhältlich war. Die Aktion MUST als Schaltfläche mit Waage-Symbol und dem sichtbaren Text „Menge ändern“ erscheinen (nicht als bloßes Stift-Symbol) und einen Dialog öffnen, in dem das Mengenfeld sofort fokussiert und sein Inhalt markiert ist. Der Dialog MUST einen Hinweis zur Teilmenge („Nur eine Teilmenge bekommen? Trage hier ein, wie viel du tatsächlich hast.“) sowie „Speichern“ und „Abbrechen“ bieten; Enter übernimmt die Menge. Gespeichert wird `quantity_g` über denselben Endpunkt wie bisher, verteilt per Aktualisierung an alle Betrachter. Ohne Bearbeitungsrecht oder ohne bekannte Einheit MUST die Schaltfläche fehlen.

#### Scenario: Teilmenge in der Listenansicht
- **GIVEN** ein Eintrag „Käse (Gouda)“ mit 3,7 kg und ein Mitglied mit Bearbeitungsrecht
- **WHEN** es „Menge ändern“ wählt, „2“ in kg eingibt und mit Enter bestätigt
- **THEN** SHALL `quantity_g = 2000` gespeichert und der Dialog geschlossen werden

#### Scenario: Teilmenge im Board
- **GIVEN** die Board-Ansicht im Einkaufsmodus
- **WHEN** das Mitglied bei einem Eintrag „Menge ändern“ wählt
- **THEN** SHALL derselbe Dialog mit fokussiertem Mengenfeld erscheinen
- **THEN** SHALL die neue Menge nach dem Speichern im Board erscheinen

#### Scenario: Abbrechen
- **WHEN** das Mitglied den Dialog mit „Abbrechen“ schließt
- **THEN** MUST die gespeicherte Menge unverändert bleiben

#### Scenario: Abgehakter Eintrag oder ohne Bearbeitungsrecht
- **WHEN** der Eintrag abgehakt ist oder dem Betrachter das Bearbeitungsrecht fehlt
- **THEN** SHALL keine Schaltfläche „Menge ändern“ erscheinen
