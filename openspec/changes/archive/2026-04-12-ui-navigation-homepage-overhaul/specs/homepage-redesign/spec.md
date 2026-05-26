## ADDED Requirements

### Requirement: Kategorien verlinken auf Tags
Die Kategorien-Section auf der Homepage MUSS auf Tag-basierte Filter verlinken statt auf Volltext-Suche. Jede Kategorie MUSS ein `tagSlug`-Feld haben, das auf den entsprechenden Tag in der Datenbank verweist.

#### Scenario: Kategorie-Link mit existierendem Tag
- **WHEN** ein Nutzer auf eine Kategorie klickt, die einen gültigen Tag-Slug hat
- **THEN** MUSS die Navigation zu `/search?tags=<tag-slug>` erfolgen

#### Scenario: Kategorie-Link ohne existierenden Tag
- **WHEN** ein Nutzer auf eine Kategorie klickt, deren Tag nicht existiert
- **THEN** MUSS die Navigation auf `/search?q=<kategorie-name>` als Fallback erfolgen

### Requirement: So funktioniert's Section entfernt
Die "So funktioniert's"-Section MUSS von der Homepage entfernt werden.

#### Scenario: Homepage ohne So funktioniert's
- **WHEN** ein Nutzer die Homepage besucht
- **THEN** DARF keine Section mit der Überschrift "So funktioniert's" sichtbar sein

### Requirement: Fun Facts Section entfernt
Die Fun-Facts-Section mit Fake-Statistiken (500+ Ideen, 1.200+ Pfadfinder, etc.) MUSS von der Homepage entfernt werden.

#### Scenario: Homepage ohne Fun Facts
- **WHEN** ein Nutzer die Homepage besucht
- **THEN** DARF kein Gradient-Banner mit statistischen Zahlen sichtbar sein

### Requirement: KI-Features Section entfernt
Die "KI-gestützte Features"-Section MUSS von der Homepage entfernt werden.

#### Scenario: Homepage ohne KI-Features
- **WHEN** ein Nutzer die Homepage besucht
- **THEN** DARF keine Section mit KI-Feature-Karten sichtbar sein

### Requirement: Kompakte Homepage-Struktur
Die Homepage MUSS folgende Sections in dieser Reihenfolge enthalten:
1. Hero (gekürzt, ohne Fake-Statistiken)
2. Module Overview (Gruppenstunden, Blog, Spiele, Rezepte)
3. Planungs-Tools (Aktionen, Gruppenstundenplan, Essensplan, Packlisten)
4. Kategorien (mit Tag-Links)
5. Neueste Inhalte (echte Daten via API)
6. Schnell loslegen (Erstellen-Links, zusammengeführt aus Create-CTA und Quick-Links)

#### Scenario: Homepage-Section-Reihenfolge
- **WHEN** ein Nutzer die Homepage lädt
- **THEN** MÜSSEN genau die 6 definierten Sections in der angegebenen Reihenfolge sichtbar sein
- **THEN** DÜRFEN keine weiteren Content-Sections existieren

### Requirement: Community & Groups gekürzt
Die Community-Section MUSS auf maximal eine Zeile mit Links gekürzt werden statt drei große Karten.

#### Scenario: Kompakte Community-Links
- **WHEN** ein Nutzer die Homepage sieht
- **THEN** MUSS die Community-Funktionalität (Gruppen, Personen, Dashboard) als kompakte Link-Zeile innerhalb einer bestehenden Section erscheinen, nicht als eigene große Section

### Requirement: Rezepte-Section gekürzt
Die "Rezepte & Zutatendatenbank"-Section MUSS auf ein kompaktes Format gekürzt werden.

#### Scenario: Kompakte Rezepte-Info
- **WHEN** ein Nutzer die Homepage sieht
- **THEN** MUSS die Rezepte-Funktionalität als Teil des Module-Overview oder als kompakte Zeile erscheinen, nicht als eigenständige große Section

### Requirement: Create-Sections zusammengeführt
Die "Du hast eine geniale Idee?"-Section und die "Schnell loslegen"-Section MÜSSEN zu einer einzigen "Schnell loslegen"-Section zusammengeführt werden.

#### Scenario: Einheitlicher Schnell-loslegen-Block
- **WHEN** ein Nutzer die Homepage besucht
- **THEN** MUSS es genau einen "Schnell loslegen"-Block geben mit Erstellen-Links für alle Content-Typen und Tools
- **THEN** MUSS "Aktion erstellen" als Option enthalten sein

### Requirement: Planungs-Tools Section enthält Aktionen
Die Planungs-Tools Section MUSS "Aktionen" als erstes Item enthalten (statt "Veranstaltungen") und die korrekten Bezeichnungen verwenden.

#### Scenario: Aktionen in Planungs-Tools
- **WHEN** ein Nutzer die Planungs-Tools Section sieht
- **THEN** MUSS "Aktionen" als Tool-Karte mit Link zu `/events` angezeigt werden
