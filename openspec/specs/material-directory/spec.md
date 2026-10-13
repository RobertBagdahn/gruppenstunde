# material-directory Specification

## Purpose
TBD - created by archiving change recipe-materials-consumables. Update Purpose after archive.
## Requirements
### Requirement: Einheitliches Material-Verzeichnis
Das System SHALL Geräte und Verbrauchsmaterial ausschließlich als `Material` führen; `is_consumable` MUST Verbrauchsmaterial (Pappteller) von Geräten (Backofen) unterscheiden. Ein separates `Equipment`-Modell SHALL nicht existieren.

#### Scenario: Gerät und Verbrauchsmaterial
- **WHEN** „Backofen“ mit `is_consumable=false` und „Pappteller“ mit `is_consumable=true` angelegt werden
- **THEN** liefert die API beide mit Flag, Kategorie und Slug

### Requirement: Materialfelder
Ein Material SHALL Name, Kategorie, `is_consumable`, optional Packungsgröße mit Einheit, optional Preis pro Packung und optional einen Einkaufs-Abschnitt speichern.

#### Scenario: Pappteller mit Packung
- **WHEN** ein Material „Pappteller“ mit Packungsgröße 50 Stück und Preis 3,00 € angelegt wird
- **THEN** gibt die API den Stückpreis 0,06 € zurück

#### Scenario: Ohne Preis
- **WHEN** ein Material ohne Preis angelegt wird
- **THEN** wird es akzeptiert und hat keinen Stückpreis

### Requirement: Anlegen und Pflegen
Jeder eingeloggte Nutzer SHALL Material direkt anlegen und eigenes Material bearbeiten dürfen. Admins SHALL jedes Material bearbeiten, löschen und Duplikate zusammenführen dürfen. Nicht eingeloggte Nutzer MUST Material lesen, aber nicht ändern dürfen.

#### Scenario: Nutzer legt Material an
- **WHEN** ein eingeloggter Nutzer „Zahnstocher“ anlegt
- **THEN** ist es sofort für alle sichtbar

#### Scenario: Anonymes Anlegen
- **WHEN** ein nicht eingeloggter Nutzer ein Material anlegt
- **THEN** antwortet die API mit HTTP 401

#### Scenario: Fremdes Material bearbeiten
- **WHEN** ein Nutzer, der kein Admin ist, fremdes Material ändert
- **THEN** antwortet die API mit HTTP 403

### Requirement: Duplikate vermeiden und zusammenführen
Beim Anlegen MUST ein Material mit gleichem normalisiertem Namen (Groß-/Kleinschreibung und Leerzeichen ignoriert) das vorhandene zurückgeben statt ein Duplikat zu erzeugen. Admins SHALL zwei Materialien zusammenführen können; alle Rezept-Verknüpfungen werden auf das Ziel umgehängt, die Quelle wird weich gelöscht.

#### Scenario: Gleicher Name
- **WHEN** „pappteller “ angelegt wird und „Pappteller“ existiert
- **THEN** wird das vorhandene Material zurückgegeben

#### Scenario: Zusammenführen
- **WHEN** ein Admin „Papp-Teller“ in „Pappteller“ zusammenführt
- **THEN** zeigen alle Rezepte auf „Pappteller“ und „Papp-Teller“ ist nicht mehr aufgelistet

### Requirement: Material-Seite im Food-Frontend
Das Food-Frontend SHALL eine öffentliche Seite „Material“ mit Suche, Filter (Verbrauch/Gerät, Kategorie), paginierter Liste, Detailseite und Anlegen/Bearbeiten bieten; Filter, Suche und Seite MUST im URL-State liegen. Die Seite MUST im Hauptmenü verlinkt und ab 320 px nutzbar sein. Das Haupt-Frontend MUST unverändert bleiben.

#### Scenario: Filter per URL
- **WHEN** `/material?consumable=true&q=teller` geöffnet wird
- **THEN** zeigt die Liste nur Verbrauchsmaterial mit „teller“ im Namen

#### Scenario: Detail mit Rezepten
- **WHEN** die Detailseite von „Backofen“ geöffnet wird
- **THEN** werden die Rezepte, die ihn benötigen, verlinkt

### Requirement: Migration und Seed
Eine Datenmigration SHALL jedes vorhandene `Equipment` als nicht verbrauchendes `Material` übernehmen und Rezept-Zuordnungen als Verknüpfung mit Menge 1 erhalten. Ein idempotenter Command `seed_materials` MUST gängige Materialien anlegen und einen Dry-run unterstützen.

#### Scenario: Equipment migriert
- **GIVEN** Rezept R mit Equipment „Topf“
- **WHEN** die Migration läuft
- **THEN** hat R ein Material „Topf“ (`is_consumable=false`, Menge 1)

#### Scenario: Seed zweimal
- **WHEN** `seed_materials` zweimal läuft
- **THEN** entstehen keine Duplikate
