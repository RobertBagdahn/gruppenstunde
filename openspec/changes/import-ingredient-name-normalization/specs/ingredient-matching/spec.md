## ADDED Requirements

### Requirement: Zutatennamen werden vor dem Matching normalisiert
Das System SHALL Zutatennamen vor dem Matching normalisieren: Plural-Klammern (`(n)`, `(er)`, `(en)`, `(e)`, `(s)`) auflösen, Größen-Adjektive und Größenangaben in die Notiz verschieben und führende Mengenwörter mit Plural-Klammer entfernen. Der ursprüngliche Rohname MUST erhalten bleiben.

#### Scenario: Menge mit Plural-Klammer
- **WHEN** der Rohname `Prise(n) Salz` lautet
- **THEN** wird `Salz` zugeordnet
- **AND** der Treffer ist exakt, nicht „Offen“

#### Scenario: Plural-Klammer und Größe
- **WHEN** der Rohname `große Ei(er), Größe L` lautet
- **THEN** wird der Name zu `Ei` normalisiert
- **AND** „groß“ und „Größe L“ stehen in der Notiz

### Requirement: Kopfnomen-Treffer als Vorschlag
Findet die volle Bezeichnung keinen Treffer, SHALL das System den Kopf vor `,`, ` mit `, ` ohne ` und Klammern per exaktem Namen und Alias prüfen. Ein Treffer MUST als Vorschlag mit Status „zu prüfen“ geliefert werden, der Zusatz MUST in der Notiz erhalten bleiben, und das System MUST nicht still bestätigen.

#### Scenario: Zusatz „mit Kohlensäure“
- **WHEN** der Rohname `Mineralwasser mit Kohlensäure` lautet und die Zutat `Mineralwasser` existiert
- **THEN** ist `Mineralwasser` vorbelegt mit Status „zu prüfen“
- **AND** die Notiz enthält „mit Kohlensäure“

#### Scenario: Kein Teilwort-Treffer
- **WHEN** der Rohname `Kokosmilch` lautet
- **THEN** wird nicht auf `Milch` gekürzt

### Requirement: Klammer-Zusätze und Plural beim Kandidatenvergleich
Beim Vergleich mit vorhandenen Zutaten SHALL das System Klammer-Zusätze der Kandidatennamen ignorieren und regelmäßige Plurale gleichsetzen.

#### Scenario: Ei und Eier (Größe M)
- **WHEN** der normalisierte Name `Ei` lautet und `Eier (Größe M)` verifiziert existiert
- **THEN** ist `Eier (Größe M)` Treffer oder vorbelegter Vorschlag

### Requirement: Hinweistexte entsprechen der Trefferstärke
Das System SHALL den Hinweis „ausreichend hoch/ausreichend ähnlich“ nur ausgeben, wenn die Konfidenz mindestens `FUZZY_THRESHOLD` erreicht. In der Grauzone MUST der Text „ähnlich, bitte prüfen“ lauten.

#### Scenario: Konfidenz 0,44
- **WHEN** der beste Kandidat 0,44 erreicht
- **THEN** lautet der Hinweis „ähnlich, bitte prüfen“
