## MODIFIED Requirements

### Requirement: Rezept-Detailseite zeigt vollständige Analyse
Die Rezept-Detailseite SHALL unter `/recipes/:slug` das Rezept in folgender Sektions-Reihenfolge anzeigen: Titel + kompakte Summary + Action-Buttons (Drucken/Bearbeiten/Löschen) → Source-URL → Bild/Placeholder → Zutaten → Zubereitung (default geschlossen) → Themen/Allergene → Analyse-Tabs (mit Histogrammen) → Rezeptregeln → Ähnliche → Emotionen → Comments. Die Beschreibung SHALL ausschließlich einmal als kompakte Summary unter dem Titel dargestellt werden; eine separate `summary_long`-Box SHALL NICHT mehr gerendert werden. Der Autor SHALL ausschließlich in der Seitenleiste dargestellt werden; eine separate Autor-Sektion im Hauptfeed SHALL NICHT mehr gerendert werden. Die Metadaten SHALL über die Komponente `RecipeMetaCard` in der Seitenleiste dargestellt werden (kein zusätzlicher Inline-Header im Hauptfeed). Jedes persönliche Rezept SHALL ohne Laufzeitfehler dargestellt werden (Badge-Variante `personal` unterstützt).

Die Action-Buttons (Drucken/Bearbeiten/Löschen) SHALL ausschließlich `lucide-react`-Icon-Komponenten verwenden (kein schriftbasiertes Icon-Ligatur-System wie `material-symbols-outlined`), damit bei fehlendem Icon-Font niemals ein Ligatur-Schlüsselwort als sichtbarer Text neben dem Label erscheint. Die Buttons SHALL als kompakte, quadratische Icon-Buttons (ohne sichtbaren Text) rechtsbündig auf derselben Zeile wie der Titel dargestellt werden und je ein `title`- sowie `aria-label`-Attribut mit der deutschen Bezeichnung (Drucken/Bearbeiten/Löschen) tragen.

#### Scenario: Nutzer öffnet Rezept-Detailseite
- **WHEN** ein Nutzer `/recipes/:slug` aufruft
- **THEN** werden die Sektionen in der definierten Reihenfolge angezeigt
- **THEN** die Zubereitung ist default eingeklappt

#### Scenario: Persönliches Rezept ohne Crash
- **WHEN** ein Nutzer ein Rezept mit `recipe_badge="personal"` öffnet
- **THEN** wird die Seite ohne Laufzeitfehler gerendert und der passende Badge angezeigt

#### Scenario: NutriScore-Anzeige
- **WHEN** das Rezept einen cached_nutri_class-Wert hat
- **THEN** wird der NutriScore als farbiger Badge angezeigt

#### Scenario: Preis-Anzeige
- **WHEN** das Rezept einen cached_price_total-Wert hat
- **THEN** wird der Gesamtpreis im Analyse-Tab "Preis" angezeigt

#### Scenario: Portionen skalieren
- **WHEN** der Nutzer die Portionszahl ändert
- **THEN** werden Zutatenliste und Preise entsprechend umgerechnet (pro Portion und gesamt)

#### Scenario: Mobile Layout
- **WHEN** die Viewport-Breite < 768px ist
- **THEN** wird das Layout gestapelt dargestellt mit konsolidierter Action-Bar am unteren Rand

#### Scenario: Action-Buttons ohne doppelten Text
- **WHEN** die Rezept-Detailseite gerendert wird, unabhängig vom Ladezustand eines Icon-Fonts
- **THEN** zeigen die Drucken-, Bearbeiten- und Löschen-Buttons ausschließlich ein `lucide-react`-SVG-Icon ohne zusätzlichen sichtbaren Ligatur-Text

#### Scenario: Action-Buttons rechtsbündig neben Titel
- **WHEN** die Rezept-Detailseite auf Desktop-Breite (≥768px) gerendert wird
- **THEN** erscheinen die Action-Buttons kompakt und rechtsbündig in derselben Zeile wie der Rezept-Titel

### Requirement: Rezept-Metadaten-Card zeigt Kennzahlen modern und einheitlich
Die `RecipeMetaCard`-Komponente in der Seitenleiste SHALL Gesamtkosten und Nutri-Score in einer hervorgehobenen Kopfzeile darstellen (Preis in großer Typografie, Nutri-Score als rundes farbiges Badge) und die übrigen Fakten (Kategorie, Autor, Kochzeit, Vorbereitung, Schwierigkeit, Altersgruppe, Aufrufe, Likes, Erstellt am) in einem einheitlichen Grid mit Icon-Containern darstellen. Auf Viewports ≥1024px (`lg`) SHALL die Card beim Scrollen sticky positioniert bleiben, solange der Hauptinhalt länger ist als die Sidebar.

#### Scenario: Kopfzeile hebt Preis und Nutri-Score hervor
- **WHEN** ein Rezept mit Gesamtpreis und Nutri-Score-Wert angezeigt wird
- **THEN** werden Preis und Nutri-Score in der Kopfzeile der Meta-Card größer und optisch hervorgehoben dargestellt als die übrigen Fakten

#### Scenario: Sticky Sidebar auf Desktop
- **WHEN** ein Nutzer auf einem Viewport ≥1024px die Rezept-Detailseite herunterscrollt und der Hauptinhalt länger als die Sidebar ist
- **THEN** bleibt die Meta-Card innerhalb der Sidebar sichtbar (sticky), statt aus dem Viewport zu verschwinden
