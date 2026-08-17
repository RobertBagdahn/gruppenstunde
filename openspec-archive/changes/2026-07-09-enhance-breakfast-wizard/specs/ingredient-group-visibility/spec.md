## ADDED Requirements

### Requirement: Ingredients have visibility setting
Zutaten haben ein `visibility` Feld: `private` (default) oder `shared`. Private Zutaten sind nur für den Owner + seine Gruppe sichtbar. Shared Zutaten können mit mehreren Gruppen geteilt werden.

#### Scenario: User creates private ingredient
- **WHEN** user erstellt neue Zutat "Glutenfreies Brot" im Wizard (Gruppe: Wölflinge Hütte)
- **THEN** Zutat hat: owner=current_user, visibility=private, group=Wölflinge Hütte
- **AND** Zutat ist sichtbar für: alle Users der Gruppe Wölflinge Hütte
- **AND** Zutat ist NICHT sichtbar für: andere Gruppen, nicht-angemeldete User

#### Scenario: User shares ingredient with other group
- **WHEN** user (Owner) öffnet Edit-Seite der Zutat
- **THEN** Edit-Form zeigt: Visibility="private" mit Option "Mit anderen Gruppen teilen"
- **AND** User kann Gruppen wählen: Rover, Jungpfadfinder, etc.
- **AND** Nach "Speichern": Zutat ist sichtbar in Breakfast-Wizard aller geteilten Gruppen

#### Scenario: Visibility selector in create dialog
- **WHEN** user erstellt Zutat im Wizard
- **THEN** Modal zeigt Visibility-Bereich:
  - ◉ Privat (nur diese Gruppe: Wölflinge Hütte)
  - ○ Mit Gruppen teilen → Multiselect [Wölflinge, Rover, ...]
- **AND** Default: Privat

### Requirement: System ingredients are always visible
System-Zutaten (owner=null, status=approved) sind überall sichtbar, können aber nicht gelöscht werden.

#### Scenario: System ingredient visibility
- **WHEN** user öffnet Breakfast-Wizard
- **THEN** System-Zutaten (z.B. "Vollkornbrot", "Weißbrot") sind immer sichtbar
- **AND** Sie sind gelesen aus: owner=null, status=approved
- **AND** Visibility-Setting ist irrelevant (always visible)

### Requirement: Permission checks in breakfast catalog
Breakfast-Catalog API filtert Zutaten basierend auf User-Permissions.

#### Scenario: Unauthenticated user sees only system items
- **WHEN** nicht-angemeldeter User ruft `GET /api/supply/breakfast-catalog/` auf
- **THEN** Response enthält nur System-Zutaten: owner=null, status=approved

#### Scenario: Authenticated user sees owned + shared items
- **WHEN** User der Gruppe "Wölflinge" ruft `GET /api/supply/breakfast-catalog/?group_id=wölflinge` auf
- **THEN** Response enthält:
  - System-Zutaten (immer)
  - User's eigene Zutaten (owner=user)
  - Zutaten von anderen Usern der Wölflinge-Gruppe (visibility=private, shared_groups=wölflinge)
  - Zutaten von anderen Gruppen, die mit Wölflinge geteilt haben (visibility=shared, shared_groups=wölflinge)

### Requirement: Creator information is visible
Beim Anschauen einer Zutat ist sichtbar: wer hat die erstellt (Owner-Name).

#### Scenario: Creator info on ingredient detail
- **WHEN** user öffnet Detail-Seite für Zutat "Glutenfreies Brot"
- **THEN** Seite zeigt: "Erstellt von: Robert" (oder "System" falls owner=null)
- **AND** Info ist read-only (nicht editierbar)

### Requirement: Shared indicator in catalog
Geteilte Zutaten haben ein visuelles Indicator (z.B. Icon oder Badge).

#### Scenario: Shared ingredient indicator
- **WHEN** user sieht Zutaten-Liste im Wizard
- **THEN** Geteilte Zutaten haben z.B. "👥" Icon oder Badge "Geteilt"
- **AND** User kann daran erkennen: "Das ist nicht meine Zutat"

### Requirement: Recipes also support visibility
Rezepte (Recipe-Model) unterstützen dieselbe Visibility-Logik wie Ingredients.

#### Scenario: Recipe visibility
- **WHEN** user erstellt Rezept "Haferflocken-Smoothie" im Wizard
- **THEN** Rezept hat: owner=user, visibility=private, shared_groups=[]
- **AND** Rezept ist nur sichtbar in Breakfast-Wizard der Gruppe
- **AND** User kann später teilen via Edit-Seite
