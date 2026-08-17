## ADDED Requirements

### Requirement: Deckblatt mit Logo und Metadaten
Das PDF SHALL ein Deckblatt enthalten mit Inspi-Logo (global konfiguriert via Django Settings), Plan-Name, Zeitraum (d. MMMM yyyy – d. MMMM yyyy), Norm-Portionen, Reservefaktor und Gesamtskalierungsfaktor.

#### Scenario: Deckblatt mit Logo
- **WHEN** das PDF generiert wird
- **THEN** die erste Seite SHALL das Inspi-Logo zentriert oben zeigen
- **THEN** darunter SHALL Plan-Name, Zeitraum, Norm-Portionen, Reservefaktor und Skalierungsfaktor stehen
- **THEN** das Logo SHALL aus den Django Settings (`INSPI_LOGO_PATH`) geladen werden

#### Scenario: Keine Logo-Datei vorhanden
- **WHEN** das Logo nicht gefunden wird oder nicht konfiguriert ist
- **THEN** das Deckblatt SHALL ohne Logo, aber mit allen Metadaten gerendert werden

---

### Requirement: Personenliste mit Allergien und Besonderheiten
Das PDF SHALL nach dem Deckblatt eine Tabelle aller Gruppenmitglieder (MealPlanGroupMember) enthalten mit Name, Alter, Geschlecht und besonderen Ernährungsanforderungen (NutritionalTags).

#### Scenario: Personenliste mit Ernährungs-Tags
- **WHEN** der MealPlan GroupMembers mit NutritionalTags hat
- **THEN** die Tabelle SHALL pro Zeile Name, Alter, Geschlecht und alle NutritionalTags (kommagetrennt) anzeigen
- **THEN** die Spalten SHALL „Name", „Alter", „Geschlecht", „Allergien / Besonderheiten" heißen

#### Scenario: Keine Gruppenmitglieder vorhanden
- **WHEN** der MealPlan keine GroupMembers hat
- **THEN** die Personenliste SHALL eine Zeile mit „Keine Personen definiert — Norm-Portionen: X" anzeigen
- **THEN** Norm-Portionen SHALL aus dem MealPlan-Feld `norm_portions` stammen

#### Scenario: Personen mit date_ranges für Teilzeit-Anwesenheit
- **WHEN** ein GroupMember date_ranges hat
- **THEN** SHALL der Zeitraum in Klammern hinter dem Namen angezeigt werden (z. B. „Anna (12.–14.07.)")

---

### Requirement: Tag-pro-Seite Layout mit Running Headers
Das PDF SHALL jeden Tag auf einer neuen Seite beginnen. Running Headers SHALL den Plan-Namen links und den aktuellen Tag rechts auf jeder Seite anzeigen.

#### Scenario: Tag beginnt auf neuer Seite
- **WHEN** das PDF gerendert wird
- **THEN** jeder Tag SHALL mit `page-break-before: always` auf einer neuen Seite starten
- **THEN** der erste Tag SHALL keine überflüssige Leerseite davor haben

#### Scenario: Running Header auf jeder Seite
- **WHEN** das PDF mehrere Seiten hat
- **THEN** oben auf jeder Seite SHALL der Plan-Name links stehen
- **THEN** oben auf jeder Seite SHALL der aktuelle Tag („Tag 1: Montag, 12.07.2026") rechts stehen
- **THEN** die Kopfzeile SHALL durch eine dünne Linie vom Inhalt getrennt sein

---

### Requirement: Essens-Boxen mit Exchange-Split-Varianten
Jede Mahlzeit SHALL in einer umrandeten Box (border) dargestellt werden. Bei Exchange-Splits SHALL jede Variante als eigener Block mit voller Zutatenliste und Portionsangabe erscheinen. Notizbereiche (3–4 cm) SHALL rechts neben jeder Essens-Box stehen.

#### Scenario: Einfache Mahlzeit ohne Splits
- **WHEN** eine Mahlzeit ein Rezept ohne Exchange-Splits hat
- **THEN** die Essens-Box SHALL Mahlzeit-Typ (z. B. „FRÜHSTÜCK"), Uhrzeit, Rezeptname und vollständige Zutatenliste zeigen

#### Scenario: Exchange-Split als separate Blöcke
- **WHEN** eine Mahlzeit 8 Portionen Parmesan und 2 Portionen Cashew als Exchange-Splits hat
- **THEN** SHALL ein Block „Variante Parmesan — 8 Portionen" mit voller Zutatenliste erscheinen
- **THEN** SHALL ein Block „Variante Cashew — 2 Portionen" mit voller Zutatenliste erscheinen
- **THEN** beide Blöcke SHALL den gleichen Mahlzeit-Typ-Header teilen

#### Scenario: Notizbereich neben jeder Mahlzeit
- **WHEN** `include_notes=true` (Default)
- **THEN** rechts neben jeder Essens-Box SHALL ein 3–4 cm breiter Notizbereich mit dem Label „Notizen" erscheinen
- **THEN** der Notizbereich SHALL hellgrau hinterlegt sein

#### Scenario: Notizbereich ausgeblendet
- **WHEN** `include_notes=false`
- **THEN** die Essens-Box SHALL die volle Breite einnehmen ohne Notizbereich

#### Scenario: Tagesende-Notizlinien
- **WHEN** `include_notes=true` (Default)
- **THEN** am Ende jedes Tages SHALLEN 3 horizontale Linien für handschriftliche Notizen erscheinen

---

### Requirement: Koch-Zeitplan pro Tag
Am Ende jedes Tag-Blocks SHALL ein Zeitplan erscheinen, der Rezepte mit Vorlaufzeit (z. B. Hefeteig, Marinieren) als Zeitstrahl darstellt.

#### Scenario: Rezept mit Vorlaufzeit
- **WHEN** ein Rezept eine Zubereitungszeit > 60 Minuten oder spezielle Vorlauf-Anweisungen hat
- **THEN** SHALL es im Koch-Zeitplan des Tages mit Startzeit und Aktion erscheinen (z. B. „06:00 — Hefeteig ansetzen")

#### Scenario: Keine Rezepte mit Vorlaufzeit
- **WHEN** kein Rezept des Tages Vorlaufzeit benötigt
- **THEN** der Koch-Zeitplan-Abschnitt SHALL ausgeblendet werden

#### Scenario: Koch-Zeitplan bei compact_mode
- **WHEN** `compact_mode=true`
- **THEN** der Koch-Zeitplan-Abschnitt SHALL ausgeblendet werden

---

### Requirement: Ausgeschlossene Zutaten und Ingredient-Overrides
Das PDF SHALL Ingredient-Overrides des MealPlan respektieren — ausgeschlossene Zutaten (share=0.0 oder explizit excluded) werden in keinem Block, keiner Einkaufsliste und keiner Nährwertberechnung aufgeführt.

#### Scenario: Optionale Zutat ausgeschlossen
- **WHEN** eine Mahlzeit eine optionale Zutat mit share 0.0 hat
- **THEN** diese Zutat SHALL in der Essens-Box, der Einkaufsliste und der Nährwert-Übersicht NICHT erscheinen

#### Scenario: Manueller Ingredient-Override
- **WHEN** eine Zutat via IngredientOverride von der Einkaufsliste exkludiert wurde
- **THEN** sie SHALL in der Einkaufsliste NICHT erscheinen
- **THEN** sie SHALL in der Essens-Box mit dem Hinweis „(entfernt)" erscheinen

---

### Requirement: Einkaufsliste kategorisiert nach RetailSection
Das PDF SHALL eine Einkaufsliste enthalten, die Zutaten nach RetailSection gruppiert (Obst & Gemüse, Milchprodukte, Backwaren, etc.). Jede Zutat SHALL mit Name und Gesamtmenge aufgeführt werden. Frische Zutaten (Fleisch, Fisch, frische Kräuter) SHALL mit einem „🥬 frisch"-Marker hervorgehoben werden.

#### Scenario: Kategorisierte Einkaufsliste
- **WHEN** das PDF eine Einkaufsliste enthält
- **THEN** die Zutaten SHALLEN nach ihrer RetailSection gruppiert sein
- **THEN** die Gruppen SHALLEN alphabetisch nach RetailSection-Name sortiert sein
- **THEN** innerhalb jeder Gruppe SHALLEN die Zutaten alphabetisch sortiert sein

#### Scenario: Zutat ohne RetailSection
- **WHEN** eine Zutat keiner RetailSection zugeordnet ist
- **THEN** sie SHALL unter der Gruppe „Sonstiges" erscheinen

#### Scenario: Frische-Zutat-Marker
- **WHEN** eine Zutat eine RetailSection wie „Fleisch", „Fisch", „Frische Kräuter" oder „Frischgemüse" hat
- **THEN** SHALL sie mit dem Marker „🥬 frisch" gekennzeichnet werden

#### Scenario: Pro-Tag und Gesamtsumme
- **WHEN** die Einkaufsliste gerendert wird
- **THEN** SHALL sie Sektionen enthalten: „Pro Tag" (mit Tagesgruppen) und „Gesamt" (mit kategorisierten Summen)
- **THEN** die Pro-Tag-Liste SHALL ebenfalls nach RetailSection kategorisiert sein (nicht flach alphabetisch)
- **THEN** unter „Gesamt" SHALL die Anzahl aller Zutaten und die Anzahl frischer Zutaten angezeigt werden

#### Scenario: Einkaufsliste ausgeblendet
- **WHEN** `exclude_shopping_list=true`
- **THEN** die Einkaufsliste SHALL NICHT im PDF erscheinen

---

### Requirement: Allergen-Matrix mit 14 EU-Allergenen
Das PDF SHALL eine Kreuztabelle enthalten: Tage als Spalten, die 14 EU-kennzeichnungspflichtigen Allergene als Zeilen. Ein „X" markiert Tage, an denen ein Allergen in den Mahlzeiten vorkommt.

#### Scenario: Allergen-Matrix
- **WHEN** das PDF eine Allergen-Matrix enthält
- **THEN** die Zeilen SHALLEN folgende Allergene enthalten: Gluten, Krebstiere, Eier, Fisch, Erdnüsse, Soja, Milch/Laktose, Schalenfrüchte, Sellerie, Senf, Sesam, Sulfite, Lupinen, Weichtiere
- **THEN** die Spalten SHALLEN die im Plan enthaltenen Tage sein
- **THEN** ein „X" SHALL in der Zelle stehen, wenn das Allergen in mindestens einer Mahlzeit des Tages vorkommt

#### Scenario: Kein Allergen im Plan
- **WHEN** kein Allergen im Plan vorkommt
- **THEN** die Matrix SHALL „Keine Allergene gefunden" anzeigen

#### Scenario: Allergen-Matrix ausgeblendet
- **WHEN** `exclude_allergens=true`
- **THEN** die Allergen-Matrix SHALL NICHT im PDF erscheinen

---

### Requirement: Nährwert-Übersicht mit Soll/Ist/Delta
Das PDF SHALL eine Nährwert-Tabelle pro Tag enthalten mit Soll (Personenzahl × DGE-Norm), Ist (Summe aller Rezepte) und Delta für Energie (kcal), Eiweiß (g), Fett (g) und Kohlenhydrate (g).

#### Scenario: Nährwert-Tabelle pro Tag
- **WHEN** `exclude_nutrition=false` (Default)
- **THEN** für jeden Tag SHALL eine Tabelle mit den Spalten „Energie (kcal)", „Eiweiß (g)", „Fett (g)", „KH (g)" erscheinen
- **THEN** jede Spalte SHALL drei Zeilen enthalten: Soll, Ist, Delta
- **THEN** Soll SHALL auf der effektiven Personenzahl des Tages (inkl. date_ranges) × DGE-Referenzwerten basieren
- **THEN** Ist-Zahlen SHALL aus den `cached_energy_kcal`, `cached_protein_g`, `cached_fat_g`, `cached_carbohydrate_g` der Rezepte summiert werden
- **THEN** negatives Delta SHALL in rot, positives in grün dargestellt werden

#### Scenario: Nährwerte ausgeblendet
- **WHEN** `exclude_nutrition=true`
- **THEN** die Nährwert-Tabellen SHALLEN NICHT im PDF erscheinen

---

### Requirement: Footer mit Seitenzahl und Plan-Referenz
Jede Seite SHALL einen Footer haben mit „Seite X von Y" (rechts) und Plan-Name + URL (links).

#### Scenario: Footer auf jeder Seite
- **WHEN** das PDF mehrere Seiten hat
- **THEN** der Footer SHALL auf jeder Seite erscheinen
- **THEN** links SHALL Plan-Name + Plan-URL (gruppenstunde.de/meal-plans/{slug}) stehen
- **THEN** rechts SHALL „Seite X von Y" stehen

---

### Requirement: Deutsche Locale-Formatierung
Das PDF SHALL durchgängig deutsche Formatierung verwenden.

#### Scenario: Deutsches Datum
- **WHEN** das PDF generiert wird
- **THEN** Datumsangaben SHALLEN im Format „Montag, 12.07.2026" (EEEE, dd.MM.yyyy) erscheinen
- **THEN** Monatsnamen SHALLEN auf Deutsch sein (Januar, Februar, etc.)
- **THEN** Wochentage SHALLEN auf Deutsch sein (Montag, Dienstag, etc.)

#### Scenario: Deutsche Zahlenformatierung
- **WHEN** Mengen im PDF dargestellt werden
- **THEN** Dezimalzahlen SHALLEN mit Komma formatiert sein (z. B. „1,5 kg" statt „1.5 kg")
- **THEN** Tausender SHALLEN einen Punkt als Trennzeichen haben (z. B. „1.500 g")

---

### Requirement: Query-Parameter zur Konfiguration
Der API-Endpunkt SHALL folgende Query-Parameter unterstützen: `include_notes` (Default true), `exclude_shopping_list` (Default false), `exclude_nutrition` (Default false), `exclude_allergens` (Default false), `compact_mode` (Default false), `page_format` (Default A4).

#### Scenario: Alle Parameter mit Default-Werten
- **WHEN** der Endpunkt ohne Query-Parameter aufgerufen wird
- **THEN** SHALL `include_notes=true`, `exclude_shopping_list=false`, `exclude_nutrition=false`, `exclude_allergens=false`, `compact_mode=false`, `page_format=A4` gelten

#### Scenario: Compact-Mode aktiviert
- **WHEN** `compact_mode=true`
- **THEN** Tage SHALLEN NICHT auf neuen Seiten beginnen
- **THEN** der Koch-Zeitplan SHALL ausgeblendet werden
- **THEN** Notizen und Einkaufsliste SHALLEN erhalten bleiben (falls nicht explizit deaktiviert)

#### Scenario: A4 als Standard-Seitenformat
- **WHEN** `page_format=A4` (Default) oder nicht angegeben
- **THEN** das PDF SHALL im A4-Format (210mm × 297mm) generiert werden

#### Scenario: Letter als Seitenformat
- **WHEN** `page_format=letter`
- **THEN** das PDF SHALL im US-Letter-Format (215.9mm × 279.4mm) generiert werden

#### Scenario: Ungültiger page_format
- **WHEN** ein ungültiger `page_format` (z. B. `page_format=A3`) übergeben wird
- **THEN** das System SHALL HTTP 422 mit deutscher Fehlermeldung zurückgeben

---

### Requirement: Nicht authentifizierter Zugriff und Fehlerfälle
Der PDF-Export SHALL nur für authentifizierte Nutzer mit Zugriff auf den MealPlan verfügbar sein.

#### Scenario: Nicht authentifiziert
- **WHEN** ein nicht authentifizierter Nutzer den Endpunkt aufruft
- **THEN** das System SHALL HTTP 403 mit „Anmeldung erforderlich" zurückgeben

#### Scenario: MealPlan nicht gefunden
- **WHEN** eine nicht existierende MealPlan-ID übergeben wird
- **THEN** das System SHALL HTTP 404 mit „Essensplan nicht gefunden" zurückgeben

#### Scenario: Kein Zugriff auf MealPlan
- **WHEN** ein Nutzer keinen Zugriff auf den MealPlan hat (weder Owner, Collaborator noch Group-Admin)
- **THEN** das System SHALL HTTP 403 mit „Kein Zugriff auf diesen Essensplan" zurückgeben

---

### Requirement: Server-seitige Generierung mit WeasyPrint
Das PDF SHALL server-seitig mit WeasyPrint aus einem Django-Template generiert werden.

#### Scenario: PDF als Download
- **WHEN** der Endpunkt erfolgreich aufgerufen wird
- **THEN** die Response SHALL `Content-Type: application/pdf` und `Content-Disposition: inline; filename="{slug}-essensplan.pdf"` haben
- **THEN** der Browser SHALL das PDF in einem Tab anzeigen, nicht direkt herunterladen

#### Scenario: WeasyPrint-Systemabhängigkeiten
- **WHEN** WeasyPrint-Systembibliotheken (pango, cairo, etc.) auf dem Server fehlen
- **THEN** das System SHALL HTTP 500 mit „PDF-Generierung fehlgeschlagen" zurückgeben
- **THEN** der Fehler SHALL in Sentry geloggt werden
