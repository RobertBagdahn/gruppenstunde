## ADDED Requirements

### Requirement: Package model with CRUD

Das System SHALL ein eigenes `Package`-Model für Einkaufspackungen bereitstellen mit den Feldern `name` (CharField, max 255), `weight_g` (Float, nullable), `rank` (Integer, default 1), `ingredient` (ForeignKey zu `Ingredient`, related_name `packages`). Packungen SHALL Soft-Delete via `deleted_at` unterstützen. Packungen SHALL nach `rank` sortiert werden. Rank 1 SHALL die Standardpackung sein und pro Ingredient maximal einmal existieren.

#### Scenario: Package für ein Ingredient anlegen

- **WHEN** ein authentifizierter Nutzer `POST /api/ingredients/{slug}/packages/` mit `{ "name": "Kleine Packung", "weight_g": 500 }` sendet
- **THEN** SHALL eine neue Package mit den angegebenen Werten und `rank=1` (wenn keine andere existiert) angelegt werden
- **THEN** SHALL die Response die Package mit `id`, `name`, `weight_g`, `rank` zurückgeben

#### Scenario: Namenskonflikt verhindern

- **WHEN** bereits eine Package mit Namen "Kleine Packung" existiert und ein zweiter Create-Versuch mit gleichem Namen erfolgt
- **THEN** SHALL das System HTTP 422 mit Fehlermeldung "Eine Packung mit diesem Namen existiert bereits für diese Zutat." zurückgeben
- **THEN** SHALL der Check case-insensitive sein und soft-gelöschte Packages ignorieren

#### Scenario: Package list abrufen

- **WHEN** `GET /api/ingredients/{slug}/packages/` aufgerufen wird
- **THEN** SHALL das System alle nicht-soft-gelöschten Packages der Zutat sortiert nach `rank` zurückgeben

#### Scenario: Package aktualisieren

- **WHEN** ein Nutzer `PATCH /api/ingredients/{slug}/packages/{id}/` mit `{ "weight_g": 1000 }` sendet
- **THEN** SHALL das `weight_g` der Package aktualisiert werden

#### Scenario: Package soft-löschen

- **WHEN** ein Nutzer `DELETE /api/ingredients/{slug}/packages/{id}/` sendet
- **THEN** SHALL die Package per `deleted_at` soft-gelöscht werden
- **THEN** SHALL die Package nicht mehr in der Liste erscheinen

#### Scenario: Nicht-authentifizierter Nutzer

- **WHEN** ein nicht-authentifizierter Nutzer einen Package-Endpoint aufruft
- **THEN** SHALL das System HTTP 403 zurückgeben

### Requirement: Package reorder

Das System SHALL einen `POST /api/ingredients/{slug}/packages/reorder/` Endpoint bereitstellen, der mehrere Packages atomisch nach `rank` umsortiert.

#### Scenario: Packages neu ordnen

- **WHEN** ein Nutzer `{ "orders": [{"id": 1, "rank": 2}, {"id": 2, "rank": 1}] }` sendet
- **THEN** SHALL Package 1 `rank=2` und Package 2 `rank=1` erhalten
- **THEN** SHALL die gesamte Operation in einer Transaktion ausgeführt werden

#### Scenario: Nur eine rank=1 Package

- **WHEN** ein Reorder versucht, zwei Packages auf `rank=1` zu setzen
- **THEN** SHALL das System einen Integritätsfehler werfen (UniqueConstraint)

### Requirement: Ingredients-Detail enthält Packages

Das System SHALL `packages` als separates Feld im `IngredientDetailOut`-Schema ausliefern, getrennt von `portions`.

#### Scenario: Zutat mit Portionen und Packages abrufen

- **WHEN** `GET /api/ingredients/{slug}/` aufgerufen wird
- **THEN** SHALL die Response `portions: [...]` und `packages: [...]` als getrennte Listen enthalten
- **THEN** SHALL `portions` KEIN `is_system`-Feld mehr enthalten

### Requirement: Package-Rank-1 als Standard-Einkaufspackung

Das System SHALL die Package mit `rank=1` als Standard-Einkaufspackung behandeln. Alle Shopping-Berechnungen, die eine Packungsgröße benötigen, SHALL `rank=1` Package als Default verwenden.

#### Scenario: Shopping-Service wählt rank=1 Package

- **WHEN** eine Einkaufsliste für eine Zutat generiert wird
- **THEN** SHALL die Package mit `rank=1` als Primärpackung verwendet werden
- **THEN** SHALL `build_package_display()` die rank=1 Package nutzen um benötigte Packungsanzahl zu berechnen
