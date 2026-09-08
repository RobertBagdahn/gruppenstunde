# unified-recipe-creation Specification

## Purpose
Einheitlicher KI-gestützter Erstellungsweg für Rezepte mit Smart-Eingabe, serverseitiger Quellenerkennung, Grounding-Fallback und einem fünfstufigen Wizard.

## Requirements

### Requirement: Einheitliches Smart-Eingabefeld als einziger Einstieg
Die Rezepterstellung unter `/recipes/new` SHALL genau einen Einstiegspunkt anbieten: ein einzelnes Smart-Eingabefeld, das eine URL, einen kopierten Rezepttext oder eine Freitext-Idee entgegennimmt. Eine Auswahl zwischen Erstellungsmethoden SHALL NICHT mehr angezeigt werden.

#### Scenario: Authentifizierter Nutzer öffnet die Erstellungsseite
- **WHEN** ein authentifizierter Nutzer `/recipes/new` aufruft
- **THEN** SHALL genau ein Eingabefeld für URL, Rezepttext oder Idee angezeigt werden
- **THEN** SHALL keine Auswahlkarten für "Manuell", "Mit KI-Hilfe" oder "Von URL importieren" gerendert werden

#### Scenario: Nicht authentifizierter Nutzer öffnet die Erstellungsseite
- **WHEN** ein nicht authentifizierter Nutzer `/recipes/new` aufruft
- **THEN** SHALL er zur Anmeldung geleitet werden
- **THEN** SHALL kein Rezept-Draft erzeugt werden

#### Scenario: Leere Eingabe blockiert die Analyse
- **WHEN** der Nutzer die Analyse ohne Eingabe auslöst
- **THEN** SHALL eine deutsche Hinweismeldung erscheinen
- **THEN** SHALL kein API-Aufruf erfolgen

### Requirement: Serverseitige Erkennung des Eingabetyps
Das Backend SHALL den Typ der Smart-Feld-Eingabe bestimmen und daraus den Verarbeitungspfad ableiten. Das Frontend SHALL keine eigene Typerkennung durchführen.

#### Scenario: Eingabe ist eine URL
- **WHEN** die Eingabe mit `http://` oder `https://` beginnt
- **THEN** SHALL das Backend den URL-Importpfad verwenden
- **THEN** SHALL die Antwort den erkannten Eingabetyp als `url` ausweisen

#### Scenario: Eingabe ist ein kopierter Rezepttext
- **WHEN** die Eingabe mehrzeilig ist und Mengenangaben enthält
- **THEN** SHALL das Backend die Zutaten und Schritte aus dem Text extrahieren
- **THEN** SHALL die Antwort den erkannten Eingabetyp als `text` ausweisen

#### Scenario: Eingabe ist eine kurze Idee
- **WHEN** die Eingabe weder URL noch strukturierter Rezepttext ist
- **THEN** SHALL das Backend ein Rezept per KI-Generierung erzeugen
- **THEN** SHALL die Antwort den erkannten Eingabetyp als `prompt` ausweisen

#### Scenario: Alle Pfade liefern dieselbe Ergebnisstruktur
- **WHEN** ein beliebiger Eingabetyp verarbeitet wurde
- **THEN** SHALL die Antwort dieselben Felder für Metadaten, Zutaten und Zubereitungsschritte enthalten
- **THEN** SHALL der Wizard ohne pfadabhängige Sonderbehandlung fortfahren können

### Requirement: KI-Websuche als Rückfallebene bei blockierter Quelle
Kann eine Rezeptseite nicht abgerufen werden, SHALL das System die Rezeptdaten über Gemini mit Google Search Grounding aus der URL rekonstruieren, bevor es einen Fehler meldet. Der Ursprung der Daten SHALL im Ergebnis gekennzeichnet werden.

#### Scenario: Direkter Abruf schlägt fehl, Grounding gelingt
- **WHEN** der direkte Seitenabruf mit einem Quellenfehler endet
- **THEN** SHALL das System einen Grounding-gestützten Rekonstruktionsversuch unternehmen
- **THEN** SHALL das Ergebnis als rekonstruiert gekennzeichnet werden
- **THEN** SHALL der Wizard einen deutschen Hinweis anzeigen, dass die Daten geprüft werden sollten

#### Scenario: Auch das Grounding liefert kein Rezept
- **WHEN** weder direkter Abruf noch Grounding verwertbare Rezeptdaten liefern
- **THEN** SHALL das System HTTP 422 mit einer deutschen Fehlermeldung zurückgeben
- **THEN** SHALL kein Rezept-Draft angelegt werden

#### Scenario: Direkter Abruf gelingt
- **WHEN** der direkte Seitenabruf verwertbare Rezeptdaten liefert
- **THEN** SHALL kein Grounding-Aufruf erfolgen
- **THEN** SHALL das Ergebnis nicht als rekonstruiert gekennzeichnet werden

### Requirement: Fünfschrittiger Wizard mit Hilfetexten
Der Wizard SHALL aus fünf Schritten bestehen: Smart-Eingabe, Basis und Portionen, Zutaten, Zubereitung, Vorschau. Jeder Schritt SHALL einen erklärenden deutschen Hilfetext anzeigen.

#### Scenario: Fortschrittsanzeige zeigt fünf Schritte
- **WHEN** der Wizard gerendert wird
- **THEN** SHALL eine Fortschrittsanzeige mit fünf Schritten sichtbar sein
- **THEN** SHALL der aktive Schritt hervorgehoben sein

#### Scenario: Jeder Schritt erklärt seinen Zweck
- **WHEN** ein beliebiger Schritt aktiv ist
- **THEN** SHALL ein deutscher Hilfetext den Zweck des Schritts erklären

#### Scenario: Mobile Darstellung ab 320px
- **WHEN** der Wizard mit einer Viewport-Breite von 320px gerendert wird
- **THEN** SHALL die Fortschrittsanzeige ohne horizontales Scrollen lesbar bleiben
- **THEN** SHALL die Navigationsschaltflächen erreichbar bleiben

### Requirement: Original-Personenzahl im Schritt Basis und Portionen
Der Wizard SHALL die Personenzahl des Originalrezepts im Schritt "Basis und Portionen" abfragen, bevor Zutatenmengen angezeigt werden. Ein Hilfetext SHALL erklären, dass Mengen intern auf eine Portion normiert werden.

#### Scenario: Erkannte Personenzahl wird vorbelegt
- **WHEN** die Analyse eine Personenzahl erkannt hat
- **THEN** SHALL dieser Wert im Eingabefeld vorbelegt sein
- **THEN** SHALL der Nutzer ihn ändern können

#### Scenario: Keine Personenzahl erkannt
- **WHEN** die Analyse keine Personenzahl erkannt hat
- **THEN** SHALL der Nutzer zur Eingabe aufgefordert werden
- **THEN** SHALL der Schritt ohne Eingabe nicht verlassen werden können

#### Scenario: Hilfetext erklärt die Normierung
- **WHEN** der Schritt "Basis und Portionen" aktiv ist
- **THEN** SHALL ein deutscher Hilfetext erklären, dass Mengen intern auf eine Portion normiert werden, damit Rezepte in der Planung skaliert werden können

### Requirement: Deeplink mit vorausgewählter Zutat
Ruft ein Nutzer `/recipes/new` mit dem Query-Parameter `ingredient` auf, SHALL der Wizard diese Zutat als Ausgangspunkt berücksichtigen.

#### Scenario: Gültiger Zutaten-Slug im Deeplink
- **WHEN** ein Nutzer `/recipes/new?ingredient=<slug>` mit einem existierenden Slug aufruft
- **THEN** SHALL die Zutat im Smart-Feld oder im Zutatenschritt als Ausgangspunkt vorbelegt sein

#### Scenario: Unbekannter Zutaten-Slug im Deeplink
- **WHEN** der übergebene Slug zu keiner sichtbaren Zutat gehört
- **THEN** SHALL der Wizard ohne Vorbelegung starten
- **THEN** SHALL kein Fehler angezeigt werden
