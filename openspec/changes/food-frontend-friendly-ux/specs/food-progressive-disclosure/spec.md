## ADDED Requirements

### Requirement: Detailseiten zeigen zuerst eine Zusammenfassung
Die Detailseiten für Zutaten und Rezepte SHALL oben eine kompakte Zusammenfassung zeigen und alle weiteren Informationen in klappbaren Abschnitten (`CollapsibleSection`) darunter anordnen. Die Zusammenfassung einer Zutat MUST Name, Nutri-Score, Preis, Energie, Eiweiß, Fett, Kohlenhydrate und die Standard-Portion enthalten. Die Zusammenfassung eines Rezepts MUST Kosten pro Portion, Nutri-Score, Zeit und Schwierigkeit enthalten. Abschnitte SHALL standardmäßig eingeklappt sein, ausgenommen Zutaten und Zubereitung auf der Rezeptseite sowie Portionen auf der Zutatenseite. Der Auf-/Zu-Zustand MUST pro Abschnittstyp im `localStorage` gemerkt werden; ohne Speicher gilt der Standard.

#### Scenario: Zutat öffnen
- **GIVEN** ein anonymer oder angemeldeter Nutzer
- **WHEN** er `/ingredients/jodsalz-1` öffnet
- **THEN** sieht er oben Name, Nutri-Score, Preis, vier Kernnährwerte und die Standard-Portion, darunter Portionen ausgeklappt und „Alle Nährwerte“, „Bewertungen“, „Physik & Lager“, „Packungen“ und „Verwendet in“ eingeklappt mit einer Kurzinfo in der Kopfzeile (z. B. „12 Rezepte“)

#### Scenario: Zustand wird gemerkt
- **WHEN** der Nutzer „Alle Nährwerte“ aufklappt und eine andere Zutat öffnet
- **THEN** ist „Alle Nährwerte“ dort ebenfalls aufgeklappt

### Requirement: Reduzierte Zutatenzeilen im Rezept
Zutatenzeilen auf der Rezept-Detailseite SHALL standardmäßig nur Menge, Name und Nutri-Score zeigen. Abteilung, Mengenanteil, Preis pro kg und Kostenanteil MUST über einen Schalter „Details“ für alle Zeilen oder durch Antippen einer Zeile für diese Zeile sichtbar werden. Der Schalterzustand MUST im URL-State (`ingredient_view=details`) stehen.

#### Scenario: Rezept öffnen
- **WHEN** ein Nutzer `/recipes/porridge` öffnet
- **THEN** zeigt jede Zutatenzeile „60 g Bananen“ und den Nutri-Score, ohne Prozent- und Preisangaben

#### Scenario: Details einblenden
- **WHEN** der Nutzer „Details“ aktiviert
- **THEN** zeigt jede Zeile zusätzlich Abteilung, Mengenanteil, €/kg und Kostenanteil

### Requirement: Leere Werte werden ausgeblendet
Kennzahlen-Listen (Nährwerte, Scores, Physik, Lager) SHALL Zeilen ohne Wert nicht als „—“ anzeigen. Stattdessen MUST am Ende des Abschnitts ein Hinweis „N Werte fehlen“ stehen; für Nutzer mit Bearbeitungsrecht ist er ein Link „N Werte fehlen – ergänzen“ zur Bearbeitung.

#### Scenario: Zutat ohne Scores
- **GIVEN** eine Zutat hat nur den Nutri-Score, alle anderen Scores sind leer
- **WHEN** der Nutzer „Bewertungen“ aufklappt
- **THEN** sieht er nur die Zeile Nutri-Score und darunter „5 Werte fehlen“

#### Scenario: Bearbeiter sieht Ergänzen-Link
- **GIVEN** ein angemeldeter Nutzer mit Bearbeitungsrecht
- **WHEN** er denselben Abschnitt öffnet
- **THEN** ist der Hinweis ein Link „5 Werte fehlen – ergänzen“ zur Bearbeiten-Seite

### Requirement: Gestufte Filter in Listen
Listenseiten SHALL höchstens drei Filtergruppen direkt sichtbar zeigen (Rezepte: Typ, Anzeigen, Dauer; Zutaten: Abteilung, Status, Herkunft – lange Abteilungslisten zeigen zuerst sechs Einträge und „Alle N Abteilungen anzeigen“; Essenspläne: Zeitraum, Herkunft). Weitere Filter MUST unter „Weitere Filter“ eingeklappt liegen. Ist ein eingeklappter Filter aktiv, MUST „Weitere Filter“ die Anzahl aktiver Filter zeigen und beim Laden aufgeklappt sein; aktive Filter MUST als entfernbare Chips oben in der Filterleiste stehen, und über der Ergebnisliste steht „N Filter aktiv · Zurücksetzen“. Der Filterzustand bleibt im URL-State.

#### Scenario: Aktiver versteckter Filter
- **WHEN** der Nutzer in der Rezeptliste unter „Weitere Filter“ die Schwierigkeit „Einfach“ wählt und den Bereich zuklappt
- **THEN** zeigt der Knopf „Weitere Filter (1)“ und über der Ergebnisliste steht „1 Filter aktiv · Zurücksetzen“
