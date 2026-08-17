## MODIFIED Requirements

### Requirement: Empty States

Das Frontend MUST leere Zustaende mit der shared `<EmptyState>` Komponente anzeigen. Alle Seiten MUST die gleiche Komponente verwenden fuer konsistente Darstellung.

#### Scenario: Leere Liste (keine Daten vorhanden)

- **WHEN** eine Listen-Seite keine Eintraege hat (z.B. keine Sessions, keine Events)
- **THEN** wird die shared `<EmptyState>` Komponente gerendert mit:
  - Maskottchen-Bild (bevorzugt) ODER Material Symbols Icon
  - Titel als Heading auf Deutsch (z.B. "Noch keine Gruppenstunden vorhanden")
  - Beschreibungstext auf Deutsch
  - CTA-Button zum Erstellen (z.B. "Erste Gruppenstunde erstellen"), nur sichtbar wenn der Benutzer die Berechtigung hat
- **THEN** die Komponente SHALL zentriert dargestellt werden mit angemessenem Abstand

#### Scenario: Leere Suchergebnisse

- **WHEN** eine Suche keine Ergebnisse liefert
- **THEN** wird die shared `<EmptyState>` Komponente gerendert mit:
  - Maskottchen-Bild
  - Text: "Keine Ergebnisse fuer '{suchbegriff}'"
  - Beschreibung: "Versuche einen anderen Suchbegriff oder weniger Filter"
- **THEN** die aktiven Filter werden als Chips angezeigt mit Moeglichkeit, sie zu entfernen

### Requirement: Loading States

Das Frontend MUST kontextabhaengige Loading-States mit strukturierten Skeleton-Loadern anzeigen, die die finale Inhaltsstruktur widerspiegeln.

#### Scenario: Initiales Laden von Listen und Seiten

- **WHEN** eine Seite zum ersten Mal geladen wird
- **THEN** werden Skeleton-Loader in der Form des erwarteten Inhalts angezeigt
- **THEN** Skeletons muessen die tatsaechliche Inhaltsstruktur widerspiegeln (Cards, Text-Zeilen, etc.)
- **THEN** jeder Skeleton MUST mindestens 3 unterscheidbare Platzhalter-Bereiche haben
- **THEN** einzelne undifferenzierte `animate-pulse` Bloecke sind VERBOTEN
- **THEN** es wird KEIN leeres Layout ohne Feedback angezeigt

#### Scenario: Aktionen (Speichern, Loeschen, etc.)

- **WHEN** ein Benutzer eine Mutation ausfuehrt (Erstellen, Bearbeiten, Loeschen)
- **THEN** wird ein Spinner im ausloesenden Button angezeigt
- **THEN** der Button ist waehrend der Anfrage deaktiviert
- **THEN** andere Interaktionen auf der Seite bleiben moeglich

#### Scenario: Nachladen (Mehr laden)

- **WHEN** eine paginierte Liste einen "Mehr laden"-Button hat
- **THEN** wird ein Spinner im Button angezeigt beim Laden
- **THEN** die bestehenden Eintraege bleiben sichtbar
- **THEN** neue Eintraege werden unterhalb angehaengt

## ADDED Requirements

### Requirement: Container width standard

Die best-practices SHALL drei standardisierte Container-Breiten-Tiers definieren, die alle Seiten verwenden MUESSEN.

#### Scenario: Container-Tier Zuordnung

- **WHEN** eine neue Seite implementiert wird
- **THEN** MUST sie einen der drei Container-Tiers verwenden:
  - `max-w-7xl` fuer Grid-Listenseiten (Sessions, Games, Blogs, Recipes, Search)
  - `max-w-5xl` fuer Dashboard/Management-Seiten (Events, Ingredients, MealEvents)
  - `max-w-3xl` fuer Detail/Formular-Seiten (Create, Edit, GroupDetail)
- **THEN** der Container MUST `mx-auto px-4 sm:px-6 lg:px-8` fuer konsistentes Padding verwenden
