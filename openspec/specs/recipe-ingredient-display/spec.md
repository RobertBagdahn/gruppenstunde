### Requirement: Zutaten-Sektions-Icon ist UtensilsCrossed
Der Zutaten-Abschnitt auf der Rezept-Detailseite und allen Rezept-Vorschau-Ansichten SHALL das Lucide-Icon `UtensilsCrossed` anstelle von `egg_alt` (Material Symbols) verwenden.

#### Scenario: Icon wird auf RecipeDetailPage angezeigt
- **WHEN** ein Nutzer eine Rezept-Detailseite aufruft
- **THEN** zeigt der Zutaten-Header das `UtensilsCrossed`-Icon aus der Lucide-Bibliothek

#### Scenario: Icon ist konsistent in allen Rezept-Ansichten
- **WHEN** die Zutatenliste in RecipePreviewDialog oder Planungs-Ansichten gerendert wird
- **THEN** wird ebenfalls `UtensilsCrossed` verwendet

---

### Requirement: Anzahl-Badge zeigt Text "N Zutaten"
Der Badge neben dem "Zutaten"-Titel SHALL die Anzahl der Zutaten zusammen mit dem Wort "Zutaten" anzeigen (z.B. `4 Zutaten`), nicht nur die nackte Zahl.

#### Scenario: Badge mit mehreren Zutaten
- **WHEN** ein Rezept 4 Zutaten hat
- **THEN** zeigt der Badge den Text `4 Zutaten`

#### Scenario: Badge mit einer Zutat
- **WHEN** ein Rezept genau 1 Zutat hat
- **THEN** zeigt der Badge den Text `1 Zutaten` (einheitliches Format, kein Singular)

#### Scenario: Badge fehlt bei leerer Liste
- **WHEN** ein Rezept keine Zutaten hat
- **THEN** wird kein Badge angezeigt

---

### Requirement: Primäre Portionsanzeige nach höchstem Priority-Ranking
Die Zutatenliste SHALL die Portion mit dem höchsten `priority`-Wert, die keine Gramm-Einheit ist, als Primäranzeige verwenden.

#### Scenario: Zutat mit nicht-Gramm-Portion hoher Priorität
- **WHEN** ein Apfel die Portionen `[{name: "Stück", priority: 10, weight_g: 150}, {name: "100g", priority: 0, weight_g: 100}]` hat
- **THEN** wird `1 Stück` als Primäranzeige gezeigt

#### Scenario: Zutat hat nur Gramm-Portionen
- **WHEN** Butter nur Gramm-basierte Portionen hat, aber eine `EL`-Portion mit `priority: 5`
- **THEN** wird die `EL`-Portion mit höchster Priorität als Sekundäranzeige gezeigt

#### Scenario: Kein alternativer Portion-Display bei fehlendem weight_g
- **WHEN** eine nicht-Gramm-Portion `weight_g: null` hat
- **THEN** wird diese Portion für die Anzeige übersprungen

---

### Requirement: Gramm-Menge immer als Sekundäranzeige bei nicht-Gramm-Primäranzeige
Wenn die Primäranzeige einer Zutat eine nicht-Gramm-Einheit ist, SHALL das Gramm-Gewicht als Sekundäranzeige in einer zweiten Zeile erscheinen.

#### Scenario: Apfel mit Stück als Primäranzeige
- **WHEN** ein Apfel `1 Stück` als Primäranzeige hat und `weight_g = 150`
- **THEN** zeigt die Sekundärzeile `150 g`

#### Scenario: Reine Gramm-Zutat ohne nicht-Gramm-Portion
- **WHEN** Salz nur eine Gramm-Portion hat und keine priorisierten Alternativ-Portionen
- **THEN** wird keine Sekundärzeile angezeigt

---

### Requirement: Mengen-Ampel bei statistisch ungewöhnlichen Mengen
Die Zutatenliste SHALL eine subtile visuelle Warnung zeigen, wenn eine Zutat im Verhältnis zum Gesamtgewicht des Rezepts oder zu plausiblen Normwerten auffällig viel oder wenig ist.

#### Scenario: Ungewöhnlich hoher Anteil am Rezeptgewicht
- **WHEN** eine einzelne Zutat mehr als 70% des Gesamtgewichts des Rezepts ausmacht
- **THEN** wird ein ⚠️-Warnzeichen neben der Zeile angezeigt

#### Scenario: Normale Mengen — keine Warnung
- **WHEN** alle Zutaten plausible Gewichtsanteile haben
- **THEN** werden keine Warnzeichen angezeigt

#### Scenario: Kein Gesamtgewicht verfügbar
- **WHEN** das Rezept noch kein berechnetes Gesamtgewicht hat (weight_g = 0)
- **THEN** wird keine Ampel-Logik angewendet

---

### Requirement: Stück-zu-Gramm-Anzeige mit Multiplikationszeichen

Die Anzeige einer Rezeptzutat mit Stückeinheit (z.B. Zwiebel: 1 Stück = 40g) SHALL das korrekte Multiplikationszeichen (×) verwenden. Das Gleichheitszeichen (=) als Operator ist verboten.

#### Scenario: Halbe Stückzahl mit Gramm-Äquivalent

- **WHEN** eine Rezeptzutat „0,5 Stück Zwiebel (40g pro Stück)" angezeigt wird
- **THEN** wird dargestellt: `0,5 × 40g = 20g`
- **THEN** wird NICHT dargestellt: `0,5 = 40g` oder `0,5 = 20g`

#### Scenario: Ganze Stückzahl

- **WHEN** eine Rezeptzutat „2 Stück Zwiebel (40g pro Stück)" angezeigt wird
- **THEN** wird dargestellt: `2 × 40g = 80g`

#### Scenario: Gramm-Berechnung korrekt

- **WHEN** 0,5 Stück einer Zutat mit 40g pro Stück angezeigt wird
- **THEN** ist das angezeigte Gramm-Äquivalent 20g (0,5 × 40g)
- **THEN** wird NICHT ein falscher Wert angezeigt

### Requirement: Preis-Bezugseinheit eindeutig beschriftet

Das Preiseingabe-Feld für Zutaten SHALL eindeutig als „Preis pro kg" beschriftet sein.

#### Scenario: Preis-Label im Zutat-Formular

- **WHEN** ein Nutzer eine Zutat anlegt oder bearbeitet
- **THEN** ist das Preisfeld mit „Preis pro kg" beschriftet
- **THEN** gibt es keinen Zweifel ob der Preis pro 100g oder pro kg gilt

### Requirement: Nährwertanalyse ausschließlich pro 100g auf Rezeptdetailseite

Alle Gesundheitsanalysen und Einordnungsbalken auf der Rezeptdetailseite SHALL ausschließlich pro-100g-Werte verwenden. Absolute Werte werden in der Analyse nicht gezeigt. Dies ist konsistent mit dem Nutri-Score der ebenfalls pro 100g bewertet.

#### Scenario: Einordnungsbalken nach Portionsänderung

- **WHEN** der Nutzer die Portionszahl auf 4 ändert
- **THEN** ändern sich die Einordnungsbalken (Protein-Ranking, Preis-Ranking etc.) NICHT
- **THEN** bleiben alle Analysen auf pro-100g-Basis

#### Scenario: Gesundheits-Score pro 100g

- **WHEN** der Gesundheits-Score eines Rezepts angezeigt wird
- **THEN** basiert er auf dem Nährwertprofil pro 100g
- **THEN** ist die Basis „pro 100g" sichtbar beschriftet
