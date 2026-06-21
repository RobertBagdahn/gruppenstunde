### Requirement: Backend klassifiziert leere Verbesserungslisten

Der `GET /api/recipes/{id}/improvements/`-Endpunkt SHALL stets ein `is_applicable`-Flag und ein befülltes `message`-Feld zurückgeben, wenn `items` leer ist. Der Grund für die leere Liste MUSS im `message`-Feld auf Deutsch erläutert werden.

`ImprovementListOut` MUSS folgende Felder enthalten:
- `items: list[ImprovementItem]` — kann leer sein
- `all_good: bool` — true wenn alle Parameter im grünen Bereich sind
- `is_applicable: bool` — false wenn der Rezepttyp keine anwendbaren Regeln und Nutri-Score-Kandidaten hat
- `message: str` — beschreibt das Ergebnis; MUSS befüllt sein wenn `items` leer ist

#### Scenario: Rezept mit allen Nährwerten = 0 und keinen passenden Regeln

- **WHEN** `GET /api/recipes/{id}/improvements/` für ein Getränk-Rezept aufgerufen wird, dessen gecachte Nährwerte alle ≤ 0 sind und kein Rule-Match existiert
- **THEN** antwortet der Endpunkt mit `{ "items": [], "all_good": false, "is_applicable": false, "message": "<Typ-spezifische Erklärung>" }`

#### Scenario: Rezept mit Nährwertdaten aber nichts Umsetzbarem

- **WHEN** `GET /api/recipes/{id}/improvements/` aufgerufen wird und ein Rezept nicht Nutri-A ist, aber alle Nutri-Simulation-Kandidaten einen `class_improvement == 0` haben und kein Rule-Match existiert
- **THEN** antwortet der Endpunkt mit `{ "items": [], "all_good": false, "is_applicable": true, "message": "Keine konkreten Verbesserungen gefunden – das Rezept liegt in allen bewerteten Dimensionen im Rahmen." }`

#### Scenario: Rezept mit fehlenden Nährwertdaten

- **WHEN** `GET /api/recipes/{id}/improvements/` aufgerufen wird und alle Nährwert-Cachefelder des Rezepts 0 sind, aber das Rezept prinzipiell auswertbar ist (kein Getränk-Sonderfall)
- **THEN** antwortet der Endpunkt mit `{ "items": [], "all_good": false, "is_applicable": true, "message": "Keine Nährwertdaten für die Zutaten hinterlegt – sobald Nährwerte erfasst sind, erscheinen hier Vorschläge." }`

#### Scenario: Rezept mit Nutri-A und keinen Regeln (all_good)

- **WHEN** `GET /api/recipes/{id}/improvements/` aufgerufen wird und `cached_nutri_class == 1` und keine Rule-Matches existieren
- **THEN** antwortet der Endpunkt mit `{ "items": [], "all_good": true, "is_applicable": true, "message": "<ALL_GOOD_MESSAGE>" }`

#### Scenario: Rezept mit Verbesserungsvorschlägen

- **WHEN** `GET /api/recipes/{id}/improvements/` aufgerufen wird und Verbesserungskandidaten gefunden wurden
- **THEN** antwortet der Endpunkt mit `{ "items": [...], "all_good": false, "is_applicable": true, "message": "" }`

---

### Requirement: Frontend zeigt erklärenden Leer-Zustand

Die `RecipeImprovements`-Komponente SHALL für jeden möglichen Antwortzustand des Endpunkts einen sichtbaren UI-Zustand rendern. Ein lautloses Nichts-Rendern ist unzulässig.

Die fünf Render-Zweige in Reihenfolge:

1. `isLoading` → Skeleton-Pulse
2. `error || !data` → Fehlerkarte mit Text „Verbesserungsvorschläge konnten nicht geladen werden." und Retry-Button
3. `data.all_good` → Grüne Erfolgskarte
4. `!data.is_applicable || data.items.length === 0` → Neutrale Info-Karte mit `data.message`
5. `data.items.length > 0` → Verbesserungskarten

#### Scenario: Getränk-Rezept öffnen (Leer-Zustand wegen Typ)

- **WHEN** ein Nutzer den Gesundheits-Tab eines Getränk-Rezepts öffnet
- **THEN** wird unter der Überschrift „Verbesserungsvorschläge" eine neutrale Info-Karte mit einer Erklärung angezeigt, warum keine Vorschläge vorhanden sind
- **THEN** bleibt kein Bereich lautlos leer

#### Scenario: API-Fehler beim Laden der Verbesserungen

- **WHEN** der Endpunkt `/api/recipes/{id}/improvements/` einen Fehler zurückgibt
- **THEN** zeigt die Komponente eine Fehlerkarte mit Text „Verbesserungsvorschläge konnten nicht geladen werden." und einem Retry-Button
- **THEN** wird kein `null` gerendert (kein lautloses Verschwinden des Bereichs)

#### Scenario: Rezept mit Nutri-A und keinen Regeln

- **WHEN** ein Nutzer den Gesundheits-Tab eines Rezepts mit Nutri-Score A öffnet und keine Regeln greifen
- **THEN** wird die grüne „alles gut"-Karte mit dem `all_good`-Nachrichtentext angezeigt

#### Scenario: Neutrale Info-Karte visuelle Anforderungen

- **WHEN** die neutrale Info-Karte angezeigt wird
- **THEN** verwendet sie `bg-muted/40` Hintergrund mit `border-border` Rahmen
- **THEN** enthält sie ein Info-Icon (Lucide `Info`) links vom Text
- **THEN** zeigt sie `data.message` als lesbaren Fließtext an
