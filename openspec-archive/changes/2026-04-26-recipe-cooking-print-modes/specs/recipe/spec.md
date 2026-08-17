# Recipe Cooking & Print Modes Delta

Dieses Delta ergänzt zwei reduzierte Ansichtsmodi für die Rezept-Detailseite: einen Vollbild-Kochmodus mit Schritt-Navigation und Wake-Lock sowie eine druckoptimierte Ansicht für A4-Papier. Beide werden über URL-Parameter auf der bestehenden Detail-Route aktiviert.

## ADDED Requirements

### Requirement: Cooking Mode für Rezept-Detailseite

The system SHALL provide a fullscreen cooking mode on the recipe detail page activated via URL parameter `mode=cooking`, featuring step-by-step navigation, enlarged typography, and screen wake lock. Das System MUSS auf der Rezept-Detailseite einen Vollbild-Kochmodus anbieten, der durch den URL-Parameter `mode=cooking` aktiviert wird, die Zubereitung in einzelne Schritte zerlegt, große Schriftgrößen verwendet und den Bildschirm per Wake-Lock-API wachhält.

#### Scenario: Cooking Mode aktivieren

- **WHEN** die URL `/recipes/{slug}?mode=cooking` geladen wird
- **THEN** MUSS eine Vollbild-Ansicht gerendert werden, die App-Header, Sidebar, Bottom-Action-Bar und Standard-Detailinhalte verbirgt
- **THEN** MUSS die Ansicht zwei Bereiche enthalten: eine Zutatenliste mit aktuellem Skalierungs-Zustand und den aktuellen Zubereitungsschritt in großer Schrift (`text-lg` oder größer)
- **THEN** MUSS ein Exit-Button (X-Icon) oben rechts sichtbar sein

#### Scenario: Schritt-Parsing

- **WHEN** die Markdown-`description` des Rezepts Überschriften der Ebene 2 oder 3 enthält
- **THEN** MUSS der Parser an diesen Überschriften splitten und jeden Abschnitt als eigenen Schritt behandeln
- **WHEN** keine Überschriften vorhanden sind, aber eine nummerierte Liste (Zeilen beginnen mit `1. `, `2. `, …)
- **THEN** MUSS jedes Listenelement ein Schritt sein
- **WHEN** weder Überschriften noch nummerierte Liste vorhanden sind
- **THEN** MUSS der gesamte Markdown-Block als ein einziger Schritt behandelt werden

#### Scenario: Schritt-Navigation

- **WHEN** der Nutzer im Cooking Mode den „Weiter"-Button klickt
- **THEN** MUSS die URL um einen Schritt erhöht werden (`?mode=cooking&step=N+1`) mit `replace: true`
- **WHEN** der Nutzer „Zurück" klickt oder bereits beim letzten Schritt „Weiter" deaktiviert ist
- **THEN** MUSS der Button entsprechend deaktiviert sein
- **WHEN** die URL `?mode=cooking&step=3` direkt aufgerufen wird
- **THEN** MUSS Schritt 3 initial angezeigt werden (falls vorhanden; sonst letzter gültiger Schritt)

#### Scenario: Screen Wake Lock

- **WHEN** der Cooking Mode gemountet wird und `navigator.wakeLock` verfügbar ist
- **THEN** MUSS ein `screen`-Wake-Lock angefordert werden
- **WHEN** der Nutzer den Tab wechselt und zurückkehrt (`visibilitychange` → `visible`)
- **THEN** MUSS der Wake-Lock erneut angefordert werden, falls inzwischen released
- **WHEN** der Cooking Mode unmountet wird
- **THEN** MUSS der Wake-Lock explizit released werden

#### Scenario: Wake Lock nicht verfügbar

- **WHEN** der Browser keine Wake-Lock-API unterstützt
- **THEN** MUSS der Cooking Mode ohne Fehler oder Warnung funktionieren (Bildschirm kann einschlafen)

#### Scenario: Exit aus Cooking Mode

- **WHEN** der Nutzer den Exit-Button klickt oder die `Escape`-Taste drückt
- **THEN** MÜSSEN die URL-Parameter `mode` und `step` entfernt werden
- **THEN** MUSS die normale Rezept-Detailseite erscheinen

#### Scenario: Einstieg aus Sidebar und Bottom-Bar

- **WHEN** der Nutzer in der Desktop-Sidebar den Button „Kochen starten" klickt
- **THEN** MUSS zur URL `?mode=cooking&step=0` navigiert werden
- **WHEN** der Nutzer im Mobile-Overflow-Menu „Kochen" auswählt
- **THEN** MUSS ebenfalls zur URL `?mode=cooking&step=0` navigiert werden

### Requirement: Print-Optimierte Rezept-Ansicht

The system SHALL provide a print-optimized version of the recipe detail page, activatable both via URL parameter `mode=print` (on-screen preview) and through the native `window.print()` flow. Das System MUSS eine druckoptimierte Variante der Rezept-Detailseite bereitstellen, die interaktive und sekundäre Inhalte ausblendet, ein A4-freundliches einspaltiges Layout nutzt und über den URL-Parameter `mode=print` zur Vorschau am Bildschirm sowie automatisch beim Drucken aktiv wird.

#### Scenario: Print-CSS beim Drucken

- **WHEN** der Nutzer `window.print()` auslöst (via Drucken-Button oder Browser-Shortcut)
- **THEN** MÜSSEN Header, Sidebar, Bottom-Action-Bar, Kommentare, Improvements-Liste, Aktions-Buttons und Hero-Bild in der Druckausgabe ausgeblendet sein
- **THEN** MÜSSEN Titel, kompakte Metadaten (Rezepttyp, Zubereitungszeit, Portionen), Zutatenliste mit aktueller Skalierung, Zubereitungsschritte und Nutri-Score-Buchstabe in schwarz-weiß gedruckt werden
- **THEN** MUSS das Seiten-Layout einspaltig sein mit A4-Margins (`@page { margin: 2cm }`)

#### Scenario: Print-Vorschau am Bildschirm

- **WHEN** die URL `/recipes/{slug}?mode=print` geladen wird
- **THEN** MUSS die Print-CSS-Sicht auch ohne aktiven Druck-Dialog am Bildschirm gerendert werden
- **THEN** MUSS ein „Drucken"-Button am oberen Rand sichtbar sein, der `window.print()` triggert
- **THEN** MUSS ein „Zurück"-Button zur Standard-Detail-Ansicht führen (URL ohne `mode`)

#### Scenario: Zutatenliste respektiert Skalierung

- **WHEN** der Nutzer zuvor den PortionScaler genutzt hat (z.B. auf 8 Portionen)
- **THEN** MUSS die Print-Ansicht die Zutaten für 8 Portionen drucken
- **THEN** MUSS die Portionenzahl in der Metadaten-Zeile gedruckt sein

#### Scenario: Page-Break-Regeln

- **WHEN** die Druckausgabe generiert wird
- **THEN** DARF ein Page-Break nicht innerhalb einer Zutaten-Zeile oder eines Zubereitungsschritts erfolgen (CSS `break-inside: avoid`)
- **THEN** MUSS nach dem Titel-Block kein Page-Break direkt folgen (keine „Waise" auf erster Seite)

#### Scenario: Einstieg aus Sidebar

- **WHEN** der Nutzer in der Desktop-Sidebar den Button „Drucken" klickt
- **THEN** MUSS `window.print()` direkt im aktuellen Modus aufgerufen werden (ohne Umweg über `?mode=print`)
