## Why

Beim Erstellen von Rezepten über das Smart-Input-Feld (z. B. Einfügen kopierter Zutatenlisten aus Rezeptwebseiten) traten massive Verfälschungen der Mengenangaben und Einheiten auf. So wurden aus 100 g Lauch 10.000 g (10 kg), aus 1 EL Butter (15 g) wurden 15 Esslöffel Butter, Pluralendungen wie `(n)` wurden als Zubereitungsnotizen fehlinterpretiert, und bei reinen Zutatenlisten erfand die KI ungefragt Zutaten hinzu. Zudem erzeugte jede Eingabe von Basiszutaten (wie Möhren, Nudeln oder Butter) blind neue Zutatenduplikate in der Datenbank (bereits bis zu 34-fache Duplikate vorhanden).

Diese Fehler müssen behoben werden, um den Rezept-Import und den Inline-Zutaten-Editor verlässlich und robust zu machen, abgesichert durch umfassende Unit- und Integrationstests.

## What Changes

- **Physikalische Einheiten-Invariante (Backend)**: Portionen mit Messeinheiten vom Typ Gramm (`g`) und Milliliter (`ml`) dürfen unter keinen Umständen ein `weight_g != 1.0` zugewiesen bekommen. In `_resolve_portion` wird verhindert, dass geschätzte Gewichte (z. B. 100g Standard-Fallback) auf Einheiten wie Gramm oder Milliliter angewandt werden und Zombie-Portionen wie `"g (100 g)"` erzeugt werden.
- **Einheiten- und Mengen-Konsistenz im Inline-Editor (Frontend)**: Im `InlineIngredientEditor` wird behoben, dass Mengenumrechnungen in Gramm mit dem Label einer Nicht-Gramm-Einheit verknüpft werden. 1 EL Butter (15 g) muss im Zahlenfeld `1` und im Dropdown `Esslöffel` anzeigen (oder `15` mit Einheit `Gramm`), niemals `15 Esslöffel`.
- **Robuster Name- und Notiz-Parser (Backend)**: In `IngredientNameParser` werden Pluralformen wie `(n)`, `(s)`, `(en)` korrekt als Nomenendung behandelt und nicht mehr als Zubereitungsnotiz `n` in das Notizfeld extrahiert. Zudem werden fehlende gängige Einheiten (wie `Zehe`, `Zehen`) im kanonischen Einheiten-Mapping unterstützt.
- **Duplikats-Prävention im IngredientMatcher (Backend)**: Wenn bei der Zutatensuche mehrere identische exakte Matches oder hochgradige Treffer vorliegen, darf das System nicht blind neue Draft-Zutaten in der Datenbank anlegen, sondern muss die kanonische bestehende Zutat wählen.
- **KI-Prompting für reine Zutatenlisten (Backend)**: Erkennung und Prompt-Anpassung, wenn der Input eine reine Zutatenliste ohne Titel und Schritte ist, sodass keine Halluzinationen (wie hinzugefügte Kräuter/Gewürze) in die Zutatenliste gelangen.

## Capabilities

### Modified Capabilities
- `recipe-url-import`: Robuste Verarbeitung von Smart-Input-Rezepttexten, Erhalt der tatsächlichen Mengenangaben, Pluralbehandlung, Zutatenduplikatsvermeidung und Verhinderung von Halluzinationen bei reinen Zutatenlisten.
- `portion-integrity-guardrails`: Strikte Invariante, dass Einheiten für Masse (Gramm) und Volumen (Milliliter) niemals ein willkürliches Portionsgewicht (wie 1g = 100g) zugewiesen bekommen dürfen.
- `recipe-portion-scaling-edit`: `InlineIngredientEditor` synchronisiert Zahlenfeld und Einheiten-Dropdown konsistent, sodass Nicht-Gramm-Portionen (Stück, EL, TL) mit ihrer Portion-Anzahl angezeigt werden und nicht mit dem Grammgewicht.

## Impact

- **Backend**:
  - `backend/recipe/services/url_import_service.py`: `_resolve_portion` absichern gegen `weight_g`-Überschreibungen bei `g`/`ml`; Duplikatanlage bei `needs_review` verhindern.
  - `backend/recipe/services/ingredient_parser.py`: Plural-Erkennung `(n)`, `(s)` vor Notiz-Split; Einheiten-Mapping um `Zehe`/`Zehen` erweitern.
  - `backend/recipe/services/ingredient_matcher.py`: Multi-Match-Handling bei identischen Zutatennamen bereinigen.
  - `backend/recipe/services/recipe_ai_suggest_service.py`: Duplikaterzeugung bei `needs_review` eindämmen.
  - Tests: `backend/recipe/tests/test_ingredient_parser.py`, `backend/recipe/tests/test_url_import_portion_resolution.py`, neue Tests für Smart-Input.
- **Frontend**:
  - `frontend-food/src/components/recipe/InlineIngredientEditor.tsx`: `normalizeItems` und Anzeigelogik für Portionen entflechten.
  - Tests: `frontend-food/src/components/recipe/__tests__/InlineIngredientEditor.normalizeItems.test.ts`.
