# Rezeptvarianten

## Kernidee

Ein Rezept kann mehrere **Varianten** haben. Eine Variante beschreibt eine alternative Version desselben Gerichts — entweder durch Zutaten-Substitution (vegan/nicht-vegan) oder durch optionale Ergänzungen (Gewürze, Schärfegrade, Toppings).

**Beispiele aus dem Stakeholder-Gespräch:**
- Quark ↔ Veganer Quark (Substitution — unterschiedliche Zutat, gleiche Funktion)
- "Scharf" ↔ "Mild" (optionale Gewürze — gleiche Basis, anderes Gewürz-Set)
- Mit Zwiebeln ↔ Ohne Zwiebeln (Ausschluss)
- Mit Käse überbacken ↔ Ohne Käse (für Laktose-Intolerante)

---

## Verwendung im Essensplan

Wenn ein Rezept in einen Essensplan übernommen wird, kann der Planer entscheiden:
- Welche Varianten er übernehmen möchte
- Wie viele Portionen (Normportionen) jede Variante bekommt

**Beispiel:**
> Rezept: "Nudeln mit Tomatensoße"
> Variante A: "Normal" → 8 Portionen
> Variante B: "Vegan (ohne Parmesan)" → 2 Portionen
>
> Gesamt: 10 Portionen, davon 80% Standard / 20% vegan

Der Einkaufszettel aggregiert dann korrekt:
- Parmesan: nur für 8 Portionen
- Hefeflocken (veganer Ersatz): nur für 2 Portionen
- Alles andere: für alle 10 Portionen

---

## Datenmodell-Konzept

### Bestehende Modelle (relevant)

- `Recipe` — das Hauptrezept
- `RecipeItem` — eine Zutat im Rezept (via `Portion → Ingredient`)
- `RecipeItem.note` — bereits vorhanden (z.B. "optional", "gehackt") — aber kein strukturiertes Varianten-Konzept
- `MealItem` — ein Rezept im Essensplan, mit `factor` (Skalierung)
- `MealItemOverride` — bereits vorhanden: überschreibt Menge einer Zutat oder schließt sie aus

### Neue Modelle

#### `RecipeVariant`

Gehört zu einem `Recipe`. Beschreibt eine benannte Variante.

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| `recipe` | FK → Recipe | Das Basisrezept |
| `name` | CharField | z.B. "Vegan", "Scharf", "Ohne Käse" |
| `description` | TextField | Kurze Beschreibung der Variante |
| `sort_order` | IntegerField | Reihenfolge im UI |
| `is_default` | BooleanField | Ob das die Standard-Variante ist |

#### `RecipeVariantItem`

Definiert, welche Zutaten-Änderungen eine Variante gegenüber dem Basisrezept hat.

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| `variant` | FK → RecipeVariant | |
| `recipe_item` | FK → RecipeItem (nullable) | Die originale Zutat, die geändert wird |
| `change_type` | CharField | `substitute` / `exclude` / `add` |
| `substitute_portion` | FK → Portion (nullable) | Ersatz-Zutat (nur bei `substitute`) |
| `substitute_quantity` | FloatField (nullable) | Menge der Ersatz-Zutat |
| `add_portion` | FK → Portion (nullable) | Zusätzliche Zutat (nur bei `add`) |
| `add_quantity` | FloatField (nullable) | |
| `note` | CharField | z.B. "Hefeflocken statt Parmesan" |

**Change-Types:**
- `substitute` — Zutat A wird durch Zutat B ersetzt (gleiche Menge oder neue Menge)
- `exclude` — Zutat wird weggelassen (z.B. "ohne Chilischoten")
- `add` — Zusätzliche Zutat wird hinzugefügt (z.B. "+ Sriracha")

---

#### `MealItemVariantAllocation`

Wenn ein Rezept mit Varianten in den Essensplan übernommen wird, speichert diese Tabelle, wie viele Portionen auf welche Variante entfallen.

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| `meal_item` | FK → MealItem | Der Eintrag im Essensplan |
| `variant` | FK → RecipeVariant (nullable) | Null = Basisrezept |
| `portions` | IntegerField | Wie viele Normportionen diese Variante bekommt |

**Constraint:** Die Summe aller `portions` über alle `MealItemVariantAllocation`-Einträge für ein `MealItem` MUSS gleich `meal.effective_portions` sein.

---

## UI-Konzept

### Rezept anlegen / bearbeiten — Tab "Varianten"

- Liste der bestehenden Varianten
- Button "Variante hinzufügen"
- Pro Variante:
  - Name (z.B. "Vegan")
  - Liste der Änderungen (Substitutionen, Ausschlüsse, Ergänzungen)
  - Jede Änderung referenziert eine originale Zutat aus dem Basisrezept
  - "Als Standard markieren"-Checkbox

### Essensplan — Rezept hinzufügen

Wenn ein Rezept **Varianten** hat, erscheint nach dem Hinzufügen ein Dialog:

**"Wie soll dieses Rezept aufgeteilt werden?"**

```
Nudeln mit Tomatensoße — 10 Portionen insgesamt

[ ] Standard (mit Parmesan)       [  8  ] Portionen
[ ] Vegan (Hefeflocken statt Parm) [  2  ] Portionen
                                  ────────
                                    10  ✓
```

- Schieberegler oder direkte Zahleneingabe pro Variante
- Echtzeit-Validierung: Summe muss gleich Gesamtportionen sein
- Wenn keine Varianten gewählt → Basisrezept für alle Portionen

### Einkaufsliste

Die Einkaufsliste aggregiert Zutaten **varianten-bewusst**:

- Gemeinsame Zutaten (alle Varianten) → Menge × Gesamtportionen
- Varianten-spezifische Zutaten → Menge × Variantenportionen
- Substitutionen werden korrekt aufgeteilt

**Anzeige-Beispiel:**
```
Nudeln (trocken)       500g  ×  10 Portionen  =  5.000g
Passierte Tomaten      200g  ×  10 Portionen  =  2.000g
Parmesan               30g   ×   8 Portionen  =    240g   [Standard]
Hefeflocken            20g   ×   2 Portionen  =     40g   [Vegan]
```

---

## Nährwertberechnung

Für ein `MealItem` mit Varianten-Allokation wird die Nährwertberechnung nach Portionen gewichtet:

```
energy_kcal_total =
    Σ (variant_portions / total_portions) × variant_energy_kcal × total_portions
```

wobei `variant_energy_kcal` die Energie des Basisrezepts ist, angepasst um die Substitutionen der Variante.

---

## Abgrenzung zu bestehenden Modellen

| Konzept | Modell | Unterschied zu Varianten |
|---------|--------|--------------------------|
| `MealItemOverride` | Überschreibt Zutaten-Menge für einen spezifischen MealItem | Gilt für alle Portionen des MealItems, nicht aufteilbar |
| `Recipe.forked_from` | Persönliche Kopie eines Rezepts | Eigenständiges Rezept, keine Verbindung zum Original |
| `RecipeItem.note` | Freitext-Notiz (z.B. "optional") | Nicht strukturiert, kein UI, kein Einkaufslisten-Effekt |

**Varianten ergänzen `MealItemOverride`:** Overrides bleiben für ad-hoc Anpassungen am Essensplan. Varianten sind für **wiederkehrende, rezept-definierte Alternativen**.

---

## Typische Anwendungsfälle im Pfadfinderlager

### Diät / Unverträglichkeiten
- Rezept: "Käsespätzle"
  - Variante "Vegan": Käse → Cashew-Sauce, kein Butter → Pflanzenmargarine
  - Variante "Laktosefrei": gleich wie vegan, oder Laktosefreier Käse
- Planungslogik: 2 von 10 Personen vegan → Variante "Vegan": 2 Portionen

### Schärfegrad
- Rezept: "Chili con Carne"
  - Variante "Mild" (Basis): 1 Chilischote
  - Variante "Scharf": + 3 Chilischoten, + Cayennepfeffer
- Nicht nach Portionen aufteilen, sondern: Gesamtmenge → 2 Töpfe

### Saisonale / verfügbare Zutaten
- Rezept: "Obstsalat"
  - Variante "Sommer": Erdbeeren, Himbeeren
  - Variante "Herbst": Äpfel, Birnen, Trauben
- Beim Einplanen die passende Saison-Variante wählen

### Allergiker
- Rezept: "Pfannkuchen"
  - Variante "Glutenfrei": Weizenmehl → Reismehl
  - Variante "Ei-frei": Ei → Leinsamen-Ei

---

## Offene Fragen

- Sollen Varianten-Nährwerte **gecacht** werden (wie `Recipe.cached_energy_kcal`) oder immer live berechnet?
- Wie verhält sich die Duplicate-Recipe-Regel im Suggestions-Tab, wenn dasselbe Rezept in zwei Mahlzeiten mit unterschiedlichen Varianten vorkommt?
- Braucht der Wizard beim Hinzufügen ins Meal den vollen Varianten-Dialog — oder reicht zunächst eine einfachere Aufteilung (nur Portionen-Split ohne Variantendetails)?
- Soll es Varianten geben, die **keinen Portionen-Split** ermöglichen, sondern nur "diese Variante statt der Standardvariante" (1-aus-N-Auswahl statt Aufteilung)?
