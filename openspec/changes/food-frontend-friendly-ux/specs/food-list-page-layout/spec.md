## MODIFIED Requirements

### Requirement: ListPageHero mit Count-Badge
Jede Listenseite SHALL einen hellen Seitenkopf (`PageHeader`, ersetzt den bisherigen Verlaufs-Hero) zeigen: Icon-Kachel in der Bereichsfarbe (Ton auf Tönung), Titel in der Display-Schrift in `text-title`, eine Beschreibung in `text-muted-foreground` und ein ruhiges Count-Badge mit der Gesamtanzahl. Der Kopf MUST auf dem Seitenhintergrund ohne eigene farbige Fläche oder Verlauf liegen. Während die Anzahl noch lädt, MUST das Badge als Skeleton erscheinen.

#### Scenario: Listenseite mit vorhandenen Items
- **WHEN** die Seite geladen ist und Items vorhanden sind
- **THEN** zeigt der Kopf Icon-Kachel, Titel, Beschreibung und das Badge „211 Rezepte“ auf hellem Hintergrund

#### Scenario: Anzahl lädt noch
- **WHEN** die Liste noch lädt
- **THEN** sind Titel und Beschreibung sichtbar und das Badge ist ein Skeleton

### Requirement: Gradient-Search-Container
Jede Listenseite MUST eine Suchleiste direkt unter dem Seitenkopf haben, ohne umgebende Karte oder Box: ein abgerundetes Such-Input mit feinem Schatten, der Such-Button und der „Neu erstellen“-Button in einer Zeile, die auf schmalen Viewports umbricht.

#### Scenario: Benutzer sucht nach Items
- **WHEN** der Benutzer einen Suchbegriff eingibt und absendet
- **THEN** wird die Liste gefiltert und die URL-Parameter aktualisiert

#### Scenario: Benutzer klickt "Neu erstellen"
- **WHEN** der Benutzer den Erstellen-Button klickt
- **THEN** wird er zur Erstellungsseite navigiert oder ein Erstellungs-Dialog geöffnet

#### Scenario: Such-Container ist klar abgegrenzt
- **WHEN** die Suchleiste gerendert wird
- **THEN** liegt das Input direkt auf dem Seitenhintergrund und ist durch Schatten und Rand als Eingabefeld erkennbar, ohne zusätzlichen Container

### Requirement: Filter-Sidebar (wo sinnvoll)
Rezepte, Zutaten und Essenspläne MUST eine Filter-Sidebar links vom Grid haben; Einkaufslisten haben keine Sidebar. Die Sidebar SHALL ohne Rahmen und ohne Kartenfläche auskommen; Filtergruppen werden durch Abstand und eine kleine Überschrift getrennt. Höchstens drei Filtergruppen sind direkt sichtbar, alle weiteren liegen unter „Weitere Filter“ (siehe `food-progressive-disclosure`). Auf Viewports unter 768 px MUST die Sidebar eingeklappt hinter einem Knopf „Filter (N)“ liegen.

#### Scenario: Zutaten-Filter
- **WHEN** der Benutzer die Zutatenseite oeffnet
- **THEN** zeigt die Sidebar ohne Rahmen die Gruppen Abteilung, Status und Herkunft und darunter „Weitere Filter“

#### Scenario: Mobil
- **GIVEN** ein Viewport von 375 px Breite
- **WHEN** der Benutzer die Rezeptliste öffnet
- **THEN** sieht er statt der Sidebar den Knopf „Filter“ und kann die Filter darüber aufklappen

### Requirement: Listen-Karten verwenden das Card-Pattern
Item-Karten und tabellarische Listenzeilen im frontend-food MUST das zentrale Card-Pattern des Design-Systems verwenden: weiße Fläche, feiner Schatten (`shadow-card`), sehr helle oder keine Border, klare Abstände und Token-Farben. Karten MUST eine Kernauswahl an Informationen zeigen (Titel, Bild, höchstens drei Kennzahlen inklusive Nutri-Score); weitere Details gehören auf die Detailseite.

#### Scenario: Item-Karte im Grid
- **WHEN** eine Item-Karte in einem Listen-Grid gerendert wird
- **THEN** hebt sie sich durch Schatten klar vom hellen Hintergrund ab und zeigt höchstens drei Kennzahlen

#### Scenario: Lesbarkeit auf Mobile
- **WHEN** der Viewport 320px breit ist
- **THEN** bleibt die Item-Karte vollständig lesbar und klar abgegrenzt
