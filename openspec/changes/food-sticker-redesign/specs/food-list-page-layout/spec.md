# Spec Delta

## MODIFIED Requirements

### Requirement: ListPageHero mit Count-Badge
Jede Listenseite SHALL einen hellen Seitenkopf (`PageHeader`, ohne Band) zeigen: Brotkrumen, den Titel als einzigen H1 in `text-title` in der Display-Schrift, eine Beschreibung in `text-muted-foreground` und die Gesamtanzahl als ruhigen Text oder Badge („248 Rezepte“). Der Kopf MUST auf weißem Grund ohne eigene farbige Fläche oder Verlauf liegen. Aktionen („Neu erstellen“) stehen im Seitenkopf rechts und brechen auf schmalen Viewports unter den Titel um. Während die Anzahl noch lädt, MUST sie als Skeleton erscheinen.

#### Scenario: Listenseite mit vorhandenen Items
- **WHEN** die Seite geladen ist und Items vorhanden sind
- **THEN** zeigt der Kopf Brotkrumen, H1, Beschreibung und die Anzahl „211 Rezepte“ auf weißem Grund

#### Scenario: Anzahl lädt noch
- **WHEN** die Liste noch lädt
- **THEN** sind Titel und Beschreibung sichtbar und die Anzahl ist ein Skeleton

#### Scenario: Seitenaktion
- **WHEN** der Nutzer Rezepte anlegen darf
- **THEN** erscheint „Neues Rezept“ im Seitenkopf und nicht in der globalen Navigation

### Requirement: Gradient-Search-Container
Jede Listenseite MUST eine Suchleiste direkt unter dem Seitenkopf haben, ohne umgebende Karte oder Box: ein Such-Input mit 12-px-Radius und sichtbarem Feldrand (`--input`), der Such-Button und gegebenenfalls ein Filter-Knopf in einer Zeile, die auf schmalen Viewports umbricht. Das Feld MUST mobil mindestens 16 px Schrift und 44 px Höhe haben.

#### Scenario: Benutzer sucht nach Items
- **WHEN** der Benutzer einen Suchbegriff eingibt und absendet
- **THEN** wird die Liste gefiltert und die URL-Parameter aktualisiert

#### Scenario: Benutzer klickt "Neu erstellen"
- **WHEN** der Benutzer den Erstellen-Button im Seitenkopf klickt
- **THEN** wird er zur Erstellungsseite navigiert oder ein Erstellungs-Dialog geöffnet

#### Scenario: Such-Container ist klar abgegrenzt
- **WHEN** die Suchleiste gerendert wird
- **THEN** liegt das Input direkt auf dem Seitengrund und ist durch Feldrand und Symbol als Eingabefeld erkennbar, ohne zusätzlichen Container

### Requirement: Responsive Grid-Layout
Items SHALL in einem responsiven CSS-Grid angezeigt werden. Rezeptkarten stehen mobil (ab 320 px) in zwei Spalten, ab `md` in drei, ab `xl` in vier; Karten mit längerem Inhalt (Essenspläne, Einkaufslisten) stehen mobil einspaltig. Zutaten und Material werden mobil als Listenzeilen gezeigt.

#### Scenario: Desktop-Ansicht
- **WHEN** der Viewport breiter als 1280px ist
- **THEN** zeigt das Rezept-Grid vier Spalten

#### Scenario: Mobile-Ansicht
- **WHEN** der Viewport 390px breit ist
- **THEN** zeigt das Rezept-Grid zwei Spalten und die Planliste eine Spalte

#### Scenario: Schmalster Viewport
- **WHEN** der Viewport 320px breit ist
- **THEN** bleibt jede Karte lesbar und der Seiteninhalt scrollt nicht horizontal

### Requirement: Filter-Sidebar (wo sinnvoll)
Rezepte, Zutaten und Essenspläne MUST eine Filter-Sidebar links vom Grid haben; Einkaufslisten haben keine Sidebar. Die Sidebar SHALL als Karte mit feiner Linie (`--line`) und 20-px-Radius dargestellt werden; Filtergruppen werden durch Abstand und eine kleine Beschriftung in Versalien getrennt. Höchstens drei Filtergruppen sind direkt sichtbar, alle weiteren liegen unter „Weitere Filter“ (siehe `food-progressive-disclosure`). Aktive Filter MUST zusätzlich als entfernbare Chips über dem Grid erscheinen. Auf Viewports unter 768 px MUST die Sidebar eingeklappt hinter einem Knopf „Filter (N)“ liegen.

#### Scenario: Zutaten-Filter
- **WHEN** der Benutzer die Zutatenseite oeffnet
- **THEN** zeigt die Sidebar die Gruppen Abteilung, Status und Herkunft und darunter „Weitere Filter“

#### Scenario: Aktive Filter als Chips
- **WHEN** der Benutzer „Warme Mahlzeit“ und „vegetarisch“ gewählt hat
- **THEN** erscheinen beide als entfernbare Chips über dem Grid, jeder mit Tippfläche ≥ 44 px mobil

#### Scenario: Mobil
- **GIVEN** ein Viewport von 390 px Breite
- **WHEN** der Benutzer die Rezeptliste öffnet
- **THEN** sieht er statt der Sidebar den Knopf „Filter“ und kann die Filter darüber aufklappen

### Requirement: Listen-Karten verwenden das Card-Pattern
Item-Karten und tabellarische Listenzeilen im frontend-food MUST das zentrale Card-Pattern des Design-Systems verwenden: weiße Fläche, `shadow-card`, 20-px-Radius, klare Abstände und Token-Farben. Rezeptkarten zeigen Bild (bzw. Fallback nach Rezepttyp), Rezepttyp, Titel, Zeit und Preis pro Portion sowie das Nutri-Score-Badge am Bild; weitere Details gehören auf die Detailseite. Die ganze Karte ist ein einziger Link zur Detailseite.

#### Scenario: Item-Karte im Grid
- **WHEN** eine Rezeptkarte in einem Listen-Grid gerendert wird
- **THEN** hebt sie sich durch Schatten klar vom weißen Grund ab und zeigt höchstens Zeit, Preis und Nutri-Score als Kennzahlen

#### Scenario: Lesbarkeit auf Mobile
- **WHEN** der Viewport 320px breit ist
- **THEN** bleibt die Item-Karte vollständig lesbar und klar abgegrenzt
