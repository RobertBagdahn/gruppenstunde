# Spec Delta

## REMOVED Requirements

### Requirement: Karten der Essensplan-Liste
**Reason**: Der linke Akzentrand in Primärfarbe entfällt. Die Leinwand zeigt Plan-Karten mit Schatten, Fortschritt und Nutri-Badge; die Aktionen bleiben im ⋮-Menü.
**Migration**: Siehe „Karten der Essensplan-Liste im Sticker-Stil“.

### Requirement: Anlegen über Dialog
**Reason**: Der Code öffnet „Neuer Essensplan“ bereits als Seite `/meal-plans/new`, nicht als Dialog. Die Spec war veraltet.
**Migration**: Siehe „Neuer Essensplan öffnet den Assistenten“.

## ADDED Requirements

### Requirement: Karten der Essensplan-Liste im Sticker-Stil
Jede Plan-Karte SHALL weiße Fläche mit `shadow-card` und 20 px Radius haben, ohne linken Akzentrand. Aktionen wie Löschen MUST im ⋮-Menü liegen und nicht direkt auf der Karte stehen.

#### Scenario: Karte mit Aktionen
- **WHEN** die Essensplan-Liste angezeigt wird
- **THEN** hat jede Karte Schatten statt Akzentrand, und Löschen ist nur über das ⋮-Menü erreichbar

### Requirement: Neuer Essensplan öffnet den Assistenten
Die Aktion „Neuer Essensplan“ SHALL zur Seite `/meal-plans/new` führen. Das Anlegen erfolgt im Assistenten, nicht in einem Dialog.

#### Scenario: Neuen Plan anlegen
- **WHEN** der Nutzer „Neuer Essensplan“ wählt
- **THEN** öffnet sich der Planassistent auf `/meal-plans/new`
