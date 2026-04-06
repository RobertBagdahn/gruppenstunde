# packing-list Specification

## Purpose

Packlisten-Tool fuer Pfadfinder-Gruppenfuehrer. Ermoeglicht das Erstellen, Kategorisieren und Teilen von Packlisten fuer verschiedene Zwecke (Hajk, Sommerlager, Wochenende, etc.). Packlisten sind oeffentlich teilbar per Link, aber nur editierbar fuer den Owner und Gruppen-Admins.

## Context

- **Django App**: `packinglist`
- **API**: `/api/packing-lists/`
- **Frontend-Routen**: `/packing-lists`, `/packing-lists/:id`
- **Datenstruktur**: Packliste -> Kategorien -> Items

## Requirements

### Requirement: Packliste CRUD

Das System MUST vollstaendige CRUD-Operationen fuer Packlisten ueber `/api/packing-lists/` bereitstellen.

#### Scenario: Packliste erstellen

- GIVEN ein authentifizierter Benutzer
- WHEN der Benutzer POST `/api/packing-lists/` mit Titel und optionaler Beschreibung absendet
- THEN wird eine Packliste mit dem Benutzer als Owner erstellt

#### Scenario: Packliste per ID abrufen (oeffentlich)

- GIVEN eine existierende Packliste
- WHEN ein beliebiger Benutzer (auch nicht-authentifiziert) GET `/api/packing-lists/{id}` aufruft
- THEN werden die vollstaendigen Packlisten-Details inkl. Kategorien und Items zurueckgegeben
- AND die Packliste ist ohne Login einsehbar (oeffentlich teilbar per Link)

#### Scenario: Packliste aktualisieren (nur Owner/Gruppen-Admin)

- GIVEN eine Packliste mit einem Owner
- WHEN der Owner oder ein Gruppen-Admin PUT `/api/packing-lists/{id}` absendet
- THEN wird die Packliste aktualisiert

#### Scenario: Unbefugter Bearbeitungsversuch

- GIVEN ein Benutzer, der weder Owner noch Gruppen-Admin ist
- WHEN der Benutzer versucht die Packliste zu bearbeiten
- THEN gibt das System 403 Forbidden zurueck

#### Scenario: Packliste loeschen (nur Owner)

- GIVEN der Packlisten-Owner
- WHEN der Owner DELETE `/api/packing-lists/{id}` aufruft
- THEN wird die Packliste mit allen Kategorien und Items entfernt

### Requirement: Kategorien-Verwaltung

Das System SHALL Kategorien innerhalb einer Packliste unterstuetzen.

#### Scenario: Kategorie hinzufuegen

- GIVEN eine Packliste
- WHEN der Owner eine Kategorie mit Name hinzufuegt
- THEN wird die Kategorie innerhalb der Packliste erstellt
- AND die Kategorie hat eine Sortierreihenfolge

#### Scenario: Kategorie umbenennen

- GIVEN eine bestehende Kategorie
- WHEN der Owner den Namen aendert
- THEN wird der Kategoriename aktualisiert

#### Scenario: Kategorie loeschen

- GIVEN eine Kategorie mit Items
- WHEN der Owner die Kategorie loescht
- THEN werden die Kategorie und alle zugehoerigen Items entfernt

#### Scenario: Kategorien sortieren

- GIVEN eine Packliste mit mehreren Kategorien
- WHEN der Owner die Reihenfolge der Kategorien aendert
- THEN wird die Sortierreihenfolge (`sort_order`) aktualisiert

### Requirement: Item-Verwaltung

Das System SHALL Items innerhalb einer Kategorie unterstuetzen.

#### Scenario: Item hinzufuegen

- GIVEN eine Kategorie innerhalb einer Packliste
- WHEN der Owner ein Item mit Name und optionaler Menge/Beschreibung hinzufuegt
- THEN wird das Item in der Kategorie erstellt

#### Scenario: Item bearbeiten

- GIVEN ein bestehendes Item
- WHEN der Owner Name, Menge oder Beschreibung aendert
- THEN wird das Item aktualisiert

#### Scenario: Item loeschen

- GIVEN ein bestehendes Item
- WHEN der Owner das Item loescht
- THEN wird das Item aus der Kategorie entfernt

#### Scenario: Items sortieren

- GIVEN eine Kategorie mit mehreren Items
- WHEN der Owner die Reihenfolge aendert
- THEN wird die Sortierreihenfolge (`sort_order`) aktualisiert

#### Scenario: Item abhaken (is_checked)

- GIVEN ein bestehendes Item in einer Packliste
- WHEN der Benutzer das Item als gepackt markiert
- THEN wird `is_checked` auf `true` gesetzt
- AND der Fortschritt der Kategorie/Packliste wird aktualisiert

### Requirement: Berechtigungen und Teilen

Das System SHALL ein einfaches Berechtigungsmodell fuer Packlisten unterstuetzen.

#### Scenario: Oeffentliches Anzeigen

- GIVEN eine Packliste mit einer URL
- WHEN ein beliebiger Benutzer (auch ohne Login) die URL aufruft
- THEN wird die Packliste vollstaendig angezeigt (Lese-Zugriff)

#### Scenario: Owner darf editieren

- GIVEN der Packlisten-Owner
- WHEN der Owner die Packliste oeffnet
- THEN werden Bearbeitungsfunktionen (Hinzufuegen, Bearbeiten, Loeschen) angezeigt

#### Scenario: Gruppen-Admin darf editieren

- GIVEN eine Packliste, die einer Gruppe zugeordnet ist
- WHEN ein Gruppen-Admin (Rolle "admin" in GroupMembership) die Packliste oeffnet
- THEN werden Bearbeitungsfunktionen angezeigt

#### Scenario: Normaler Benutzer sieht nur Leseansicht

- GIVEN ein authentifizierter Benutzer, der weder Owner noch Gruppen-Admin ist
- WHEN der Benutzer die Packliste oeffnet
- THEN wird nur die Leseansicht ohne Bearbeitungsfunktionen angezeigt

### Requirement: Gruppen-Zuordnung (optional)

Das System MAY die Zuordnung einer Packliste zu einer UserGroup unterstuetzen.

#### Scenario: Packliste einer Gruppe zuordnen

- GIVEN eine Packliste und eine UserGroup
- WHEN der Owner die Packliste einer Gruppe zuordnet
- THEN koennen Gruppen-Admins die Packliste ebenfalls editieren

#### Scenario: Eigene Packlisten auflisten

- GIVEN ein authentifizierter Benutzer
- WHEN der Benutzer GET `/api/packing-lists/` aufruft
- THEN werden alle Packlisten zurueckgegeben, die der Benutzer erstellt hat oder bei denen er Gruppen-Admin ist

### Requirement: Vorlagen-System (Templates)

Das System MUST Packlisten-Vorlagen bereitstellen, die als Ausgangspunkt fuer eigene Packlisten dienen.

#### Scenario: Vorlagen auflisten

- GIVEN ein authentifizierter oder nicht-authentifizierter Benutzer
- WHEN der Benutzer GET `/api/packing-lists/templates/` aufruft
- THEN werden alle als Vorlage markierten Packlisten zurueckgegeben

#### Scenario: Vorlage klonen

- GIVEN eine Packlisten-Vorlage (is_template=True)
- WHEN ein authentifizierter Benutzer POST `/api/packing-lists/{id}/clone/` aufruft
- THEN wird eine vollstaendige Kopie der Packliste erstellt (alle Kategorien + Items)
- AND der Benutzer wird Owner der neuen Packliste
- AND `is_template` ist `false` bei der neuen Packliste
- AND alle `is_checked` Felder werden auf `false` zurueckgesetzt

#### Scenario: Eigene Packliste klonen

- GIVEN eine eigene Packliste
- WHEN der Benutzer POST `/api/packing-lists/{id}/clone/` aufruft
- THEN wird eine Kopie mit Titel "Kopie von {original_title}" erstellt

#### Scenario: Seed-Vorlagen

- GIVEN eine frische Datenbankinstallation
- WHEN `uv run python manage.py seed_packing_lists` ausgefuehrt wird
- THEN werden mindestens 10 vordefinierte Vorlagen-Packlisten erstellt
- AND die Vorlagen decken gaengige Pfadfinder-Szenarien ab (Hajk, Zeltlager, Sommerlager, etc.)

### Requirement: Export

Das System MUST Packlisten in verschiedenen Formaten exportierbar machen.

#### Scenario: Text-Export

- GIVEN eine Packliste mit Kategorien und Items
- WHEN der Benutzer GET `/api/packing-lists/{id}/export/text/` aufruft
- THEN wird ein formatierter Plaintext zurueckgegeben (Titel, Kategorien mit Items, Checkboxen)

#### Scenario: PDF-Export (Client-seitig)

- GIVEN eine Packliste im Frontend
- WHEN der Benutzer den "PDF exportieren" Button klickt
- THEN wird client-seitig ein PDF mit allen Kategorien und Items generiert
- AND das PDF hat ein ansprechendes Layout mit Checkboxen

### Requirement: Fortschritts-Tracking

Das System SHOULD den Packfortschritt einer Packliste anzeigen.

#### Scenario: Fortschrittsanzeige

- GIVEN eine Packliste mit Items, von denen einige abgehakt sind
- WHEN der Benutzer die Packliste oeffnet
- THEN wird ein Fortschrittsbalken pro Kategorie und fuer die Gesamtliste angezeigt (z.B. "12/25 gepackt")

#### Scenario: Alle abhaken / abwaehlen

- GIVEN eine Packliste
- WHEN der Benutzer "Alle zuruecksetzen" klickt
- THEN werden alle `is_checked` Felder auf `false` gesetzt

### Requirement: Hilfreiche Zusatzfunktionen

#### Scenario: Packliste drucken

- GIVEN eine Packliste im Frontend
- WHEN der Benutzer den "Drucken" Button klickt
- THEN wird die Browser-Druckfunktion geoeffnet mit druckfreundlichem Layout

#### Scenario: Text in Zwischenablage kopieren

- GIVEN eine Packliste im Frontend
- WHEN der Benutzer den "Als Text kopieren" Button klickt
- THEN wird die Packliste als formatierter Text in die Zwischenablage kopiert

## Datenmodell

### PackingList
- `id` (auto)
- `title` (CharField, max 200)
- `description` (TextField, blank, default="")
- `owner` (FK -> User, CASCADE)
- `group` (FK -> UserGroup, SET_NULL, nullable)
- `is_template` (BooleanField, default=False) -- Vorlage-Flag
- `created_at` (auto_now_add)
- `updated_at` (auto_now)

### PackingCategory
- `id` (auto)
- `packing_list` (FK -> PackingList, CASCADE)
- `name` (CharField, max 200)
- `sort_order` (IntegerField, default=0)
- `created_at`, `updated_at`

### PackingItem
- `id` (auto)
- `category` (FK -> PackingCategory, CASCADE)
- `name` (CharField, max 200)
- `quantity` (CharField, max 50, blank, default="")
- `description` (CharField, max 500, blank, default="")
- `is_checked` (BooleanField, default=False) -- Abhak-Status
- `sort_order` (IntegerField, default=0)
- `created_at`, `updated_at`

## API-Endpunkte

```
# Bestehende CRUD-Endpunkte (13 Stueck) -- siehe oben

# Neue Endpunkte
GET    /api/packing-lists/templates/                   -> Vorlagen auflisten (oeffentlich)
POST   /api/packing-lists/{id}/clone/                  -> Packliste klonen (auth)
GET    /api/packing-lists/{id}/export/text/             -> Text-Export (oeffentlich)
POST   /api/packing-lists/{id}/reset-checks/            -> Alle is_checked zuruecksetzen (auth + edit)
```

## Seed-Vorlagen (mindestens 10)

1. **Wochenend-Wanderung** -- 2-Tages-Hajk, leichtes Gepaeck
2. **Hausuebnachtung** -- Uebernachtung in einem Haus/Pfadfinderheim
3. **Zeltlager-Wochenende** -- Wochenend-Zeltlager mit Kochen
4. **Zeltlager-Langes Wochenende** -- 3-4 Tage Zeltlager
5. **Sommerlager (1 Woche)** -- Grosses Sommerlager mit allem
6. **Tageswanderung** -- Leichter Tagesausflug
7. **Winter-Hajk** -- Winterwanderung mit Kaelteschutz
8. **Kochfahrt** -- Fokus auf Fahrtenekueche
9. **Singerunde / Lagerfeuer** -- Musikinstrumente, Liederbucher
10. **Pfingstlager** -- Mehrtaegiges Lager im Fruehling
11. **Elternabend / Gruppenstunde** -- Minimale Packliste fuer regelmaessige Treffen
12. **Grossfahrt (2+ Wochen)** -- Ausfuehrliche Liste fuer lange Fahrten

### Seed-Kategorien und Items

Die Seed-Daten verwenden folgende Kategorien mit den vom Benutzer bereitgestellten Items:

- **Kleidung**: Wandersocken, Unterhose, T-Shirt, Klufthemd, Hose, Gürtel, Pullover, Regenjacke, Regenhose, Poncho, Wanderschuhe
- **Kulturbeutel**: Zahnpasta, Waschzeug, Zahnbürste, Handtuch, Rasierzeug, Feuchtigkeitscreme, Lippenpflegestift, Klopapier
- **Lager/Fahrt**: Schlafsack, Isomatte, Poncho/Plane, Essgeschirr, Wasserreserve, Tasse, Spülmittel
- **Hausfahrt**: Hausschuhe, Betttuch, Bettzeug
- **Fahrtenküche**: Topf, Teebeutel, Müllbeutel, Gewürze-Set, Salz, Zucker, Pfeffer, Paprika, Streichhölzer/Feuerzeug, Spülschwamm, Kochlöffel, Spültuch, Trangia, Klopapier
- **Navigator**: Kompass, Geodreieck, Planzeiger, Wanderkarte, Kartentasche, Schnur, Schrittzähler, GPS-Gerät
- **AB-Päckchen**: Alufolie, Geldbörse, Klebeband, Sicherheitsnadel, Nähnadel, Nähgarn, Heftzwecke, Schnur, Seil, Draht, Kreide, Bleistift, Zunder, Kerze, Stirnlampe, Pflaster, Zeckenzange, Feuermaterial, USB-Ladegerät, Powerbank, Ersatzbatterien, Thermometer, Plastiktüte
- **Sommer**: Badehose, Badetuch, Sonnenbrille, Sonnencreme, Sandalen, Kopfbedeckung, extra Wasserflasche
- **Winter**: Handschuhe, Schal, Mütze
- **Länger als 3 Tage**: Waschmittel, Tagesrucksack
- **Sippengepäck**: Sippenwimpel, Beil, Säge, Kohtenplanen, Sippenkasse, Erste-Hilfe Pack
- **Singerunde**: Musikinstrument, Liederbücher, Stimmgerät
- **Sonstiges**: Zweite Isomatte, Feldflasche, Lederhandschuhe, Fotokamera, Smartphone, Mückenschutz, kleiner Rucksack, Impfpass/Allergiepass
