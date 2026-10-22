# Spec Delta

## Purpose

Legt fest, welches Markup die öffentlichen Seiten des Food-Frontends für Suchmaschinen und Social-Vorschauen liefern: Titel, Beschreibung, Überschriften, Brotkrumen, strukturierte Daten, Indexierbarkeit und echte Links. Das Rendering auf dem Server ist nicht Teil dieser Capability.

## ADDED Requirements

### Requirement: Eindeutiger Titel und Beschreibung je Seite
Jede Seite des Food-Frontends SHALL einen eigenen `<title>` (höchstens 60 Zeichen, Muster „<Seite> | Inspi Food“) und eine eigene Meta-Beschreibung (höchstens 160 Zeichen) setzen sowie Open-Graph- und Twitter-Card-Tags (`og:title`, `og:description`, `og:type`, `og:url`, `og:image` wenn vorhanden). Titel und Beschreibung MUST beim Seitenwechsel aktualisiert werden.

#### Scenario: Rezeptseite
- **WHEN** ein Rezept „Chili sin Carne“ geöffnet wird
- **THEN** lautet der Titel „Chili sin Carne – Rezept für Gruppen | Inspi Food“ und die Beschreibung stammt aus der Rezept-Zusammenfassung

#### Scenario: Seitenwechsel
- **WHEN** der Nutzer von der Rezeptliste zur Planliste navigiert
- **THEN** ändern sich Titel und Beschreibung entsprechend

#### Scenario: Gefilterte Liste
- **WHEN** die Rezeptliste mit Filter „Frühstück“ und `page=2` geöffnet ist
- **THEN** nennt der Titel Filter und Seitenzahl

### Requirement: Eine H1 und saubere Überschriftenfolge
Jede Seite SHALL genau eine H1 enthalten, die den Seiteninhalt benennt. Überschriften MUST ohne übersprungene Ebenen aufeinander folgen (H1, dann H2, dann H3). Das Logo ist keine Überschrift.

#### Scenario: Eine H1 pro Seite
- **WHEN** eine beliebige Seite gerendert ist
- **THEN** enthält sie genau ein H1-Element und keine Ebene ist übersprungen

### Requirement: Brotkrumen mit strukturierten Daten
Listen- und Detailseiten SHALL zusätzlich zu den sichtbaren Brotkrumen ein JSON-LD-Objekt `BreadcrumbList` ausgeben, dessen Glieder mit den sichtbaren Brotkrumen übereinstimmen.

#### Scenario: Strukturierte Brotkrumen
- **WHEN** ein Rezept geöffnet wird
- **THEN** enthält die Seite ein gültiges `BreadcrumbList`-JSON-LD mit den Gliedern Rezepte, Rezepttyp, Titel

### Requirement: Rezept als strukturierte Daten
Die Rezeptdetailseite SHALL ein JSON-LD-Objekt `Recipe` ausgeben mit Name, Beschreibung, Bild (falls vorhanden), Gesamtzeit, Portionen (`recipeYield`), Zutaten (`recipeIngredient`), Schritten (`recipeInstructions` als `HowToStep`) und Kalorien je Portion (`nutrition`). Alle Werte MUST mit dem sichtbaren Seiteninhalt übereinstimmen; fehlende Werte werden weggelassen, nie erfunden.

#### Scenario: Vollständiges Rezept
- **WHEN** ein Rezept mit Zutaten, Schritten und Nährwerten geöffnet wird
- **THEN** enthält die Seite ein `Recipe`-JSON-LD mit allen vorhandenen Feldern

#### Scenario: Rezept ohne Bild
- **WHEN** ein Rezept kein Bild hat
- **THEN** fehlt das Feld `image` im JSON-LD

### Requirement: Indexierbarkeit öffentlicher und privater Seiten
Öffentliche Seiten (Start, Rezeptliste, Rezeptdetail, Zutatenliste, Zutatdetail, Rechtliches) SHALL `index,follow` melden. Private und ablaufbezogene Seiten (Essenspläne, Einkaufslisten, Beitritts-Links, Profil, Konto, Login, Registrierung, Erstellen, Bearbeiten, Assistenten, Kochmodus, Administration) MUST `noindex,nofollow` melden.

#### Scenario: Öffentliche Seite
- **WHEN** ein Rezept geöffnet wird
- **THEN** meldet die Seite `index,follow`

#### Scenario: Private Seite
- **WHEN** ein Essensplan geöffnet wird
- **THEN** enthält die Seite `<meta name="robots" content="noindex,nofollow">`

### Requirement: Gefilterte Listen und Canonical
Listen mit Suche, Filter oder Sortierung MUST `noindex,follow` melden und per `rel="canonical"` auf die Liste ohne diese Parameter verweisen. Der Parameter `page` bleibt Teil der Canonical-URL.

#### Scenario: Gefilterte Liste
- **WHEN** `/recipes?q=chili&sort=newest` geöffnet wird
- **THEN** meldet die Seite `noindex,follow` und verweist per Canonical auf `/recipes`

#### Scenario: Seitenzahl
- **WHEN** `/recipes?page=2` geöffnet wird
- **THEN** zeigt die Canonical-URL `/recipes?page=2`

### Requirement: Echte Links für Navigation und Seitenzahlen
Karten, Brotkrumen, Kategorie-Chips und Seitenzahlen SHALL als `<a href>` mit der Ziel-URL gerendert werden, damit Suchmaschinen und Nutzer Ziele ohne JavaScript-Handler erkennen. Seitenzahlen MUST auf `?page=N` verweisen.

#### Scenario: Seitenzahl als Link
- **WHEN** die Pagination der Rezeptliste gerendert wird
- **THEN** ist jede Seitenzahl ein Link mit `href` auf `/recipes?page=N`

### Requirement: robots.txt für das Food-Frontend
Das Food-Frontend SHALL unter `/robots.txt` Regeln liefern, die private Pfade (`/meal-plans`, `/shopping-lists`, `/profile`, `/admin`, `/login`, `/register`, `/api`) sperren und öffentliche Pfade erlauben.

#### Scenario: robots.txt abrufen
- **WHEN** `/robots.txt` abgerufen wird
- **THEN** sind die privaten Pfade gesperrt und die Rezept- und Zutatenpfade erlaubt

### Requirement: Stabiles Laden ohne Layoutverschiebung
Bilder SHALL mit festem Seitenverhältnis oder Breite und Höhe ausgeliefert werden, das größte sichtbare Bild der Seite MUST nicht per `loading="lazy"` geladen werden, und die Schriften MUST so eingebunden sein, dass der Wechsel von Ersatz- zu Webschrift keine sichtbare Layoutverschiebung verursacht.

#### Scenario: Rezeptdetail
- **WHEN** die Rezeptdetailseite lädt
- **THEN** reserviert das Hauptbild seinen Platz, bevor es geladen ist, und verschiebt nachfolgenden Inhalt nicht
