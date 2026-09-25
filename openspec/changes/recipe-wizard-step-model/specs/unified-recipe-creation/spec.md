## MODIFIED Requirements

### Requirement: Einheitliches Smart-Eingabefeld als einziger Einstieg
Die Rezepterstellung unter `/recipes/new` SHALL als Haupteinstieg ein einzelnes Smart-Eingabefeld anbieten, das eine URL, einen kopierten Rezepttext oder eine Freitext-Idee entgegennimmt. Eine Auswahl zwischen Erstellungsmethoden (Karten) SHALL NICHT angezeigt werden. Unterhalb des Eingabefelds SHALL ein unauffälliger Textlink „Ohne KI manuell beginnen“ angezeigt werden, der die Analyse überspringt und direkt zu Schritt 2 („Basis & Portionen“) ohne Vorbelegung wechselt. Innerhalb der Eingabekarte SHALL KEIN separater Analyse-Button gerendert werden. Die Analyse SHALL ausschließlich über die primäre Navigationsschaltfläche der Fußleiste („Rezept analysieren“) ausgelöst werden. Nach erfolgreicher Analyse SHALL der Wizard automatisch zu Schritt 2 („Basis & Portionen“) weiterschalten.

#### Scenario: Authentifizierter Nutzer öffnet die Erstellungsseite
- **WHEN** ein authentifizierter Nutzer `/recipes/new` aufruft
- **THEN** SHALL genau ein Eingabefeld für URL, Rezepttext oder Idee angezeigt werden
- **THEN** SHALL keine Auswahlkarten für "Manuell", "Mit KI-Hilfe" oder "Von URL importieren" gerendert werden
- **THEN** SHALL der Textlink „Ohne KI manuell beginnen“ sichtbar sein
- **THEN** SHALL innerhalb der Eingabekarte kein zusätzlicher Analyse-Button gerendert werden
- **THEN** SHALL die primäre Navigationsschaltfläche in der Fußleiste als „Rezept analysieren“ beschriftet sein

#### Scenario: Nicht authentifizierter Nutzer öffnet die Erstellungsseite
- **WHEN** ein nicht authentifizierter Nutzer `/recipes/new` aufruft
- **THEN** SHALL er zur Anmeldung geleitet werden
- **THEN** SHALL kein Rezept-Draft erzeugt werden

#### Scenario: Leere Eingabe blockiert die Analyse
- **WHEN** der Nutzer auf „Rezept analysieren“ ohne Text im Eingabefeld klickt
- **THEN** SHALL eine deutsche Hinweismeldung erscheinen, die auch auf „Ohne KI manuell beginnen“ verweist
- **THEN** SHALL kein API-Aufruf erfolgen
- **THEN** SHALL der Wizard auf Schritt 1 verbleiben

#### Scenario: Manueller Einstieg
- **WHEN** der Nutzer auf „Ohne KI manuell beginnen“ klickt
- **THEN** SHALL kein KI-Aufruf erfolgen
- **THEN** SHALL der Wizard Schritt 2 („Basis & Portionen“) mit leerem Titel, ohne Rezepttyp und ohne Personenzahl anzeigen

#### Scenario: Erfolgreiche Analyse schaltet automatisch auf Schritt 2
- **WHEN** der Nutzer einen gültigen Link, Text oder eine Idee eingibt und auf „Rezept analysieren“ klickt
- **THEN** SHALL die Schaltfläche während der Verarbeitung als deaktiviert mit der Beschriftung „Analysiert…“ dargestellt werden
- **THEN** SHALL der Wizard nach erfolgreicher Antwort der Analyse unmittelbar auf Schritt 2 („Basis & Portionen“) wechseln, ohne dass ein weiterer Klick erforderlich ist

### Requirement: Fünfschrittiger Wizard mit Hilfetexten
Der Wizard SHALL aus folgenden Schritten in dieser Reihenfolge bestehen: Eingabe, Basis & Portionen, Zutaten prüfen (nur wenn die Analyse Zutaten geliefert hat), Zutaten, Materialien, Zubereitung, Vorschau. Jeder Schritt SHALL einen erklärenden deutschen Hilfetext anzeigen.

#### Scenario: Fortschrittsanzeige zeigt sichtbare Schritte
- **WHEN** der Wizard gerendert wird
- **THEN** SHALL eine Fortschrittsanzeige mit allen sichtbaren Schritten angezeigt werden (sechs ohne, sieben mit „Zutaten prüfen“)
- **THEN** SHALL der aktive Schritt hervorgehoben sein

#### Scenario: Jeder Schritt erklärt seinen Zweck
- **WHEN** ein beliebiger Schritt aktiv ist
- **THEN** SHALL ein deutscher Hilfetext den Zweck des Schritts erklären

#### Scenario: Mobile Darstellung ab 320px
- **WHEN** der Wizard mit einer Viewport-Breite von 320px gerendert wird
- **THEN** SHALL die Fortschrittsanzeige ohne horizontales Scrollen lesbar bleiben
- **THEN** SHALL die Navigationsschaltflächen erreichbar bleiben
