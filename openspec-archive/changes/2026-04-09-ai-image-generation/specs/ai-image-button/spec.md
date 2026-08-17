## ADDED Requirements

### Requirement: Zauberstab-Button auf Content-Detailseiten

Das System MUSS einen KI-Bild-Generierungs-Button auf allen Content-Detailseiten anzeigen, wenn der User Editor oder Admin ist.

#### Scenario: Button-Sichtbarkeit für Editoren
- **WHEN** ein User mit Staff-Rechten oder als Autor des Contents eine Content-Detailseite öffnet
- **THEN** MUSS ein Zauberstab-Button (✨ Icon) als schwebender Button über dem Hero-Bild angezeigt werden

#### Scenario: Button-Sichtbarkeit für normale User
- **WHEN** ein User ohne Staff-Rechte und ohne Autoren-Status eine Content-Detailseite öffnet
- **THEN** DARF kein Zauberstab-Button angezeigt werden

#### Scenario: Bild generieren
- **WHEN** ein berechtigter User auf den Zauberstab-Button klickt
- **THEN** MUSS ein `POST /api/content/ai/generate-image/` Request gesendet werden mit `title`, `summary` und `content_type` des aktuellen Contents
- **THEN** MUSS während der Generierung ein Ladeindikator über dem Bild angezeigt werden mit dem Text „Bild wird generiert... Das kann bis zu 4 Minuten dauern."
- **THEN** MUSS der Button während der Generierung deaktiviert sein

#### Scenario: Bild-Vorschau nach Generierung
- **WHEN** die Bild-Generierung erfolgreich abgeschlossen ist
- **THEN** MUSS das generierte Bild als Vorschau über dem aktuellen Bild angezeigt werden
- **THEN** MÜSSEN zwei Buttons angezeigt werden: „Übernehmen" (grün) und „Verwerfen" (grau)

#### Scenario: Bild übernehmen
- **WHEN** der User auf „Übernehmen" klickt
- **THEN** MUSS das generierte Bild über die bestehende Image-Upload-API des Content-Typs hochgeladen werden (z.B. `POST /api/recipes/{id}/image/`)
- **THEN** MUSS die Seite das neue Bild nach erfolgreichem Upload anzeigen
- **THEN** MUSS ein Erfolgs-Toast angezeigt werden: „Bild wurde aktualisiert"

#### Scenario: Bild verwerfen
- **WHEN** der User auf „Verwerfen" klickt
- **THEN** MUSS die Vorschau geschlossen werden und das ursprüngliche Bild wieder angezeigt werden

#### Scenario: Fehler bei Generierung
- **WHEN** die Bild-Generierung fehlschlägt (Timeout, Server-Fehler)
- **THEN** MUSS ein Fehler-Toast angezeigt werden: „Bild konnte nicht generiert werden. Bitte versuche es später erneut."
- **THEN** MUSS der Zauberstab-Button wieder aktiviert werden

### Requirement: Alle Content-Typen unterstützen

Der Zauberstab-Button MUSS auf allen 4 Content-Typen funktionieren.

#### Scenario: Rezept-Detailseite
- **WHEN** der Zauberstab auf einer Rezept-Detailseite geklickt wird
- **THEN** MUSS `content_type: "recipe"` an die Generierungs-API gesendet werden
- **THEN** MUSS der Upload über `POST /api/recipes/{id}/image/` erfolgen

#### Scenario: Gruppenstunde-Detailseite
- **WHEN** der Zauberstab auf einer Gruppenstunde-Detailseite geklickt wird
- **THEN** MUSS `content_type: "session"` gesendet werden
- **THEN** MUSS der Upload über `POST /api/sessions/{id}/image/` erfolgen

#### Scenario: Spiel-Detailseite
- **WHEN** der Zauberstab auf einer Spiel-Detailseite geklickt wird
- **THEN** MUSS `content_type: "game"` gesendet werden
- **THEN** MUSS der Upload über `POST /api/games/{id}/image/` erfolgen

#### Scenario: Blog-Detailseite
- **WHEN** der Zauberstab auf einer Blog-Detailseite geklickt wird
- **THEN** MUSS `content_type: "blog"` gesendet werden
- **THEN** MUSS der Upload über `POST /api/blogs/{id}/image/` erfolgen
