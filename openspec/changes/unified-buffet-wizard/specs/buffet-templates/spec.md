## ADDED Requirements

### Requirement: Meal-type-bezogene Wizard-Presets
Der Preset-Schritt SHALL pro `meal_type` höchstens sechs hervorgehobene Varianten anhand der bestehenden Vorlagen zeigen. Varianten dürfen für mehrere MealTypes hervorgehoben sein. Weitere aktive Vorlagen bleiben in „Weitere Vorlagen“ auswählbar. „Freies Buffet“ SHALL unabhängig von Anzahl und MealType als eigene, angeheftete Option verfügbar sein und zählt nicht zu den sechs hervorgehobenen Varianten.

Für `lunch`, `dinner` und `snack` wird keine neue feste Preset-Liste vorausgesetzt: aktive Vorlagen werden nach ihrer konfigurierten Reihenfolge (`sort_order`) angezeigt, bis zu sechs davon hervorgehoben und weitere unter „Weitere Vorlagen“ erreichbar. Die vom Nutzer benannten Frühstücks- und Getränkepresets sind:
- `breakfast`: „Nur Müsli“, „Brot und Müsli“, „Brot pflanzlich“, „Brot vegetarisch“, „Brot mit Fleisch“.
- `drinks`: „Hausfahrt mit Säften“ und „Lager mit Zitronentee“.

#### Scenario: Bestehende Vorlagen nach Reihenfolge anzeigen
- **WHEN** ein Nutzer den Preset-Schritt für `meal_type=lunch`, `dinner` oder `snack` öffnet
- **THEN** werden vorhandene aktive Vorlagen in ihrer konfigurierten Reihenfolge angezeigt
- **THEN** sind höchstens sechs davon hervorgehoben und „Freies Buffet“ zusätzlich angeheftet
- **THEN** bleiben weitere aktive Vorlagen unter „Weitere Vorlagen“ erreichbar

#### Scenario: Überlappende Vorlagen
- **WHEN** dieselbe aktive Vorlage für mehr als einen Mahlzeitentyp konfiguriert ist
- **THEN** darf sie für jeden dieser Mahlzeitentypen hervorgehoben werden

#### Scenario: Weniger passende Varianten als sechs
- **WHEN** für einen MealType weniger als sechs hervorgehobene Vorlagen vorhanden sind
- **THEN** zeigt der Wizard die vorhandenen Varianten ohne Platzhalterkarten und hält „Freies Buffet“ separat verfügbar

#### Scenario: Free bleibt angeheftet
- **WHEN** die hervorgehobenen Presets nach MealType gefiltert oder sortiert werden
- **THEN** bleibt `free` als separate Option sichtbar und verdrängt keine der meal-type-spezifischen Karten

### Requirement: Frühstücksprofile und Getränkepresets vollständig vorbelegen
Die fünf bestätigten Frühstücksprofile und die zwei Getränkepresets SHALL beim Auswählen eine vollständige, änderbare Ausgangsauswahl mit Standardrollen, Mengen und sichtbaren Zutaten/Rezepte laden. Das Müsli-Profil SHALL Müsli-/Haferflocken-Basis mit passenden Extras und Getränken vorauswählen; die Brotprofile SHALL passende Brot-, Belag-, Streichfett-, Frisch-/Extras- und Getränkekategorien konfigurieren. „Hausfahrt mit Säften“ SHALL vorhandene Säfte nutzen; „Lager mit Zitronentee“ SHALL vorhandene zitronige Tee-/Getränke-Rezepte nutzen. Es MUST NOT automatisch ein neues Produkt oder Rezept erzeugt werden.

#### Scenario: Preset nach Auswahl vollständig vorausgewählt
- **WHEN** ein Nutzer ein Frühstücks- oder Getränkepreset auswählt
- **THEN** werden alle verfügbaren, sichtbaren Standard-Items und Mengen der Preset-Konfiguration geladen
- **THEN** kann der Nutzer jedes vorausgewählte Item, jede Menge und jede Rolle im Wizard ändern

#### Scenario: Vorhandene Favoriten als Startauswahl
- **GIVEN** eine aktivierte Rolle hat keine expliziten Vorlagen-Defaults, aber sichtbare Rollen-Favoriten
- **WHEN** das Preset geladen wird
- **THEN** wird der erste sichtbare Favorit als änderbare Startauswahl markiert

#### Scenario: Unsichtbarer Default
- **GIVEN** eine Vorlage enthält eine Standardzutat, die nach `food_access` für den aktuellen Nutzer nicht sichtbar ist
- **WHEN** das Preset geladen wird
- **THEN** wird diese Zutat nicht angezeigt und nicht gespeichert; andere sichtbare Defaults bleiben erhalten

#### Scenario: Leere Standardauswahlen im Dry-Run prüfen
- **GIVEN** eine bestehende Seed-Vorlage hat bei einer Rolle keine Default-Zutaten und keine Default-Rezepte
- **WHEN** `seed_buffet_templates --dry-run --fill-missing-defaults` ausgeführt wird
- **THEN** werden nur die geplanten Ergänzungen angezeigt und keine Datensätze verändert

#### Scenario: Leere Standardauswahlen ergänzen
- **GIVEN** ein zuvor geprüfter Seed wird mit `--apply --fill-missing-defaults` ausgeführt
- **WHEN** eine bestehende Rolle hat leere Default-Auswahlen
- **THEN** werden nur leere Default-Auswahlen ergänzt; bereits nicht-leere Auswahlen bleiben unverändert

#### Scenario: Hausfahrt verwendet vorhandene Säfte
- **WHEN** „Hausfahrt mit Säften“ gewählt wird
- **THEN** können vorhandene Säfte wie „Saft (Apfel)“, „Saft (Multivitamin)“ und „Saft (Orange)“ vorausgewählt sein

#### Scenario: Lager verwendet vorhandenen Zitronentee
- **WHEN** „Lager mit Zitronentee“ gewählt wird
- **THEN** wird ein vorhandenes zitroniges Getränkerezept, zum Beispiel „Ingwertee mit Zitronen“, vorausgewählt, sofern es für den Nutzer sichtbar ist

### Requirement: Vorlagenänderungen bleiben Staff/Admin vorbehalten
Globale Preset-Namen, MealType-Zuordnungen, Rollen, Mengen und Standard-Items SHALL nur von Staff/Admin geändert werden können. Normale Nutzer dürfen während eines konkreten MealPlan-Wizards die eigene Auswahl und Mengen ändern; solche Änderungen SHALL weder globale Vorlagen noch Rollen-Tags verändern. Ein neuer benutzerdefinierter Preset-Editor im Food-Frontend ist nicht Bestandteil dieses Changes; die vorhandene Admin-Pflege bleibt die Verwaltungsoberfläche.

#### Scenario: Nutzer passt nur seine Mahlzeit an
- **WHEN** ein normaler Nutzer Items oder Shares in einem Preset ändert und die Mahlzeit speichert
- **THEN** ändert sich nur die konkrete MealPlan-Mahlzeit; `BuffetTemplate`, Standard-Items und globale Rollen-Tags bleiben unverändert

#### Scenario: Admin pflegt eine Vorlage
- **WHEN** ein Staff/Admin eine Buffet-Vorlage über die vorhandene Admin-Pflege ändert
- **THEN** werden die aktualisierten Preset-Werte für zukünftige Wizard-Auswahlen bereitgestellt, ohne gespeicherte MealPlan-Mahlzeiten rückwirkend umzuschreiben
