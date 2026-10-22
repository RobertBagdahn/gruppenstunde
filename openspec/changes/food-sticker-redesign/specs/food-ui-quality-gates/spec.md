# Spec Delta

## Purpose

Definiert die automatisierten, blockierenden Prüfungen, die sicherstellen, dass das Erscheinungsbild des Food-Frontends verbindlich, barrierefrei und auf Handy und Desktop stabil bleibt, bevor Änderungen live gehen können.

## ADDED Requirements

### Requirement: Seitenregister für UI-Prüfungen
Das Food-Frontend SHALL ein einziges Seitenregister (`e2e/tests/ui-pages.ts`) führen, das jede geprüfte Seite mit Route, Testdaten und erwarteter H1 enthält. Es MUST mindestens die zehn Hauptseiten enthalten: Startseite, Rezeptübersicht, Rezeptdetail, Kochmodus, Rezept erstellen, Essenspläne, Neuer Essensplan, Essensplan, Einkaufsliste, Zutat-Detail. Jede Prüfung in diesem Dokument MUST über dieses Register laufen.

#### Scenario: Neue Hauptseite
- **WHEN** eine neue öffentliche oder Nutzerseite hinzugefügt wird
- **THEN** meldet ein Test, wenn sie nicht im Register steht

### Requirement: Screenshot-Referenzen auf Handy und Desktop
Für jede Seite des Registers SHALL ein Playwright-Screenshot auf 390 × 844 px und 1440 × 900 px gegen eine im Repository gespeicherte Referenz verglichen werden. Die Seiten MUST dabei mit festen Testdaten, festgesetzter Uhrzeit, deaktivierten Animationen und ohne Netzwerk gerendert werden. Abweichungen über der Schwelle MUST den Lauf fehlschlagen lassen; Referenzen werden nur durch einen ausdrücklichen Aktualisierungsbefehl im Pull Request geändert.

#### Scenario: Unbeabsichtigte Änderung
- **WHEN** eine Änderung die Darstellung der Rezeptübersicht auf 390 px verschiebt
- **THEN** schlägt der Screenshot-Test fehl und zeigt das Differenzbild

#### Scenario: Gewollte Änderung
- **WHEN** ein Entwickler die Referenzen mit dem Aktualisierungsbefehl neu erzeugt und committet
- **THEN** besteht der Test im Pull Request und die geänderten Bilder sind im Review sichtbar

### Requirement: Barrierefreiheitsprüfung mit axe
Jede Seite des Registers SHALL auf beiden Viewports mit axe (Tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`) geprüft werden. Verstöße der Schwere „serious“ und „critical“ MUST den Lauf fehlschlagen lassen; Ausnahmen MÜSSEN einzeln mit Begründung im Register stehen. Die Regel `meta-viewport` darf keine Ausnahme haben.

#### Scenario: Zu geringer Kontrast
- **WHEN** eine Änderung Text mit weniger als 4,5:1 Kontrast einführt
- **THEN** schlägt die axe-Prüfung fehl und nennt Element und Wert

#### Scenario: Ausnahme
- **WHEN** ein Verstoß nicht behebbar ist
- **THEN** steht er mit Begründung im Register und der Lauf besteht

### Requirement: Tippflächen und Überlauf
Auf 390 px Breite MUST jedes sichtbare interaktive Element (`a`, `button`, `input`, `select`, `textarea`, `[role="button"]`) mindestens 44 × 44 px groß sein; reine Fließtext-Links sind ausgenommen. Auf 320, 390 und 1440 px MUST der Seiteninhalt ohne horizontales Scrollen darstellbar sein, außer in ausdrücklich scrollbaren Chip-Leisten und Wochenrastern.

#### Scenario: Zu kleine Schaltfläche
- **WHEN** ein Button auf 390 px weniger als 44 px hoch ist
- **THEN** schlägt der Test fehl und nennt Seite, Element und Größe

#### Scenario: Überlaufender Inhalt
- **WHEN** ein Element auf 320 px Breite über den Rand hinausragt
- **THEN** schlägt der Test fehl und nennt das Element

### Requirement: Design-Regeln und Lint im Quellcode
`npm run lint` und die Design-Regel-Tests (Vitest) MUST die Regeln aus `food-design-system` erzwingen: keine Palettenfarben, keine freien Farb- und Pixelwerte, keine Schriftgrößen und Radien außerhalb der Skala, keine entfernten Token (`hero`, `area`, `gradient`), keine Fremdserver-Schriften, Nutri-Score nur über `NutriScoreBadge`. Der Kontrast-Test MUST alle Token-Paare aus `index.css` prüfen.

#### Scenario: Entfernter Token
- **WHEN** ein Commit `bg-hero` verwendet
- **THEN** schlägt `npm run lint` fehl

#### Scenario: Kontrastpaar
- **WHEN** ein Token-Wert so geändert wird, dass Text auf `--primary-soft` unter 4,5:1 fällt
- **THEN** schlägt der Kontrast-Test fehl

### Requirement: Blockierende CI-Prüfung
Im CI-Job `food-checks` MUST Lint, Unit-Tests, Build, Screenshot-Referenzen, axe-Prüfung und Tippflächen-/Überlauf-Prüfung laufen; ein Fehlschlag SHALL die Auslieferung (Deploy) verhindern. Es SHALL keinen Schalter geben, der diese Prüfungen für einen Release überspringt. Die Läufe MUST dieselbe Browser-Version und dieselben ausgelieferten Schriften verwenden, damit Screenshots reproduzierbar sind.

#### Scenario: Fehlgeschlagene Prüfung
- **WHEN** die axe-Prüfung im CI fehlschlägt
- **THEN** wird `frontend-food` nicht ausgeliefert

#### Scenario: Reproduzierbarkeit
- **WHEN** dieselbe Version zweimal im CI geprüft wird
- **THEN** sind die Screenshot-Ergebnisse identisch
