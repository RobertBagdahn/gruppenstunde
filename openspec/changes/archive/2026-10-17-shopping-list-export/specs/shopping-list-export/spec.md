## ADDED Requirements

### Requirement: Export-Menü auf der Einkaufsliste
Die Einkaufslisten-Detailseite SHALL im Kopfband einen Button „Liste exportieren“ zeigen, der ein Menü mit „Drucken oder als PDF speichern“, „Als Text teilen“ und „Text kopieren“ öffnet. Der Export MUST für alle Betrachter gelten, die die Liste sehen dürfen, ohne zusätzliche API-Anfrage aus den geladenen Daten erfolgen.

#### Scenario: Besitzer öffnet das Export-Menü
- **GIVEN** ein angemeldeter Besitzer öffnet eine Liste mit offenen Einträgen auf einem Handy mit Teilen-Funktion
- **WHEN** er „Liste exportieren“ wählt
- **THEN** zeigt das Menü „Drucken oder als PDF speichern“, „Als Text teilen“ und „Text kopieren“

#### Scenario: Gast exportiert
- **GIVEN** ein Gast ohne Konto ist über den Einladungslink beigetreten
- **WHEN** er „Liste exportieren“ wählt
- **THEN** stehen ihm dieselben Aktionen zur Verfügung

#### Scenario: Viewer exportiert
- **GIVEN** ein Mitglied mit Rolle „viewer“
- **THEN** sieht es den Button „Liste exportieren“, obwohl es nichts ändern darf

#### Scenario: Gerät ohne Teilen-Funktion
- **GIVEN** ein Desktop-Browser ohne `navigator.share`
- **WHEN** der Nutzer das Menü öffnet
- **THEN** fehlt „Als Text teilen“; „Drucken oder als PDF speichern“ und „Text kopieren“ sind vorhanden

#### Scenario: Einkaufsmodus
- **GIVEN** der Einkaufsmodus ist aktiv
- **THEN** ist der Button „Liste exportieren“ nicht sichtbar

#### Scenario: Alles abgehakt
- **GIVEN** alle Einträge sind abgehakt
- **THEN** ist „Liste exportieren“ deaktiviert; der Hinweis „Alles abgehakt – nichts zu exportieren“ steht als Tooltip (`title`) am Button

#### Scenario: Nicht angemeldet ohne Gast-Token
- **GIVEN** ein Besucher ohne Konto und ohne Gast-Token öffnet `/shopping-lists/{id}`
- **THEN** erscheint der Anmeldehinweis und kein Export-Button

#### Scenario: Keine zusätzliche Anfrage
- **WHEN** der Nutzer eine Export-Aktion ausführt
- **THEN** sendet die Seite dafür keine Anfrage an `/api/`

### Requirement: Inhalt des Exports
Druck- und Textexport SHALL dieselben Inhalte zeigen: Kopf mit Stand und Zählern, nur offene Einträge nach Abteilungen, je Eintrag Name, Mengenangabe mit Packungsbedarf und Zuständige. Notizen, Preise, Herkunft und Mengenwarnungen MUST NICHT exportiert werden; E-Mail-Adressen MUST NIE erscheinen.

#### Scenario: Nur offene Einträge
- **GIVEN** die Liste hat 40 Einträge, davon 12 abgehakt
- **WHEN** der Nutzer exportiert
- **THEN** enthält der Export 28 Einträge und den Kopf „28 offen · 12 schon abgehakt“

#### Scenario: Gruppierung wie auf der Seite
- **GIVEN** offene Einträge in „Obst und Gemüse“, „Kühlregal“, ohne Abteilung und Verbrauchsmaterial
- **WHEN** der Nutzer exportiert
- **THEN** erscheinen die Abteilungen in der Reihenfolge „Obst und Gemüse“, „Kühlregal“, „Sonstiges“, „Verbrauchsmaterial“

#### Scenario: Stand und Zähler im Kopf
- **GIVEN** die Liste wurde am 17.10.2026 um 09:05 Uhr exportiert, 2 Einträge sind offen, 1 abgehakt
- **WHEN** der Nutzer exportiert
- **THEN** lautet die zweite Kopfzeile „Stand 17.10.2026, 09:05 Uhr · 2 offen · 1 schon abgehakt“

#### Scenario: Packungsbedarf in der Mengenangabe
- **GIVEN** „Mehl“ braucht 1.375 g bei einer 500-g-Packung
- **WHEN** der Nutzer exportiert
- **THEN** enthält die Mengenangabe den Packungsbedarf wie in der Eintragszeile, z. B. „1,4 kg · 3 × 500-g-Packung“

#### Scenario: Menge und Zuständigkeit
- **GIVEN** „Käse“ mit 400 g ist von Anna übernommen
- **WHEN** der Nutzer exportiert
- **THEN** lautet die Zeile „Käse – 400 g (Anna)“, beim Text mit vorangestelltem „☐ “

### Requirement: Textexport zum Teilen und Kopieren
Der Textexport SHALL reinen Text mit Kopf, fett gesetzten Abteilungen und einer „☐“-Zeile je offenem Eintrag erzeugen. „Als Text teilen“ MUST `navigator.share` mit dem Listennamen als `title` und dem Text aufrufen. „Text kopieren“ MUST den Text in die Zwischenablage schreiben.

#### Scenario: Text teilen per WhatsApp
- **GIVEN** ein Handy mit Teilen-Funktion
- **WHEN** der Nutzer „Als Text teilen“ wählt und WhatsApp auswählt
- **THEN** enthält die Nachricht den Kopf, fett gesetzte Abteilungen und je offenen Eintrag eine Zeile mit „☐ “

#### Scenario: Teilen abgebrochen
- **WHEN** der Nutzer den Teilen-Dialog schließt, ohne eine App zu wählen
- **THEN** erscheint keine Fehlermeldung

#### Scenario: Text kopieren
- **WHEN** der Nutzer „Text kopieren“ wählt
- **THEN** steht der Textexport in der Zwischenablage und „Liste kopiert“ wird angezeigt

#### Scenario: Kopieren nicht erlaubt
- **GIVEN** der Browser verweigert den Zugriff auf die Zwischenablage
- **WHEN** der Nutzer „Text kopieren“ wählt
- **THEN** erscheint „Liste konnte nicht kopiert werden“

#### Scenario: Textformat
- **GIVEN** die offenen Einträge „Möhren“ (400 g) in „Obst und Gemüse“ und „Brot“ (von Anna übernommen) in „Backwaren“
- **WHEN** der Nutzer „Text kopieren“ wählt
- **THEN** ist der Text genau:
  ```
  Einkaufsliste: Lagereinkauf
  Stand 17.10.2026, 09:05 Uhr · 2 offen

  *Obst und Gemüse*
  ☐ Möhren – 400 g

  *Backwaren*
  ☐ Brot (Anna)
  ```

#### Scenario: Teilen fehlgeschlagen
- **GIVEN** der Browser meldet einen Fehler beim Teilen, der nicht vom Abbruch durch den Nutzer kommt
- **WHEN** der Nutzer „Als Text teilen“ wählt
- **THEN** erscheint „Liste konnte nicht geteilt werden“

#### Scenario: Eintrag ohne Menge
- **GIVEN** ein manueller Eintrag „Grillanzünder“ ohne Menge
- **WHEN** der Nutzer exportiert
- **THEN** lautet die Zeile „☐ Grillanzünder“
