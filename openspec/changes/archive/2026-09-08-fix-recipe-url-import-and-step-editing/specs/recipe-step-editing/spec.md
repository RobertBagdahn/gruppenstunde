## ADDED Requirements

### Requirement: Sofortige Erfassung von Änderungen im Schritt-Editor

Der Schritt-Editor SHALL Textänderungen an Zubereitungsschritten ohne Verzögerung an den Zustand/Store übertragen. Die Änderungserkennung (`hasChanges`) MUST sofort aktiv sein, sobald der Nutzer Text im Eingabefeld ändert.

#### Scenario: Nutzer tippt neuen Text in Zubereitungsschritt
- **WHEN** der Nutzer den Text eines Zubereitungsschritts im Editor ändert
- **THEN** SHALL der geänderte Inhalt sofort im Store abgebildet werden
- **THEN** SHALL `hasChanges` auf `true` gesetzt sein, noch bevor das Textfeld den Fokus verliert

### Requirement: Zuverlässiges Speichern beim Schrittwechsel im Wizard

Wenn der Nutzer im Erstellungs-Wizard von Schritt 3 (Schritte) auf „Weiter“ klickt, SHALL das System alle vorgenommenen Änderungen an den Schritten per API abspeichern, unabhängig davon, ob das Eingabefeld zuvor durch ein Blur-Event verlassen wurde.

#### Scenario: Speichern bei fokussiertem Textfeld
- **WHEN** der Nutzer eine Zubereitungsanweisung ändert und direkt auf die Schaltfläche „Weiter“ klickt, während das Textfeld noch fokussiert ist
- **THEN** SHALL `save()` alle modifizierten Schritte erfassen und erfolgreich via `batchUpdate` an das Backend senden
- **THEN** SHALL in der anschließenden Vorschau (Schritt 4) der aktualisierte Zubereitungstext sichtbar sein
