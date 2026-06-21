## ADDED Requirements

### Requirement: RecipeTypeStats-Aggregat mit Histogramm-Buckets
Das System SHALL ein `RecipeTypeStats`-Model bereitstellen, das pro `recipe_type` aggregierte Statistiken und Histogramm-Buckets für Preis pro Portion, Kalorien pro Portion und Protein pro Portion speichert. Die Aggregation SHALL nur veröffentlichte Rezepte (`ContentStatus.APPROVED`) berücksichtigen. Pro Metrik SHALL eine feste Anzahl Buckets (Standard 12) mit `{min, max, count}` aus dem Wertebereich [Gesamt-Min, Gesamt-Max] gespeichert werden. Zusätzlich SHALL min/max/avg/median je Metrik und die Nutri-Score-Verteilung (A–E) gespeichert werden.

#### Scenario: Aggregat wird berechnet
- **WHEN** der Aggregations-Service für einen `recipe_type` mit mindestens 10 veröffentlichten Rezepten läuft
- **THEN** SHALL ein `RecipeTypeStats`-Eintrag mit min/max/avg/median und Bucket-Arrays für price/energy/protein erstellt oder aktualisiert werden
- **THEN** SHALL die Nutri-Score-Verteilung als `{A,B,C,D,E}`-Zähler enthalten sein

#### Scenario: Zu wenige Rezepte
- **WHEN** weniger als 10 veröffentlichte Rezepte eines `recipe_type` existieren
- **THEN** SHALL kein `RecipeTypeStats`-Eintrag bestehen und ein eventuell vorhandener gelöscht werden

### Requirement: Cache-Invalidierung der Typ-Statistiken
Das System SHALL die `RecipeTypeStats` eines `recipe_type` neu berechnen, wenn ein Rezept dieses Typs erstellt, aktualisiert (relevante Cache-Felder) oder gelöscht wird.

#### Scenario: Rezept gespeichert
- **WHEN** ein Rezept mit `recipe_type=X` gespeichert oder gelöscht wird
- **THEN** SHALL die `RecipeTypeStats` für Typ X neu berechnet werden

### Requirement: Öffentlicher Benchmark-Endpunkt
Das System SHALL einen öffentlichen Endpunkt `GET /api/recipes/type-stats/{recipe_type}/` bereitstellen, der die aggregierten Statistiken inkl. Histogramm-Buckets zurückgibt. Der Endpunkt SHALL ohne Authentifizierung erreichbar und nicht paginiert sein.

#### Scenario: Statistiken abrufen
- **WHEN** ein beliebiger Nutzer den Endpunkt für einen Typ mit vorhandenen Statistiken aufruft
- **THEN** SHALL die Antwort min/max/avg/median, Bucket-Arrays (price/energy/protein) und die Nutri-Score-Verteilung enthalten

#### Scenario: Keine Statistiken vorhanden
- **WHEN** für den Typ keine Statistiken existieren (< 10 Rezepte)
- **THEN** SHALL der Endpunkt eine leere/None-Antwort liefern, ohne Fehler
