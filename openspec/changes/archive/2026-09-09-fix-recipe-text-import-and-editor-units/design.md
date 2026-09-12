## Context

Der Rezept-Import über das Smart-Input-Feld (`POST /api/recipes/smart-input/`) und die anschließende Bearbeitung im `InlineIngredientEditor` zeigen schwere Fehlkalkulationen bei Mengenangaben, unpassende Zuordnungen und unkontrollierte Duplikat-Anlage in der Datenbank.

1. **Portion-Resolution (`url_import_service.py`)**:
   Wenn die KI beim Extrahieren `estimated_portion_weight_g` (z. B. Fallback 100) zurückgibt, wird in `_resolve_portion` für Einheiten wie Gramm oder Milliliter eine neue Portion angelegt (z. B. `g (100 g)` mit `weight_g=100`). Wenn ein Rezept 100 g Lauch verlangt, entstehen `100 * 100g = 10.000 g` Lauch.
2. **Inline-Editor Einheiten-Entkopplung (`InlineIngredientEditor.tsx`)**:
   In `normalizeItems` werden Rezeptzutaten für die Editier-Menge in Gramm umgerechnet (`quantity * portionWeightG`). Bei Stück- oder Löffel-Einheiten (z. B. 1 EL Butter mit 15 g) steht danach `15` im Mengen-Input, während das Einheiten-Dropdown `Esslöffel` anzeigt. Der Nutzer sieht `15 Esslöffel`, was beim erneuten Speichern zu einer Ver-15-fachung führen kann.
3. **Zutaten-Parser Pluralnotiz (`ingredient_parser.py`)**:
   `IngredientNameParser._split_name_note` trennt Klammerausdrücke am Ende ab. `Möhre(n)` oder `Kartoffel(n)` werden in Name `Möhre` und Notiz `n` zerlegt.
4. **Duplikats-Erzeugung bei Zutatensuche (`ingredient_matcher.py`, `url_import_service.py`)**:
   Wenn bereits mehrere identische Einträge (z. B. 16x "Butter") existieren, führt der minimale Score-Unterschied zu `needs_review=True`. Der Import legt daraufhin sofort einen neuen Zutat-Draft in der DB an, anstatt auf die bestehende Zutat zurückzugreifen.

## Goals / Non-Goals

**Goals:**
- Strikte Invariante für Gramm (`g`) und Milliliter (`ml`): `weight_g` ist immer fest auf 1.0 (bzw. abgeleitet von Dichte), niemals durch KI-Schätzungen überschreibbar. Keine Anlage von Portionen wie `"g (100 g)"`.
- Bereinigung des `InlineIngredientEditor`: Bei Portionen mit eigenem Einheitenlabel (wie `Esslöffel`, `Teelöffel`, `Stück`, `Prise`) zeigt das Mengenfeld die Anzahl der Einheiten (z. B. `1` EL) an, nicht das Grammgewicht (`15`).
- Korrekte Behandlung von Plural-Klammern `(n)`, `(s)`, `(en)` im Parser als Teil des Zutatennamens oder Bereinigung ohne Erzeugung einer Ein-Buchstaben-Notiz.
- Unterstützung von `Zehe`/`Zehen` im Einheiten-Mapping.
- Deduplizierungs-Schutz: Bei exakten Zutatentreffern wird kein neuer Draft erstellt, sondern die bestbewertete/verifizierte Zutat verwendet.
- Reines Zutaten-Prompting: Bei reinen Zutatenlisten darf Gemini keine erfundenen Zutaten (z. B. Petersilie) hinzudichten.
- Umfassende Absicherung durch Backend- und Frontend-Unit-Tests.

**Non-Goals:**
- Vollständiger manueller Aufräum-Lauf aller historischen Duplikate in Produktionsdaten (wird separat über Management-Command/Deduplizierung gehandhabt).
- Neugestaltung des gesamten Wizard-Layouts.

## Decisions

### Decision 1: Hard Guard für Gramm- und Milliliter-Portionen
- **Entscheidung**: In `_resolve_portion` und `_should_update_weight` wird geprüft, ob die Messeinheit eine reine Gewichtseinheit (`g`, `Gramm`, `kg`) oder Volumeneinheit (`ml`, `Milliliter`, `l`, `Liter`) ist.
- Für `g` und `Gramm` ist `weight_g` immer 1.0. Es wird unter keinen Umständen eine neue Portion mit `weight_g != 1.0` angelegt.
- **Alternative**: Vertrauen auf KI-Rückgabewerte. Verwurfen, da LLMs für Basiseinheiten unzuverlässig Schätzungen liefern.

### Decision 2: Mengenrepräsentation im InlineIngredientEditor
- **Entscheidung**: Direct-Unit-Portionen (wie Stück, EL, TL, Prise) behalten ihre Zählmenge im Eingabefeld (`quantity`). Die Gramm-Berechnung daneben (`= 15 g`) bleibt als informative Vorschau erhalten. Nur reine Gramm-Portionen operieren direkt auf Gramm.
- **Alternative**: Alles strikt in Gramm umrechnen und das Dropdown zwangsweise auf "Gramm" umstellen. Verwurfen, weil Köche Rezepte in "1 EL" oder "2 Zehen" erfassen und bearbeiten wollen.

### Decision 3: Plural-Erkennung in `_split_name_note`
- **Entscheidung**: Regex vor der Notiz-Trennung erweitern: Endungen wie `(n)`, `(s)`, `(en)`, `(r)` am Wortende werden direkt in die Grundform normalisiert oder ignoriert, anstatt als Notiz abgetrennt zu werden.
- **Alternative**: Notizen mit Länge <= 2 Zeichen verwerfen. Besser ist eine gezielte Plural-Erkennung (`\((n|s|en|r)\)`), damit legitime kurze Notizen (z. B. `TK`) erhalten bleiben können.

### Decision 4: Exakte Treffer im IngredientMatcher bevorzugen
- **Entscheidung**: Wenn Kandidaten mit Confidence 1.0 oder exakter Namensgleichheit existieren, wird `needs_review=False` gesetzt und der beste Kandidat (bevorzugt Status VERIFIED oder mit den meisten Verwendungen) ausgewählt, anstatt `needs_review=True` wegen Duplikat-Differenz < 0.1 auszulösen.
- **Alternative**: Immer neuen Draft erzeugen. Hat zur aktuellen Duplikat-Explosion geführt und ist der Kern des Problems.

## Risks / Trade-offs

- **[Risk] Bestehende Rezepte mit verfälschten Portionen**: Historisch angelegte Portionen wie `g (100 g)` könnten noch in alten Datensätzen liegen.
  → *Mitigation*: Beim Laden und Auflösen von Portionen werden reine Gramm-Einheiten normalisiert; neue Speichervorgänge erzwingen die korrekten Invarianten.
- **[Risk] Kompatibilität mit bestehenden Frontend-Tests**: Einige Tests im Inline-Editor prüften bisher die fehlerhafte Grammumrechnung für Kompositportionen.
  → *Mitigation*: Testfälle in `InlineIngredientEditor.normalizeItems.test.ts` und `savePath.test.ts` an das saubere Verhalten für Löffel- und Stückportionen anpassen.
