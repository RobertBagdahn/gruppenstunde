## REMOVED Requirements

### Requirement: g-System-Portion ist immer am Ende fixiert

**Reason**: Gramm ist jetzt implizit via `RecipeItem.portion=NULL`. Die "g"-Portion mit `rank=9999` und `is_system=True` existiert nicht mehr.

**Migration**: `RunPython` entfernt alle "g"-Portionen und setzt referenzierende `RecipeItem.portion` auf `NULL`.

### Requirement: Neue Portionen erhalten den nächsten freien rank

**Reason**: War an System-Portionen gekoppelt (Ausschluss von rank=9999). Nach Entfernen der System-Portionen wird der nächste freie Rank dynamisch aus den existierenden Portionen berechnet, ohne Sonderlogik.

### Requirement: Warnung wenn Packung kein weight_g hat

**Reason**: Packungen sind jetzt im eigenen `Package`-Model und werden in einer separaten Sektion dargestellt. Das Frontend zeigt fehlende `weight_g`-Werte direkt in der Packungs-Karte an, kein spezielles Warn-Banner nötig.

**Migration**: Frontend rendert Package-Karte mit leerem Gewichtshinweis statt Warn-Banner.

### Requirement: KI schätzt weight_g für Stück und Packung

**Reason**: `stueck_weight_g` und `packung_weight_g` waren an spezifische System-Portionen ("Stück", "Packung") gebunden. Nach dem Umbau liefert die KI normale `Portion`- und `Package`-Vorschläge, die `weight_g` als Standardfeld enthalten.

**Migration**: KI-Service erstellt direkt `Portion`- und `Package`-Instanzen statt bestehende System-Portionen zu befüllen.

## MODIFIED Requirements

### Requirement: Portion name is unique per ingredient

Das System SHALL sicherstellen, dass keine zwei Portionen derselben Zutat denselben Namen haben (case-insensitive, ohne führende/abschließende Leerzeichen). Soft-gelöschte Portionen werden bei der Prüfung ausgeschlossen. Der unique constraint SHALL auch für `Package` gelten (separat, pro Model).

#### Scenario: Doppelter Name beim Anlegen

- **WHEN** ein User versucht eine Portion mit dem Namen „Stück" anzulegen, obwohl bereits eine Portion mit diesem Namen existiert
- **THEN** SHALL das Backend HTTP 422 mit der Fehlermeldung „Eine Portion mit diesem Namen existiert bereits für diese Zutat." zurückgeben

#### Scenario: Case-insensitive Prüfung

- **WHEN** eine Portion mit dem Namen „Stück" existiert und ein User „stück" anlegen will
- **THEN** SHALL das Backend HTTP 422 zurückgeben

#### Scenario: Soft-gelöschte Portion ignoriert

- **WHEN** eine Portion mit dem Namen „EL" soft-gelöscht wurde und ein User eine neue Portion „EL" anlegt
- **THEN** SHALL die neue Portion erfolgreich angelegt werden

### Requirement: rank=1 ist die Normalportion (Default)

Das System SHALL die Portion mit dem niedrigsten `rank`-Wert (rank=1) als Normalportion behandeln. Diese Portion wird bei Rezept-Erstellung, KI-Vorschlägen und allen Standardauswahl-Kontexten automatisch vorausgewählt. Das Gleiche gilt für Packages: `rank=1` ist die Standard-Einkaufspackung.

#### Scenario: Rezept-Zutat-Hinzufügen wählt rank=1 vor

- **WHEN** ein User eine Zutat zu einem Rezept hinzufügt
- **THEN** SHALL die Portion mit `rank=1` automatisch ausgewählt sein
- **THEN** SHALL `quantity=1` vorausgefüllt sein

#### Scenario: UI markiert rank=1 als „Standard"

- **WHEN** die Portionsliste einer Zutat angezeigt wird
- **THEN** SHALL die Portion mit `rank=1` ein „Standard"-Badge tragen
- **THEN** SHALL die Zeile der rank=1-Portion visuell hervorgehoben sein

#### Scenario: Ohne Portionen — Gramm-Fallback

- **WHEN** ein RecipeItem ohne zugewiesene Portion existiert (`portion=NULL`)
- **THEN** SHALL das System `quantity` direkt als Gramm interpretieren
- **THEN** SHALL `quantity * 1g` für Gewichtsberechnungen verwendet werden

### Requirement: Portionen per Drag & Drop sortieren

Das System SHALL dem User ermöglichen, die Reihenfolge der Portionen per Drag & Drop zu ändern. System-Portionen existieren nicht mehr — alle Portionen sind sortierbar. Analog für Packages.

#### Scenario: User verschiebt Portion nach oben

- **WHEN** ein User eine Portion per Drag & Drop über eine andere zieht
- **THEN** SHALL der neue `rank` der gezogenen Portion dem rank der Zielposition entsprechen
- **THEN** SHALL alle betroffenen Portionen ihre ranks entsprechend neu erhalten

#### Scenario: Batch-Reorder-Endpoint

- **WHEN** nach einem Drag & Drop das Frontend die neue Reihenfolge persistieren will
- **THEN** SHALL das Backend `POST /api/ingredients/{slug}/portions/reorder/` bereitstellen
- **THEN** SHALL der Body `{ "orders": [{"id": int, "rank": int}, ...] }` akzeptiert werden
