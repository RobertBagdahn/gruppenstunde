## ADDED Requirements

### Requirement: Zentrales Formatierungsmodul
Das Food-Frontend MUST alle angezeigten Zahlen, Beträge, Gewichte und Zähler über `frontend-food/src/lib/format.ts` formatieren. Das Modul SHALL `Intl.NumberFormat('de-DE')` verwenden und mindestens bereitstellen: `formatNumber(value, {maxDecimals})`, `formatEuro(value)`, `formatWeight(grams)`, `formatExactWeight(grams)`, `formatCount(count)`, `plural(count, singular, pluralForm)`. Ganzzahlen MUST ohne Nachkommastellen erscheinen („15“ statt „15.0“).

#### Scenario: Personenzahl
- **WHEN** `formatNumber(15)` aufgerufen wird
- **THEN** ist das Ergebnis „15“

#### Scenario: Betrag
- **WHEN** `formatEuro(0.47)` aufgerufen wird
- **THEN** ist das Ergebnis „0,47 €“

#### Scenario: Große Zahl
- **WHEN** `formatNumber(5918)` aufgerufen wird
- **THEN** ist das Ergebnis „5.918“

### Requirement: Pluralisierung
Zähler mit Substantiv MUST über `plural()` mit explizit gepflegtem Singular und Plural gebildet werden. Komponenten, die ein Zähler-Label entgegennehmen (z. B. `ListPageHero`), MUST Singular und Plural getrennt erhalten.

#### Scenario: Rezeptliste
- **WHEN** die Rezeptliste 270 Treffer hat
- **THEN** zeigt der Kopf „270 Rezepte“

#### Scenario: Ein Plan
- **WHEN** genau ein Essensplan existiert
- **THEN** zeigt der Kopf „1 Plan“, bei 17 Plänen „17 Pläne“

### Requirement: Keine lokalen Zahlenformatierungen
In `.tsx`-Dateien des Food-Frontends SHALL kein `toFixed()` und kein lokal definiertes `formatPrice`/`formatNumber` verwendet werden. Eine ESLint-Regel (`no-restricted-syntax`) MUST `toFixed` in `.tsx` als Fehler melden.

#### Scenario: Neuer Code mit toFixed
- **WHEN** eine `.tsx`-Datei `value.toFixed(2)` enthält
- **THEN** schlägt `npm run lint` fehl

### Requirement: Backend liefert Zahlen statt Anzeigetexten
Für Einkaufslisten-, Essensplan- und Portionsanzeigen MUST die API strukturierte Werte liefern statt fertig formatierter Texte:
- Gesamtmenge in Gramm bzw. Milliliter,
- bestes Stück-Äquivalent als `{count, portion_name}`,
- Packungsoptionen als `{count, package_name, weight_g}`.

Die Felder `display_quantity`, `natural_portions`, `portion_display` und `display` der Portionsoptionen SHALL entfallen; das Frontend formatiert. Die PDF-Ausgabe des Backends DARF weiterhin serverseitig formatieren und MUST dabei dieselben Regeln wie das Frontend anwenden.

#### Scenario: Einkaufsposten mit Stück-Äquivalent
- **WHEN** die API einen Einkaufsposten mit 320 g Brühpulver und Portion „TL“ (5 g) liefert
- **THEN** enthält die Antwort `quantity_g: 320` und `piece_equivalent: {count: 64.0, portion_name: "TL"}`
- **AND** die UI zeigt „320 g · ≈ 64 TL“
