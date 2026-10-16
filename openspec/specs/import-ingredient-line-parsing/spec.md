# Import Ingredient Line Parsing Specification

## Purpose
Structured parsing of recipe ingredient lines during import: units and plural spellings, sizes, specifiers, ranges, compound splitting and default amounts for "nach Belieben".

## Requirements
### Requirement: Einheiten- und Mengenwort-Lexikon
Der Zeilen-Parser SHALL Einheiten einschließlich Chefkoch-Pluralformen erkennen und vom Namen trennen: `g`, `kg`, `ml`, `l`/`Liter`, `EL`, `TL` (auch „TL, gehäuft“, „EL, gestr.“), `Msp.`, `Prise(n)`, `Pck.`/`Päckchen`/`Packung`, `Dose(n)`, `Glas`, `Becher`, `Bund`, `Zehe/n`, `Zweig/e`, `Stange/n`, `Knolle/n`, `Stiel(e)`, `Stängel`, `Blatt`/`Blätter`, `Topf`, `Scheibe(n)`, `Stück`. Mengenwörter `n. B.`, `nach Belieben`, `etwas`, `einige`, `evtl.` MUST als „Menge nach Belieben“ erkannt werden. Größenangaben `klein`, `m.-groß`/`mittelgroß`, `groß` MUST als Größe erfasst werden.

#### Scenario: Pluralform der Einheit
- **WHEN** die Zeile `15 Zehe/n Knoblauch` lautet
- **THEN** ist Menge 15, Einheit `Zehe`, Name `Knoblauch`

#### Scenario: Mengenwort ohne Zahl
- **WHEN** die Zeile `n. B. Oregano` lautet
- **THEN** ist der Name `Oregano` und die Menge „nach Belieben“

#### Scenario: Größe
- **WHEN** die Zeile `3 große Zwiebel(n)` lautet
- **THEN** ist Menge 3, Name `Zwiebel`, Größe `groß`

### Requirement: Bereiche, Zirka und „Name: Menge“
Der Parser SHALL Mengenbereiche (`60–80`, `60-80`, `2 - 3`) auf den Mittelwert abbilden, `ca.`/`circa`/`etwa` ignorieren und das Format `Name: Menge Einheit` erkennen.

#### Scenario: Eingefügter Text mit Bereich
- **WHEN** die Zeile `Frischer Ingwer: ca. 60–80 g` lautet
- **THEN** ist Menge 70, Einheit `g`, Name `Ingwer`, Notiz `frisch`

### Requirement: Spezifizierer und Zusätze
Der Parser SHALL Inhalte in Klammern und nach Kommas klassifizieren: Spezifizierer (Farbe, Verarbeitungsform, Sorte, Fettstufe, Geschmack wie `rot`, `passierte`, `gemahlen`, `Trockenhefe`, `20 %`, `edelsüß`, `süß`) MUST Teil der Suchanfrage werden; Zusätze (Verwendung, Temperatur, Alternativen wie `für die Form`, `lauwarm`, `aus der Mühle`, `nach Wahl`, `oder Rohrzucker`) MUST in die Notiz.

#### Scenario: Nachgestelltes Adjektiv
- **WHEN** die Zeile `1 Dose Tomaten, passierte` lautet
- **THEN** lautet die Suchanfrage `passierte Tomaten`

#### Scenario: Klammer mit Sorte
- **WHEN** die Zeile `1 EL Hefe (Trockenhefe)` lautet
- **THEN** lautet die Suchanfrage `Trockenhefe`

#### Scenario: Klammer mit Zusatz
- **WHEN** die Zeile `75 ml Wasser (lauwarm)` lautet
- **THEN** lautet die Suchanfrage `Wasser` und die Notiz `lauwarm`

### Requirement: Kombizeilen werden geteilt
Eine Zeile der Form `X und Y` (auch `X & Y`) SHALL in zwei Zeilen geteilt werden, wenn X und Y jeweils einzeln einer Katalog-Zutat oder einem Alias entsprechen. Beide Zeilen MUST die Originalzeile als Quelle behalten.

#### Scenario: Salz und Pfeffer
- **WHEN** die Zeile `Salz und Pfeffer (schwarzer)` lautet
- **THEN** entstehen die Zeilen `Salz` und `Pfeffer (schwarzer)` mit derselben Quellzeile

#### Scenario: Kein Teilen eines Produktnamens
- **WHEN** die Zeile `Salz und Essig Chips` lautet und `Essig Chips` keine Zutat ist
- **THEN** bleibt die Zeile ungeteilt

### Requirement: Standardmengen „nach Belieben“
Für Mengen „nach Belieben“ SHALL das System eine Standardmenge vorbelegen: Salz, Pfeffer und andere Gewürze 1 Prise; Öl und Fett 1 EL; frische Kräuter 1 EL gehackt; sonst keine Menge. Jede so vorbelegte Menge MUST als geschätzt gekennzeichnet sein.

#### Scenario: Pfeffer ohne Menge
- **WHEN** die Zeile `Pfeffer (schwarz, gemahlen)` keine Menge hat
- **THEN** ist 1 Prise vorbelegt und als geschätzt markiert

#### Scenario: Öl nach Belieben
- **WHEN** die Zeile `n. B. Olivenöl` lautet
- **THEN** ist 1 EL vorbelegt und als geschätzt markiert

#### Scenario: Sonstiges ohne Menge
- **WHEN** die Zeile `Innereien (vom Hähnchen)` keine Menge hat
- **THEN** bleibt die Menge offen
