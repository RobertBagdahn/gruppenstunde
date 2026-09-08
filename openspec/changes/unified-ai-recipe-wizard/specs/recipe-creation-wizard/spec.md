## MODIFIED Requirements

### Requirement: 5-Step Wizard Struktur
Der `RecipeWizard` SHALL aus fünf aufeinanderfolgenden Steps bestehen: (0) Smart-Eingabe, (1) Basis & Portionen, (2) Zutaten, (3) Zubereitung, (4) Vorschau & Speichern. Jeder Step SHALL einen "Weiter"-Button haben, der die Änderungen des aktuellen Steps via API persistiert und erst nach erfolgreichem Abschluss zum nächsten Step navigiert. Ein "Zurück"-Button SHALL zum vorherigen Step navigieren. Die Fertigstellung in Step 4 SHALL den Status gemäß der Sichtbarkeit des Rezepts behandeln. Jeder Step SHALL einen erklärenden deutschen Hilfetext anzeigen.

#### Scenario: Step-Navigation vorwärts
- **WHEN** der Nutzer auf "Weiter" klickt
- **THEN** werden alle Änderungen des aktuellen Steps via API gespeichert
- **THEN** wartet der Wizard auf den erfolgreichen Abschluss der Speicherung
- **THEN** navigiert der Wizard zum nächsten Step

#### Scenario: Step-Navigation bei Speichervorgang
- **WHEN** der Nutzer während einer laufenden Speicherung erneut auf "Weiter" klickt
- **THEN** wird keine zweite Speicherung gestartet
- **THEN** bleibt der bestehende Speichervorgang maßgeblich für die Navigation

#### Scenario: Step-Navigation rückwärts
- **WHEN** der Nutzer auf "Zurück" klickt
- **THEN** navigiert der Wizard zum vorherigen Step ohne ungespeicherte Änderungen stillschweigend zu verwerfen

#### Scenario: Step-Indikator
- **WHEN** der Wizard gerendert wird
- **THEN** eine visuelle Step-Anzeige (z.B. nummerierte Punkte) zeigt den aktuellen Fortschritt

#### Scenario: Hilfetext pro Step
- **WHEN** ein beliebiger Step aktiv ist
- **THEN** SHALL ein deutscher Hilfetext den Zweck des Steps erklären

### Requirement: Step 0 — Smart-Eingabe
Step 0 SHALL ein einzelnes Smart-Eingabefeld anbieten, das eine URL, einen kopierten Rezepttext oder eine Freitext-Idee entgegennimmt. Der Eingabetyp SHALL serverseitig erkannt werden. Eine Auswahl zwischen Erstellungsmethoden SHALL NICHT angeboten werden.

#### Scenario: Nutzer fügt eine Rezept-URL ein
- **WHEN** der Nutzer eine URL einfügt und die Analyse auslöst
- **THEN** SHALL das Backend die Seite abrufen und die Rezeptdaten extrahieren
- **THEN** SHALL bei Erfolg ein Draft erstellt werden und der Wizard zu Step 1 navigieren

#### Scenario: Nutzer fügt einen kopierten Rezepttext ein
- **WHEN** der Nutzer einen mehrzeiligen Rezepttext mit Mengenangaben einfügt und die Analyse auslöst
- **THEN** SHALL das Backend Zutaten und Schritte aus dem Text extrahieren
- **THEN** SHALL bei Erfolg ein Draft erstellt werden und der Wizard zu Step 1 navigieren

#### Scenario: Nutzer beschreibt eine Rezeptidee
- **WHEN** der Nutzer eine kurze Beschreibung wie "Käsespätzle für 4 Personen" eingibt und die Analyse auslöst
- **THEN** SHALL das Backend ein vollständiges Rezept generieren
- **THEN** SHALL bei Erfolg ein Draft erstellt werden und der Wizard zu Step 1 navigieren

#### Scenario: Analyse schlägt fehl
- **WHEN** die Analyse mit einem Fehler endet
- **THEN** SHALL eine verständliche deutsche Fehlermeldung angezeigt werden
- **THEN** SHALL der Nutzer in Step 0 bleiben und die Eingabe korrigieren können
- **THEN** SHALL kein unvollständiger Draft zurückbleiben

### Requirement: Step 2 — Zutaten
Step 2 SHALL den `InlineIngredientEditor` als integrierte Komponente darstellen. Die Mengen SHALL für die in Step 1 festgelegte Original-Personenzahl angezeigt werden. Positionen ohne aufgelöste Einheit SHALL hervorgehoben und vor dem Fortfahren geklärt werden.

#### Scenario: Vorausgefüllte Zutaten nach der Analyse
- **WHEN** der Nutzer Step 2 betritt
- **THEN** ist der Zutaten-Editor mit den analysierten Zutaten vorausgefüllt
- **THEN** der Nutzer kann Zutaten bearbeiten, hinzufügen oder entfernen

#### Scenario: Mengen im Kontext der Original-Personenzahl
- **WHEN** der Nutzer in Step 1 eine Original-Personenzahl festgelegt hat
- **THEN** SHALL der Editor die Gesamtmengen für diese Personenzahl anzeigen
- **THEN** SHALL beim Speichern auf eine Portion normiert werden

#### Scenario: Klärungsbedürftige Position blockiert das Fortfahren
- **WHEN** mindestens eine Zutat keine aufgelöste Einheit besitzt
- **THEN** SHALL der "Weiter"-Button die Navigation verhindern
- **THEN** SHALL eine deutsche Meldung die betroffenen Zutaten benennen

#### Scenario: Zutat per Suche ergänzen
- **WHEN** der Nutzer eine weitere Zutat hinzufügen möchte
- **THEN** stehen `IngredientAutocomplete` und `IngredientDetailSearchDialog` zur Verfügung

### Requirement: Step 3 — Metadaten und Zubereitung
Step 3 SHALL die Zubereitungsschritte sowie Schwierigkeit, Zubereitungszeit und Vorbereitungszeit zur Bearbeitung anbieten. Beim Fortfahren SHALL ausschließlich veränderter oder aus dem Rezept geladener Inhalt persistiert werden; uninitialisierte Standardwerte MUST NICHT gesendet werden.

#### Scenario: Zubereitung bearbeiten
- **WHEN** der Nutzer Zubereitungsschritte hinzufügt, ändert oder umsortiert
- **THEN** SHALL genau ein Batch-Update die Änderungen persistieren

#### Scenario: Vorhandene Inhalte bleiben ohne Eingabe erhalten
- **WHEN** der Nutzer Step 3 ohne jede Eingabe verlässt
- **THEN** SHALL die vorhandene Beschreibung des Rezepts unverändert bleiben
- **THEN** SHALL Schwierigkeit, Zubereitungszeit und Vorbereitungszeit unverändert bleiben

#### Scenario: Beschreibung als Markdown
- **WHEN** der Nutzer die Beschreibung bearbeitet
- **THEN** steht ein `MarkdownEditor` zur Verfügung
- **THEN** wird die Beschreibung als Markdown gespeichert

### Requirement: KI-gestützte Erstbefüllung über die Smart-Eingabe
Der Wizard SHALL die Smart-Eingabe in Step 0 nutzen, um einen vollständigen Draft mit Titel, Beschreibung, Rezept-Typ, Schwierigkeit, Dauer und Zutaten inklusive Portion-Matching zu erzeugen. Alle danach im Wizard vorgenommenen manuellen Änderungen SHALL beim Weitergehen und nach einem Reload erhalten bleiben.

#### Scenario: Analyse erstellt vollständigen Draft
- **WHEN** der Nutzer eine URL, einen Rezepttext oder eine Beschreibung eingibt und die Analyse auslöst
- **THEN** SHALL ein Draft mit Titel, recipe_type, difficulty, execution_time und recipe_items entstehen
- **THEN** SHALL der Draft mit Status `draft` gespeichert werden
- **THEN** SHALL der Wizard zu Step 1 navigieren

#### Scenario: Draft wird manuell angepasst
- **WHEN** der Nutzer Zutaten, Metadaten oder Zubereitung des Drafts ändert und den jeweiligen Step verlässt
- **THEN** werden die manuellen Änderungen via API gespeichert
- **THEN** überschreibt kein späterer Query-Refresh die manuellen Änderungen

#### Scenario: Draft bleibt nach Fertigstellung bearbeitbar
- **WHEN** der Nutzer den Wizard abschließt und die Detailseite öffnet
- **THEN** SHALL `can_edit` für den Ersteller wahr sein
- **THEN** SHALL Zutaten und Zubereitung inline bearbeitbar sein

### Requirement: Recipe creation import paths are deterministic and complete
Der vereinheitlichte Erstellungsweg SHALL editierbare Zutaten, Metadaten, Zubereitungsschritte, Portionssemantik und Quellenangaben über Fertigstellung und Reload hinweg erhalten. Dies gilt gleichermaßen für die Eingabetypen URL, Rezepttext und Freitext-Idee.

#### Scenario: Draft aus Freitext-Idee unterstützt manuelle Anpassungen
- **WHEN** ein deterministischer Draft aus einer Freitext-Idee erzeugt wurde und der Nutzer Zutaten oder Zubereitung ändert
- **THEN** SHALL die manuellen Änderungen persistiert und nicht durch veraltete KI-Antwortdaten ersetzt werden

#### Scenario: URL-Eingabe erhält Quellenangaben
- **WHEN** eine deterministische URL-Analyse bestätigt wurde
- **THEN** SHALL das erzeugte Rezept Quell-URL, unterstützte Tags, erkannte Portionssemantik, importierte Positionen und importierte Zubereitungsschritte behalten

#### Scenario: Fehlgeschlagene Analyse erzeugt kein Teilrezept
- **WHEN** die Analyse einen klassifizierten Quellen- oder Verarbeitungsfehler zurückgibt
- **THEN** SHALL die Oberfläche den zugeordneten deutschen Fehler anzeigen
- **THEN** SHALL nicht zu einem teilweise erstellten Rezept navigiert werden

## REMOVED Requirements

### Requirement: Step 1 — Zutaten (InlineIngredientEditor)
**Reason**: Der Zutatenschritt wandert von Position 1 auf Position 2, weil die Original-Personenzahl nun im vorgelagerten Schritt "Basis & Portionen" festgelegt wird. Titel und Rezept-Typ werden ebenfalls dorthin verschoben. Die neue Fassung ist als "Step 2 — Zutaten" spezifiziert.

**Migration**: Keine Datenmigration nötig. Die Anforderung ist durch "Step 2 — Zutaten" ersetzt.

### Requirement: Step 2 — Metadaten
**Reason**: Der Metadatenschritt entfällt als eigenständiger Schritt. Titel, Rezept-Typ und Sichtbarkeit wandern in "Basis & Portionen" beziehungsweise in die Vorschau; Beschreibung, Schwierigkeit und Zeiten werden mit der Zubereitung zusammengelegt. Die bisherige Fassung sendete zudem uninitialisierte Leerwerte und löschte damit vorhandene Inhalte.

**Migration**: Keine Datenmigration nötig. Die Anforderung ist durch "Step 3 — Metadaten und Zubereitung" ersetzt.
