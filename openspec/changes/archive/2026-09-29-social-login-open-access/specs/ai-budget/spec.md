## ADDED Requirements

### Requirement: KI-Stufen

Jeder Gemini-Aufruf SHALL genau einer Stufe zugeordnet und gespeichert werden (`AiInteraction.tier`). Die Funktion eines Aufrufs SHALL über das bestehende Feld `AiInteraction.context` bestimmt werden; die anonyme Allowlist ist eine Menge erlaubter `context`-Werte (`recipe_smart_input`, `url_import_*`, `ingredient_url_import`, `ingredient_ai_create`).

- `anonymous`: nicht angemeldet
- `user`: angemeldet, ohne Staff-Rechte
- `staff`: `is_staff` oder `is_superuser`
- `system`: Hintergrund- und Management-Aufrufe mit `bypass_limits=True`, z. B. Embeddings und Dokument-Textgenerierung

Die Zuordnung SHALL zentral in `core/services/ai_budget.py` über `resolve_ai_tier(user)` erfolgen, sodass eine spätere gruppenbasierte Erweiterung an einer Stelle möglich ist.

#### Scenario: Staff-Nutzer ruft KI auf
- **WHEN** ein Nutzer mit `is_staff=True` eine KI-Funktion nutzt
- **THEN** wird die `AiInteraction` mit `tier="staff"` gespeichert

#### Scenario: Embedding im Hintergrund
- **WHEN** ein Embedding mit `bypass_limits=True` erzeugt wird
- **THEN** wird die `AiInteraction` mit `tier="system"` gespeichert und keinem Nutzerbudget angerechnet

### Requirement: Euro-Budgets mit Reservierung

Vor jedem nicht-systemseitigen Gemini-Aufruf SHALL das System prüfen, ob das Budget der Stufe die geschätzten Maximalkosten des Aufrufs deckt. Dazu SHALL es eine Reservierung (`AiInteraction.reserved_cost_eur`) anlegen. Die Prüfung und die Reservierung SHALL atomar unter einer Zeilensperre (`AiBudgetBucket`, `select_for_update`) erfolgen, damit parallele Aufrufe auch über mehrere Cloud-Run-Instanzen das Budget nicht überschreiten. Der Verbrauch berechnet sich als Summe von `coalesce(cost_eur, reserved_cost_eur)` im Budgetfenster. Nach dem Aufruf SHALL `cost_eur` gesetzt werden. Fehlgeschlagene Aufrufe ohne Token-Verbrauch SHALL mit 0 € abgerechnet werden. Verwaiste Reservierungen SHALL nach 10 Minuten nicht mehr zählen.

Budgets (konfigurierbar über Settings):

| Stufe | Fenster | Standard |
|---|---|---|
| `anonymous` (alle Besucher zusammen) | rollierende 60 Minuten | 0,05 € (`AI_BUDGET_ANONYMOUS_EUR_PER_HOUR`) |
| `anonymous` pro Besucher | rollierende 60 Minuten | 0,02 € ≈ 3 Erkennungen (`AI_BUDGET_ANONYMOUS_VISITOR_EUR_PER_HOUR`) |
| `user` pro Nutzer | Kalendertag Europe/Berlin | 0,30 € (`AI_BUDGET_USER_EUR_PER_DAY`) |
| `staff` pro Nutzer | Kalendertag Europe/Berlin | 3,00 € (`AI_BUDGET_STAFF_EUR_PER_DAY`) |

#### Scenario: Anonymer Topf ist ausgeschöpft
- **GIVEN** anonyme Aufrufe haben in den letzten 60 Minuten 0,049 € verbraucht bzw. reserviert
- **WHEN** ein Besucher „Rezept erkennen“ mit geschätzten Maximalkosten von 0,004 € startet
- **THEN** antwortet das System mit HTTP 429, `code: "ai_public_budget_exhausted"` und `retry_after_seconds`
- **AND** `detail` lautet „Die kostenlose KI-Vorschau ist gerade ausgelastet. Versuch es später erneut – oder melde dich an, dann hast du dein eigenes Kontingent.“
- **AND** es erfolgt kein Gemini-Aufruf

#### Scenario: Parallele Aufrufe überziehen nicht
- **GIVEN** 0,045 € Restbudget sind im anonymen Topf verbraucht
- **WHEN** zwei Besucher gleichzeitig Aufrufe mit je 0,004 € geschätzten Maximalkosten starten
- **THEN** wird höchstens einer zugelassen

#### Scenario: Nutzer-Tagesbudget erschöpft
- **GIVEN** eine Nutzerin hat heute 0,30 € verbraucht
- **WHEN** sie eine weitere KI-Funktion nutzt
- **THEN** antwortet das System mit HTTP 429, `code: "ai_quota_exceeded"`, `retry_after_seconds` bis Mitternacht (Europe/Berlin)
- **AND** `detail` lautet „Dein KI-Kontingent für heute ist aufgebraucht. Morgen ab 0:00 Uhr geht es weiter.“

#### Scenario: Staff hat 3 € pro Tag
- **GIVEN** ein Staff-Nutzer hat heute 2,50 € verbraucht
- **WHEN** er einen Aufruf mit geschätzten Maximalkosten von 0,01 € startet
- **THEN** wird der Aufruf zugelassen

#### Scenario: Budget über mehrere Instanzen
- **GIVEN** zwei Backend-Instanzen laufen
- **WHEN** über beide Instanzen verteilt anonyme Aufrufe erfolgen
- **THEN** SHALL der Gesamtverbrauch aller anonymen Aufrufe in 60 Minuten 0,05 € nicht übersteigen, abzüglich der Abweichung zwischen Schätzung und Ist-Kosten eines einzelnen Aufrufs

### Requirement: Fairness-Limit für Besucher ohne Klar-IP

Für anonyme Aufrufe SHALL das System einen Besucherschlüssel `anon_key` bilden: HMAC-SHA256 über IP-Adresse und User-Agent mit einem täglich rotierenden, aus `SECRET_KEY` und Datum abgeleiteten Schlüssel. Die IP-Adresse SHALL nirgends im Klartext gespeichert werden. Die Client-IP SHALL aus dem vertrauenswürdigen Proxy-Header ermittelt werden.

#### Scenario: Einzelner Besucher erschöpft sein Limit
- **GIVEN** die anonymen KI-Aufrufe eines Besuchers haben in den letzten 60 Minuten 0,019 € verbraucht bzw. reserviert
- **WHEN** er eine weitere Erkennung startet, deren geschätzte Maximalkosten das Besucherlimit von 0,02 € überschreiten
- **THEN** antwortet das System mit HTTP 429, `code: "ai_visitor_limit"` und `detail` „Du hast die kostenlose KI-Vorschau für diese Stunde ausgeschöpft. Melde dich an, um mehr zu nutzen.“

#### Scenario: Keine Klar-IP gespeichert
- **WHEN** ein anonymer Aufruf protokolliert wird
- **THEN** enthält `AiInteraction.anon_key` einen 64-stelligen Hex-Hash und kein Feld enthält die IP-Adresse

### Requirement: Anonyme Allowlist mit Vorschaumodus

Anonyme Besucher SHALL ausschließlich diese KI-Funktionen nutzen können:

1. **Rezept erkennen**: `POST /api/recipes/smart-input/` (Link oder Rezepttext → Rezeptentwurf)
2. **Zutat erkennen**: `POST /api/ingredients/import-from-url/` (Link → Zutatenentwurf) und `POST /api/ingredients/ai-preview/` (Name → Zutatenentwurf)

Für anonyme Aufrufe SHALL der Vorschaumodus gelten:
- Es werden keine Datenbankzeilen außer `AiInteraction` angelegt oder geändert, insbesondere keine Zutaten, Portionen, Aliase oder Maßeinheiten.
- Unbekannte Zutaten werden im Entwurf als `is_new: true` markiert und erst beim Speichern nach der Anmeldung angelegt.
- Ein Link wird zuerst kostenlos über strukturierte Daten (schema.org/JSON-LD) ausgewertet. Gemini wird nur als Fallback bzw. zur Zutatenzuordnung genutzt.
- Ergebnisse werden 7 Tage lang anhand eines Hashes der normalisierten Eingabe zwischengespeichert. Treffer aus dem Cache kosten nichts und zählen nicht gegen Budgets.
- Ausgabe-Tokens und Eingabelänge werden hart begrenzt (Eingabetext maximal 8.000 Zeichen).

Alle anderen KI-Endpunkte SHALL für anonyme Clients HTTP 401 mit `code: "ai_login_required"` und `detail` „KI-Funktionen gibt es nach der kostenlosen Anmeldung.“ liefern.

#### Scenario: Besucher erkennt ein Rezept aus einem Link
- **WHEN** ein nicht angemeldeter Besucher `POST /api/recipes/smart-input/` mit einem Rezept-Link aufruft
- **THEN** antwortet das System mit HTTP 200 und einem Rezeptentwurf
- **AND** die Anzahl der Zeilen in `Ingredient`, `Portion`, `IngredientAlias` und `MeasuringUnit` bleibt unverändert

#### Scenario: Gleicher Link aus dem Cache
- **GIVEN** derselbe Link wurde vor einer Stunde erkannt
- **WHEN** ein anderer Besucher ihn erneut einreicht
- **THEN** kommt der Entwurf aus dem Cache, ohne Gemini-Aufruf und ohne Budgetverbrauch

#### Scenario: Besucher erkennt eine Zutat per Name
- **WHEN** ein nicht angemeldeter Besucher `POST /api/ingredients/ai-preview/` mit `{ "name": "Haferflocken" }` aufruft
- **THEN** antwortet das System mit HTTP 200 und einem Zutatenentwurf (Nährwerte, Portionen, Kategorie)
- **AND** es wird keine Zutat gespeichert

#### Scenario: Besucher nutzt eine KI-Funktion außerhalb der Allowlist
- **WHEN** ein nicht angemeldeter Client `POST /api/recipes/{id}/ai-suggest-all/` aufruft
- **THEN** antwortet das System mit HTTP 401 und `code: "ai_login_required"`

#### Scenario: Angemeldeter Nutzer nutzt „Rezept erkennen“
- **WHEN** ein angemeldeter Nutzer `POST /api/recipes/smart-input/` aufruft
- **THEN** verhält sich der Endpunkt wie bisher (inklusive Anlegen fehlender Zutaten)
- **AND** der Verbrauch wird seinem Tagesbudget angerechnet

### Requirement: Kontingent-Endpunkt

`GET /api/ai/quota/` SHALL für alle Clients mit HTTP 200 antworten, und zwar mit `{ tier, limit_eur, used_eur, remaining_eur, used_percent, resets_at, anonymous_features: string[] }`. Für anonyme Clients SHALL der Endpunkt den Zustand des gemeinsamen Topfs und des eigenen Besucherlimits liefern (`visitor_calls_remaining`). Pydantic `AiQuotaOut` und Zod `aiQuotaSchema` SHALL synchron sein.

#### Scenario: Angemeldete Nutzerin fragt ihr Kontingent ab
- **GIVEN** sie hat heute 0,12 € verbraucht
- **WHEN** sie `GET /api/ai/quota/` aufruft
- **THEN** enthält die Antwort `tier: "user"`, `limit_eur: 0.30`, `used_percent: 40` und `resets_at` = nächste Mitternacht Europe/Berlin

### Requirement: Kontingent-Anzeige im Frontend

Beide Frontends SHALL das KI-Kontingent angemeldeter Nutzer im Benutzermenü und im Kontobereich als Balken mit Prozentangabe und Rücksetzzeit anzeigen, z. B. „KI heute: 40 % genutzt · wieder voll um 0:00 Uhr“. Euro-Beträge SHALL nur Staff angezeigt werden. KI-Buttons SHALL bei aufgebrauchtem Kontingent deaktiviert sein, mit erklärendem Tooltip.

#### Scenario: Kontingent aufgebraucht
- **GIVEN** das Tageskontingent einer Nutzerin ist aufgebraucht
- **WHEN** sie eine Seite mit KI-Buttons öffnet
- **THEN** sind die KI-Buttons deaktiviert, mit dem Hinweis „Dein KI-Kontingent für heute ist aufgebraucht.“
