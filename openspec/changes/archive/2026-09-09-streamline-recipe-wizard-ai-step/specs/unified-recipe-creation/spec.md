## MODIFIED Requirements

### Requirement: Einheitliches Smart-Eingabefeld als einziger Einstieg
Die Rezepterstellung unter `/recipes/new` SHALL genau einen Einstiegspunkt anbieten: ein einzelnes Smart-Eingabefeld, das eine URL, einen kopierten Rezepttext oder eine Freitext-Idee entgegennimmt. Eine Auswahl zwischen Erstellungsmethoden SHALL NICHT angezeigt werden. Innerhalb der Eingabekarte SHALL KEIN separater Aktions-Button gerendert werden. Die Analyse SHALL ausschließlich über die primäre Navigationsschaltfläche der Fußleiste („Rezept analysieren“) ausgelöst werden. Nach erfolgreicher Analyse SHALL der Wizard automatisch zu Schritt 2 („Basis & Portionen“) weiterschalten.

#### Scenario: Authentifizierter Nutzer öffnet die Erstellungsseite
- **WHEN** ein authentifizierter Nutzer `/recipes/new` aufruft
- **THEN** SHALL genau ein Eingabefeld für URL, Rezepttext oder Idee angezeigt werden
- **THEN** SHALL keine Auswahlkarten für "Manuell", "Mit KI-Hilfe" oder "Von URL importieren" gerendert werden
- **THEN** SHALL innerhalb der Eingabekarte kein zusätzlicher Analyse-Button gerendert werden
- **THEN** SHALL die primäre Navigationsschaltfläche in der Fußleiste als „Rezept analysieren“ beschriftet sein

#### Scenario: Nicht authentifizierter Nutzer öffnet die Erstellungsseite
- **WHEN** ein nicht authentifizierter Nutzer `/recipes/new` aufruft
- **THEN** SHALL er zur Anmeldung geleitet werden
- **THEN** SHALL kein Rezept-Draft erzeugt werden

#### Scenario: Leere Eingabe blockiert die Analyse
- **WHEN** der Nutzer auf „Rezept analysieren“ ohne Text im Eingabefeld klickt
- **THEN** SHALL eine deutsche Hinweismeldung erscheinen
- **THEN** SHALL kein API-Aufruf erfolgen
- **THEN** SHALL der Wizard auf Schritt 1 verbleiben

#### Scenario: Erfolgreiche Analyse schaltet automatisch auf Schritt 2
- **WHEN** der Nutzer einen gültigen Link, Text oder eine Idee eingibt und auf „Rezept analysieren“ klickt
- **THEN** SHALL die Schaltfläche während der Verarbeitung als deaktiviert mit der Beschriftung „Analysiert…“ dargestellt werden
- **THEN** SHALL der Wizard nach erfolgreicher Antwort der Analyse unmittelbar auf Schritt 2 („Basis & Portionen“) wechseln, ohne dass ein weiterer Klick erforderlich ist
