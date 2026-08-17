## ADDED Requirements

### Requirement: Content-type-specific prompt prefill

Der AI-Bild-Prompt wird beim Öffnen des Modals mit einem content-type-spezifischen Template vorgefüllt statt generisch mit `title - summary`.

#### Scenario: Recipe prompt prefill
- **WHEN** der User das AI-Bild-Modal für ein Rezept öffnet
- **THEN** wird der Prompt mit "Ein appetitliches Foto von {title}" vorgefüllt

#### Scenario: Session prompt prefill
- **WHEN** der User das AI-Bild-Modal für eine Gruppenstunde öffnet
- **THEN** wird der Prompt mit "Eine Illustration einer Pfadfinder-Aktivität: {title}" vorgefüllt

#### Scenario: Game prompt prefill
- **WHEN** der User das AI-Bild-Modal für ein Spiel öffnet
- **THEN** wird der Prompt mit "Eine Illustration eines Spiels: {title}" vorgefüllt

#### Scenario: Blog prompt prefill
- **WHEN** der User das AI-Bild-Modal für einen Blog-Beitrag öffnet
- **THEN** wird der Prompt mit "Eine Illustration zum Thema: {title}" vorgefüllt

#### Scenario: Unknown content type fallback
- **WHEN** der User das AI-Bild-Modal für einen unbekannten Content-Typ öffnet
- **THEN** wird der Prompt mit "{title} - {summary}" vorgefüllt (bisheriges Verhalten)
