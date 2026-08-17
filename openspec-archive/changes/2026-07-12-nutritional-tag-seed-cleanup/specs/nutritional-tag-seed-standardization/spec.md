# nutritional-tag-seed-standardization Specification

## Purpose
Definiert die standardisierten NutritionalTag-Seed-Daten mit konsistenter name/name_opposite-Semantik, einheitlichen Namensschemata und vollständiger EU-Allergen-Abdeckung.

## ADDED Requirements

### Requirement: name enthält immer das menschliche Merkmal

Der `name` eines NutritionalTag-Eintrags MUSS das menschliche Ernährungsmerkmal beschreiben (z.B. "Vegan", "Eiallergie", "Laktoseunverträglichkeit"). `name_opposite` MUSS den konkreten problematischen Inhaltsstoff beschreiben (z.B. "Tierische Produkte", "Ei und Eierzeugnisse", "Laktose").

#### Scenario: Vegan-Tag
- **WHEN** der Vegan-NutritionalTag abgefragt wird
- **THEN** MUSS `name="Vegan"` sein
- **THEN** MUSS `name_opposite="Tierische Produkte"` sein
- **THEN** MUSS `is_dangerous=false` sein
- **THEN** MUSS `rank=1` sein

#### Scenario: Allergie-Tag
- **WHEN** der Eiallergie-NutritionalTag abgefragt wird
- **THEN** MUSS `name="Eiallergie"` sein
- **THEN** MUSS `name_opposite="Ei und Eierzeugnisse"` sein
- **THEN** MUSS `is_dangerous=true` sein
- **THEN** MUSS `rank=6` sein

#### Scenario: Unverträglichkeit-Tag
- **WHEN** der Laktoseunverträglichkeit-NutritionalTag abgefragt wird
- **THEN** MUSS `name="Laktoseunverträglichkeit"` sein
- **THEN** MUSS `name_opposite="Laktose"` sein
- **THEN** MUSS `is_dangerous=true` sein

### Requirement: Zwei Namensschemata — medizinisch und Präferenz

Alle NutritionalTag-Einträge MÜSSEN einem von zwei Namensschemata folgen:

- **Medizinisch**: Endung auf `-allergie` oder `-unverträglichkeit`, betrifft Immunsystem oder Stoffwechsel, `is_dangerous` entsprechend gesetzt
- **Präferenz**: Endung auf `-frei`, betrifft freiwilligen Verzicht, `is_dangerous=false`

Ausnahmen: "Vegan" und "Vegetarisch" als etablierte Begriffe.

#### Scenario: Medizinische Tags haben -allergie oder -unverträglichkeit
- **WHEN** alle medizinischen Tags gelistet werden
- **THEN** MÜSSEN sie auf `-allergie` (z.B. "Eiallergie", "Fischallergie", "Sojaallergie", "Erdnussallergie", "Nussallergie", "Milchallergie", "Sellerieallergie", "Sesamallergie", "Senfallergie", "Sulfitallergie", "Lupinenallergie", "Schalentierallergie") oder `-unverträglichkeit` (z.B. "Glutenunverträglichkeit (Zöliakie)", "Laktoseunverträglichkeit", "Fructoseunverträglichkeit", "Histaminunverträglichkeit", "Hülsenfruchtunverträglichkeit") enden

#### Scenario: Präferenz-Tags haben -frei
- **WHEN** alle Präferenz-Tags gelistet werden
- **THEN** MÜSSEN sie auf `-frei` enden (z.B. "Glutenfrei (freiwillig)", "Alkoholfrei", "Schärfefrei", "Knoblauchfrei", "Koffeinfrei", "Weizenfrei", "Roggenfrei", "Gerstenfrei", "Haferfrei", "Dinkelfrei", "Kamutfrei")

### Requirement: EU-Allergene sind als is_dangerous markiert

Alle 14 EU-deklarationspflichtigen Allergene, die im Seed abgebildet sind, MÜSSEN `is_dangerous=true` haben.

#### Scenario: EU-Allergene im Seed
- **WHEN** alle NutritionalTags mit `is_dangerous=true` abgefragt werden
- **THEN** MÜSSEN folgende Allergene enthalten sein: Gluten (Zöliakie), Eier, Fisch, Erdnüsse, Soja, Milch (Laktose + Milchallergie), Schalenfrüchte/Nüsse, Sellerie, Senf, Sesam, Sulfite, Lupinen, Schalentiere (Krebstiere und Weichtiere zusammengefasst)

### Requirement: description erklärt das menschliche Merkmal

Die `description` eines NutritionalTag MUSS das menschliche Merkmal (`name`) erklären, nicht den Gegenname.

#### Scenario: Beschreibung für Vegan
- **WHEN** der Vegan-NutritionalTag abgefragt wird
- **THEN** MUSS `description` den Verzicht auf tierische Produkte erklären (z.B. "Keine tierischen Produkte wie Fleisch, Milch, Eier, Honig")

#### Scenario: Beschreibung für Allergie
- **WHEN** der Eiallergie-NutritionalTag abgefragt wird
- **THEN** MUSS `description` die Allergie gegen Eier erklären (z.B. "Allergie gegen Hühnerei und Eierzeugnisse")

### Requirement: Vollständige Seed-Liste mit 30 Einträgen

Der Seed MUSS exakt 30 NutritionalTag-Einträge mit den definierten Rängen, Namen und Gegenbezeichnungen enthalten.

#### Scenario: Alle 30 Einträge vorhanden
- **WHEN** der Seed importiert wird
- **THEN** MÜSSEN 30 NutritionalTag-Einträge in der Datenbank existieren
- **THEN** DÜRFEN keine Einträge für "Halal" oder "Koscher" existieren
- **THEN** MUSS es jeweils genau einen Eintrag pro Rang geben

#### Scenario: Neue Einträge
- **WHEN** der Seed importiert wird
- **THEN** MUSS "Milchallergie" (Rang 16) separat von "Laktoseunverträglichkeit" (Rang 4) existieren
- **THEN** MUSS "Schalentierallergie" (Rang 17) als Zusammenfassung von Krebstieren und Weichtieren existieren
- **THEN** MUSS "Nussallergie" (Rang 5) die früheren separaten Einträge für "nussfrei" und "Schalenfrüchte" ersetzen

#### Scenario: Bestehende PKs bleiben erhalten
- **WHEN** ein bestehender NutritionalTag im neuen Seed enthalten ist
- **THEN** MUSS dessen Primärschlüssel (PK) erhalten bleiben
- **THEN** DÜRFEN M2M-Verknüpfungen zu Ingredients, Recipes, UserProfiles, Persons und Participants nicht verloren gehen
