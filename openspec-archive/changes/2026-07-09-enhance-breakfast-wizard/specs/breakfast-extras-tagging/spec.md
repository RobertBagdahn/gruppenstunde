## ADDED Requirements

### Requirement: Extras are tag-based, not hardcoded
Extras (Marmelade, Honig, Nutella, Zucker, etc.) sind jetzt tag-basiert: Sie sind Ingredient-Einträge mit dem `breakfast-extra` Tag, nicht mehr eine hardcoded Liste im Code.

#### Scenario: Extras loaded from database
- **WHEN** user öffnet Step 4 (Extras) im Frühstückassistenten
- **THEN** System lädt Extras via `GET /api/supply/breakfast-catalog/?include_extras=true`
- **AND** Extras sind Ingredient-Objekte mit Tag `breakfast-extra`
- **AND** Liste zeigt: Marmelade, Honig, Nutella, Zucker, Nussmus, Käse, etc.

#### Scenario: System extras are included
- **WHEN** User öffnet Extras-Step
- **THEN** System-Extras (owner=null, status=approved) sind immer sichtbar
- **THEN** Beispiele: Standard-Marmelade, Honig, Zucker, etc. (von Admins gepflegt)

#### Scenario: User can add custom extras
- **WHEN** user klickt "+ Neues Extra erstellen" in Step 4
- **THEN** öffnet sich Modal zum Erstellen einer neuen Zutat
- **AND** Tag `breakfast-extra` ist automatisch vorausgewählt
- **AND** Nach Erstellen: neue Zutat sichtbar in Extras-Liste
- **EXAMPLE**: User erstellt "Vegane Marmelade" für Gruppe

### Requirement: Extras can be filtered by tags
Extras können zusätzliche Tags haben (vegan, vegetarian, bio, etc.). Diese Tags sind verwendbar für zukünftige Filterung (MVP: nicht implementiert, später: Filter-UI).

#### Scenario: Extra with multiple tags
- **WHEN** user erstellt Extra "Vegane Nussbutter"
- **THEN** Extra hat Tags: breakfast-extra ✓, vegan ✓, vegetarian ✓
- **AND** Tags sind speicherbar und abrufbar

### Requirement: Backward compatibility with existing extras
Existierende hardcoded Extras werden in die Datenbank migriert (als Ingredient mit breakfast-extra Tag).

#### Scenario: Migration of extras
- **WHEN** System wird deployed
- **THEN** Django-Migration erstellt Ingredient-Einträge für alle hardcoded Extras
- **AND** Extras bekommen Tag `breakfast-extra`
- **AND** owner=null (System-Items, alle sehen sie)
- **AND** Status=approved
- **EXAMPLE**: Marmelade, Honig, Nutella, Zucker, Nussmus, Käse, Butter, Öl

### Requirement: Admins can manage extras
Admins können System-Extras verwalten: Hinzufügen, Ändern, Löschen.

#### Scenario: Admin manages system extras
- **WHEN** Admin auf Ingredient-Detail-Seite für "Marmelade" geht
- **THEN** Admin kann: Name, Beschreibung, Nährwerte, Tags bearbeiten
- **AND** Änderungen wirken sich auf alle Gruppen aus

### Requirement: Performance: Extras cached or efficiently queried
Extras-Load ist nicht teuer (Cache oder Index).

#### Scenario: Fast extras loading
- **WHEN** user öffnet Step 4
- **THEN** Extras laden < 200ms
- **AND** Query ist effizient (indexed auf breakfast-extra Tag)
