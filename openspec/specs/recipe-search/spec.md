# Spec: Recipe Search

Grundlegende Such- und Anzeigefunktionalität der Rezeptsuche unter `/recipes`.

## ADDED Requirements

### Requirement: Default origin is verified
Die Rezeptsuche SHALL standardmäßig nur verifizierte Rezepte (Inspi-verifiziert, `owner__isnull=True, status="approved"`) anzeigen. Community- und eigene Rezepte müssen explizit über den `Anzeigen`-Filter zugeschaltet werden.

#### Scenario: First visit without filters
- **WHEN** ein Nutzer `/recipes` ohne URL-Parameter öffnet
- **THEN** werden nur verifizierte Rezepte angezeigt (`origin=verified`)
- **THEN** in der `Anzeigen`-Filtergruppe ist nur "Inspi-verifiziert" angehakt

#### Scenario: Explicitly enable community recipes
- **WHEN** ein Nutzer "Community-Rezepte" in der `Anzeigen`-Gruppe auswählt (zusätzlich zu "Inspi-verifiziert")
- **THEN** werden verifizierte UND Community-Rezepte angezeigt
- **THEN** der URL-Parameter ist `origin=verified&origin=community`

#### Scenario: Only community recipes
- **WHEN** ein Nutzer "Inspi-verifiziert" deselektiert und nur "Community-Rezepte" wählt
- **THEN** werden nur Community-Rezepte angezeigt

### Requirement: Default sort by usage count
Die Rezeptsuche SHALL standardmäßig nach `use_count` (Verwendungshäufigkeit in Meal-Plans) sortieren, mit Rezepten die 0-mal verwendet wurden am Ende.

#### Scenario: Default sort order
- **WHEN** ein Nutzer `/recipes` öffnet
- **THEN** werden Rezepte absteigend nach `usage_count` sortiert
- **THEN** Rezepte mit `usage_count=0` erscheinen am Ende, sortiert nach `-created_at`

#### Scenario: Sort options include new default
- **WHEN** der Sort-Dropdown geöffnet wird
- **THEN** der erste/grundeingestellte Eintrag ist "Beliebteste" (use_count)
- **THEN** weitere Optionen: Neueste, Älteste, Meiste Likes, Meistgesehen, Zufällig

### Requirement: Draft recipes in "Meine Rezepte"
Bei Auswahl von "Meine Rezepte" im `Anzeigen`-Filter SHALL das System ALLE eigenen Rezepte anzeigen, inklusive Drafts. Draft-Rezepte SHALL mit einem "Entwurf"-Badge markiert sein.

#### Scenario: Own drafts visible in mine view
- **WHEN** ein authentifizierter Nutzer "Meine Rezepte" auswählt
- **THEN** werden eigene Rezepte mit jedem Status (draft, submitted, approved) angezeigt
- **THEN** Draft-Rezepte zeigen ein "Entwurf"-Badge auf der Karte bzw. in der Tabellenzeile

#### Scenario: Other users' drafts never shown
- **WHEN** ein Nutzer NUR "Inspi-verifiziert" und/oder "Community-Rezepte" gewählt hat
- **THEN** werden KEINE Draft-Rezepte angezeigt

#### Scenario: Anonymous user cannot see "Meine Rezepte"
- **WHEN** ein anonymer Nutzer die Seite öffnet
- **THEN** ist die "Meine Rezepte"-Checkbox ausgegraut oder nicht vorhanden

### Requirement: Search respects active origin filter
Die Volltextsuche SHALL nur innerhalb des aktuell gewählten Anzeigebereichs suchen.

#### Scenario: Search only in verified recipes
- **WHEN** ein Nutzer bei aktivem "Inspi-verifiziert"-Filter nach "Nudeln" sucht
- **THEN** werden nur verifizierte Rezepte mit "Nudeln" im Titel/Summary/Description zurückgegeben
- **THEN** Community-Rezepte mit "Nudeln" werden NICHT angezeigt

#### Scenario: Search in verified + community
- **WHEN** ein Nutzer bei aktivem "Inspi-verifiziert" + "Community" nach "Nudeln" sucht
- **THEN** werden verifizierte UND Community-Rezepte mit "Nudeln" zurückgegeben

### Requirement: Dynamic page title
Der Seitentitel SHALL dynamisch die aktiven Filter widerspiegeln.

#### Scenario: Default title
- **WHEN** `/recipes` ohne Filter geöffnet wird (nur verified als Default)
- **THEN** ist der Titel "Verifizierte Rezepte – Inspi"

#### Scenario: Title with recipe type filter
- **WHEN** der Typ-Filter "Frühstück" aktiv ist
- **THEN** ist der Titel "Frühstück – Rezepte – Inspi"

#### Scenario: Title with search query
- **WHEN** der Suchtext "Nudeln" aktiv ist
- **THEN** ist der Titel "Nudeln – Rezepte – Inspi"

#### Scenario: Title with multiple filters
- **WHEN** Typ="Frühstück" UND Suche="Nudeln" aktiv sind
- **THEN** ist der Titel "Nudeln – Frühstück – Rezepte – Inspi"

### Requirement: Results area with sort and view toggle
Der Ergebnis-Bereich SHALL eine Kopfzeile mit Sort-Dropdown, View-Toggle (Kacheln/Tabelle) und Ergebnisanzahl anzeigen.

#### Scenario: Results header
- **WHEN** die Rezeptsuche Ergebnisse geladen hat
- **THEN** zeigt die Kopfzeile: Sort-Dropdown, Kacheln/Tabelle-Toggle, "X Rezepte"
- **THEN** die Kopfzeile ist auf Mobile (unterhalb der Filter-Leiste) sichtbar

### Requirement: Search text highlighting in cards
Wenn ein Suchtext eingegeben wurde, SHALL der gefundene Text in Titel und Summary der RecipeCards visuell hervorgehoben werden.

#### Scenario: Highlight matching text
- **WHEN** nach "Nudeln" gesucht wird und ein Rezept "Nudelsalat" heißt
- **THEN** wird "Nudel" in "Nudelsalat" optisch hervorgehoben (z.B. gelb unterlegt)
- **THEN** das Highlighting erscheint auch in der Tabellenansicht

#### Scenario: No highlighting without search query
- **WHEN** kein Suchtext eingegeben ist
- **THEN** wird kein Text hervorgehoben

### Requirement: Intelligent empty results
Wenn keine Ergebnisse gefunden werden, SHALL das System alternative Vorschläge anzeigen statt nur "Keine Rezepte gefunden".

#### Scenario: Empty results with active filters
- **WHEN** Filter aktiv sind und keine Ergebnisse vorliegen
- **THEN** wird ein CTA "Weniger Filter anwenden" mit Link zum Zurücksetzen angezeigt

#### Scenario: Empty results with search query
- **WHEN** ein Suchbegriff keine Treffer liefert
- **THEN** wird "Keine Rezepte für '<suchbegriff>' gefunden" angezeigt
- **THEN** werden Vorschläge wie "Probier andere Suchbegriffe" oder beliebte Rezepte als Fallback angezeigt

### Requirement: Skeleton loading with exact layout
Während des Ladens SHALL das exakte Layout der Ziel-Ansicht als Skeleton dargestellt werden, um Cumulative Layout Shift (CLS) zu vermeiden.

#### Scenario: Grid skeleton
- **WHEN** die Kachel-Ansicht lädt
- **THEN** werden 6 Skeleton-Karten mit Bild-Platzhalter, Titel-Zeile, Tag-Zeile und Meta-Zeile gerendert

#### Scenario: Table skeleton
- **WHEN** die Tabellen-Ansicht lädt
- **THEN** werden 6 Skeleton-Zeilen mit Spalten-Breiten entsprechend dem Tabellen-Layout gerendert

### Requirement: Backend sorting by usage count
Das Backend SHALL den Sort-Parameter `use_count` unterstützen, der Rezepte nach `usage_count` absteigend sortiert, mit Rezepten mit `usage_count=0` ans Ende.

#### Scenario: use_count sort API
- **WHEN** `GET /api/recipes/?sort=use_count` aufgerufen wird
- **THEN** werden Rezepte sortiert: zuerst nach `-usage_count`, dann nach `-created_at`
- **THEN** Rezepte mit `usage_count=0` erscheinen nach allen Rezepten mit `usage_count > 0`

#### Scenario: use_count is default sort
- **WHEN** `GET /api/recipes/` OHNE `sort`-Parameter aufgerufen wird
- **THEN** wird standardmäßig nach `use_count` sortiert (nicht mehr `newest`)

### Requirement: Backend multi-value origin filter
Das Backend SHALL mehrere `origin`-Werte im selben Request akzeptieren (z.B. `origin=verified&origin=community`).

#### Scenario: Combined origin filter
- **WHEN** `GET /api/recipes/?origin=verified&origin=community` aufgerufen wird
- **THEN** werden verifizierte UND Community-Rezepte zurückgegeben
- **THEN** der Filter wird als OR-Verknüpfung angewandt (nur approved Rezepte)

#### Scenario: No origin filter defaults to verified
- **WHEN** `GET /api/recipes/` OHNE `origin`-Parameter aufgerufen wird
- **THEN** werden nur verifizierte Rezepte zurückgegeben
