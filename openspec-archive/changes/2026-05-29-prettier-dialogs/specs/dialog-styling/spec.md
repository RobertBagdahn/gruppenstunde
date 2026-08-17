## ADDED Requirements

### Requirement: Dialog-Größe und Spacing
RecipeSearchDialog verwendet `max-w-3xl` und `max-h-[85vh]` mit konsistentem internen Spacing (`gap-4`).

#### Scenario: Dialog öffnet auf Desktop
- **WHEN** der RecipeSearchDialog geöffnet wird auf einem Viewport >= 768px
- **THEN** ist der Dialog 768px breit mit ausreichend Platz für Tags und Ergebnisse

#### Scenario: Dialog öffnet auf Mobile
- **WHEN** der RecipeSearchDialog geöffnet wird auf einem Viewport < 768px
- **THEN** füllt der Dialog die volle Breite (Standard shadcn/ui Verhalten)

### Requirement: Material Icons in Dialogen
Dialoge verwenden Material Symbols für visuelle Orientierung.

#### Scenario: Suchfeld mit Icon
- **WHEN** der RecipeSearchDialog angezeigt wird
- **THEN** hat das Suchfeld ein `search`-Icon links und der Header ein Icon

#### Scenario: Ergebnis-Items mit Icons
- **WHEN** Suchergebnisse angezeigt werden
- **THEN** haben Rezepte ein `menu_book`-Icon und Zutaten ein `egg_alt`-Icon links

### Requirement: Farbcodierte Nutritional Tags
Tags sind nach Kategorie farblich unterschiedlich gestylt.

#### Scenario: Tag wird angezeigt (nicht selektiert)
- **WHEN** ein Nutritional Tag angezeigt wird und nicht selektiert ist
- **THEN** hat er eine kategoriebasierte Hintergrundfarbe (z.B. amber für Allergene, rot für Tierisch)

#### Scenario: Tag wird selektiert
- **WHEN** ein Nutritional Tag selektiert wird
- **THEN** wechselt er zu `bg-primary text-primary-foreground` (aktiver Zustand)

### Requirement: Farbige Rezepttyp-Badges
Der Rezepttyp in der Ergebnisliste wird als farbiger Pill-Badge dargestellt.

#### Scenario: Rezept in Ergebnisliste
- **WHEN** ein Rezept in der Ergebnisliste angezeigt wird
- **THEN** wird der Rezepttyp als farbiger Badge angezeigt (z.B. orange für Warme Mahlzeit)

### Requirement: Größere Schrift
Dialog-Inhalte verwenden größere Schriftgrößen für bessere Lesbarkeit.

#### Scenario: Suchfeld und Ergebnisse
- **WHEN** der Dialog angezeigt wird
- **THEN** verwenden Suchfeld und Ergebnis-Items `text-base`, Tags `text-sm`

### Requirement: ConfirmDialog auf Radix migriert
Der ConfirmDialog verwendet shadcn/ui Dialog statt nativem `<dialog>`.

#### Scenario: ConfirmDialog wird angezeigt
- **WHEN** ein ConfirmDialog geöffnet wird
- **THEN** rendert er als Radix Dialog mit Overlay und Animation (konsistent mit anderen Dialogen)
