## ADDED Requirements

### Requirement: Comprehensive RecipeHint rules for macronutrients
The system SHALL provide at least the following RecipeHint rules for macronutrient evaluation (per 100g values of a recipe), seeded via `seed_all.py`:

**Energie (energy_kj):**
| Name | Parameter | Min/Max | Value | Level | Objective | Improvement Text |
|------|-----------|---------|-------|-------|-----------|------------------|
| Etwas weniger Energie | energy_kj | max | 3000 | warning | health | Verwende mehr Gemüse und weniger fettreiche Zutaten, um den Energiegehalt zu senken. |
| Viel zu viel Energie | energy_kj | max | 4000 | error | health | Der Energiegehalt ist sehr hoch. Ersetze Sahne durch Milch, Butter durch Olivenöl oder füge mehr Gemüse hinzu. |
| Etwas mehr Energie | energy_kj | min | 1900 | warning | fulfillment | Die Mahlzeit liefert wenig Energie. Ergänze Kohlenhydratquellen wie Kartoffeln, Reis oder Brot. |
| Viel mehr Energie nötig | energy_kj | min | 1500 | error | fulfillment | Die Mahlzeit hat deutlich zu wenig Energie für eine Hauptmahlzeit. Füge sättigende Beilagen hinzu. |

**Eiweiß (protein_g):**
| Name | Parameter | Min/Max | Value | Level | Objective | Improvement Text |
|------|-----------|---------|-------|-------|-----------|------------------|
| Mehr Eiweiß | protein_g | min | 30 | warning | health | Ergänze eiweißreiche Zutaten wie Hülsenfrüchte, Tofu, Eier oder mageres Fleisch. |
| Viel mehr Eiweiß nötig | protein_g | min | 10 | error | health | Der Eiweißgehalt ist sehr niedrig. Füge eine Proteinquelle wie Linsen, Kichererbsen oder Quark hinzu. |
| Zu viel Eiweiß | protein_g | max | 80 | warning | health | Der Eiweißgehalt ist hoch. Bei Hauptmahlzeiten ist das ok, bei Snacks eher ungewöhnlich. |

**Fett (fat_g):**
| Name | Parameter | Min/Max | Value | Level | Objective | Improvement Text |
|------|-----------|---------|-------|-------|-----------|------------------|
| Hoher Fettgehalt | fat_g | max | 20 | info | health | Der Fettgehalt ist erhöht. Prüfe ob gesättigte Fette durch ungesättigte ersetzt werden können. |
| Viel Fett | fat_g | max | 35 | warning | health | Reduziere fettreiche Zutaten. Ersetze Sahne durch Joghurt oder brate mit weniger Öl. |
| Sehr viel Fett | fat_g | max | 50 | error | health | Der Fettgehalt ist sehr hoch. Verwende fettarme Alternativen und mehr Gemüse. |

**Gesättigte Fettsäuren (fat_sat_g):**
| Name | Parameter | Min/Max | Value | Level | Objective | Improvement Text |
|------|-----------|---------|-------|-------|-----------|------------------|
| Viel gesättigte Fettsäuren | fat_sat_g | max | 20 | warning | health | Ersetze Butter durch Rapsöl oder Olivenöl und verwende fettarme Milchprodukte. |
| Sehr viel gesättigte Fettsäuren | fat_sat_g | max | 40 | error | health | Der Anteil gesättigter Fettsäuren ist viel zu hoch. Tausche Sahne gegen Kokosmilch light oder verwende Nussmus. |

**Kohlenhydrate (carbohydrate_g):**
| Name | Parameter | Min/Max | Value | Level | Objective | Improvement Text |
|------|-----------|---------|-------|-------|-----------|------------------|
| Wenig Kohlenhydrate | carbohydrate_g | min | 20 | warning | fulfillment | Ergänze Kohlenhydratquellen wie Vollkornbrot, Kartoffeln oder Hirse für bessere Sättigung. |
| Sehr wenig Kohlenhydrate | carbohydrate_g | min | 10 | error | fulfillment | Die Mahlzeit hat kaum Kohlenhydrate. Für aktive Pfadfinder ist eine gute Kohlenhydratversorgung wichtig. |
| Sehr viele Kohlenhydrate | carbohydrate_g | max | 70 | warning | health | Der Kohlenhydratanteil ist sehr hoch. Prüfe den Zuckeranteil und ersetze ggf. Weißmehl durch Vollkorn. |

**Zucker (sugar_g):**
| Name | Parameter | Min/Max | Value | Level | Objective | Improvement Text |
|------|-----------|---------|-------|-------|-----------|------------------|
| Viel Zucker | sugar_g | max | 20 | warning | health | Reduziere Zucker. Verwende reifes Obst als natürliche Süße oder ersetze Zucker teilweise durch Apfelmark. |
| Sehr viel Zucker | sugar_g | max | 40 | error | health | Der Zuckergehalt ist viel zu hoch. Halbiere die Zuckermenge oder verwende Alternativen wie Dattelpaste. |
| Hoher Zuckeranteil an KH | sugar_g | max | 15 | info | health | Prüfe ob der Zucker aus natürlichen Quellen (Obst) oder zugesetztem Zucker stammt. |

**Salz (salt_g):**
| Name | Parameter | Min/Max | Value | Level | Objective | Improvement Text |
|------|-----------|---------|-------|-------|-----------|------------------|
| Zu viel Salz | salt_g | max | 2.0 | warning | health | Verwende weniger Salz und würze stattdessen mit Kräutern, Zitrone oder Gewürzen. |
| Viel zu viel Salz | salt_g | max | 4.0 | error | health | Der Salzgehalt ist gefährlich hoch. Reduziere Fertigprodukte und salze sparsam nach. |

**Natrium (sodium_mg):**
| Name | Parameter | Min/Max | Value | Level | Objective | Improvement Text |
|------|-----------|---------|-------|-------|-----------|------------------|
| Viel Natrium | sodium_mg | max | 500 | warning | health | Reduziere salzhaltige Zutaten wie Käse, Wurst oder Fertigsaucen. |
| Zu viel Natrium | sodium_mg | max | 1000 | error | health | Der Natriumgehalt ist deutlich zu hoch. Verwende frische statt verarbeiteter Zutaten. |
| Wenig Natrium | sodium_mg | min | 300 | warning | health | Etwas Salz ist wichtig für den Elektrolythaushalt, besonders bei aktiven Pfadfindern. |

**Ballaststoffe (fibre_g):**
| Name | Parameter | Min/Max | Value | Level | Objective | Improvement Text |
|------|-----------|---------|-------|-------|-----------|------------------|
| Mehr Ballaststoffe | fibre_g | min | 3 | info | fulfillment | Ergänze ballaststoffreiche Zutaten wie Vollkornprodukte, Hülsenfrüchte oder Gemüse. |
| Viel mehr Ballaststoffe | fibre_g | min | 1 | warning | health | Der Ballaststoffgehalt ist sehr niedrig. Ersetze weißen Reis durch Vollkornreis oder füge Leinsamen hinzu. |
| Zu wenig Ballaststoffe für Sättigung | fibre_g | min | 5 | warning | fulfillment | Für eine gute Sättigung sollte die Mahlzeit mehr Ballaststoffe enthalten. Verwende Vollkornprodukte. |

**Nutri-Score (nutri_class):**
| Name | Parameter | Min/Max | Value | Level | Objective | Improvement Text |
|------|-----------|---------|-------|-------|-----------|------------------|
| Nicht gesund | nutri_class | max | 2 | warning | health | Der Nutri-Score ist nur mittelmäßig. Erhöhe den Gemüse- und Obstanteil. |
| Ungesundes Rezept | nutri_class | max | 3 | error | health | Der Nutri-Score ist schlecht. Überarbeite die Zusammensetzung grundlegend mit mehr frischen Zutaten. |

**Gewicht (weight_g):**
| Name | Parameter | Min/Max | Value | Level | Objective | Improvement Text |
|------|-----------|---------|-------|-------|-----------|------------------|
| Etwas mehr Gewicht | weight_g | min | 300 | warning | fulfillment | Die Portion ist recht klein. Ergänze Beilagen oder Salat für eine sättigende Mahlzeit. |
| Viel mehr Gewicht | weight_g | min | 200 | error | fulfillment | Die Portionsgröße ist zu gering für eine Hauptmahlzeit. Füge substanzielle Zutaten hinzu. |
| Etwas weniger Gewicht | weight_g | max | 650 | warning | cost | Die Portion ist recht groß. Prüfe ob die Mengen pro Person korrekt sind. |
| Viel Gewicht | weight_g | max | 750 | error | cost | Die Portionsgröße ist sehr groß. Reduziere die Mengen oder teile in Vor- und Hauptspeise auf. |

#### Scenario: Recipe with excessive sugar triggers warning hint
- **WHEN** a recipe has `sugar_g > 20` per 100g
- **THEN** the system SHALL return a RecipeHint with level "warning", objective "health", and improvement text suggesting sugar reduction

#### Scenario: Recipe with low fibre triggers fulfillment hint
- **WHEN** a recipe has `fibre_g < 5` per 100g
- **THEN** the system SHALL return a RecipeHint with level "warning", objective "fulfillment", and improvement text suggesting whole grain products

#### Scenario: Recipe with good nutrition has no warnings
- **WHEN** a recipe has balanced macronutrient values within all thresholds
- **THEN** the system SHALL return no warning or error level hints

### Requirement: RecipeHint rules for vitamins
The system SHALL provide RecipeHint rules for vitamin coverage evaluation. These rules evaluate the per-serving vitamin content against DGE reference percentages:

| Name | Parameter | Min/Max | Value | Level | Objective | Improvement Text |
|------|-----------|---------|-------|-------|-----------|------------------|
| Wenig Vitamin C | vitamin_c_mg | min | 10 | warning | health | Ergänze Vitamin-C-reiche Zutaten wie Paprika, Brokkoli, Zitrusfrüchte oder Petersilie. |
| Kein Vitamin C | vitamin_c_mg | min | 2 | error | health | Das Rezept enthält fast kein Vitamin C. Füge frisches Obst oder rohes Gemüse hinzu. |
| Wenig Vitamin A | vitamin_a_mg | min | 0.1 | warning | health | Ergänze Vitamin-A-reiche Zutaten wie Karotten, Süßkartoffeln, Spinat oder Kürbis. |
| Wenig Vitamin D | vitamin_d_ug | min | 1.0 | info | health | Vitamin-D-reiche Lebensmittel wie fetter Fisch, Eier oder Pilze können den Gehalt erhöhen. |
| Wenig Vitamin B12 | vitamin_b12_ug | min | 0.5 | warning | health | Vitamin B12 kommt nur in tierischen Produkten vor. Bei veganen Rezepten ggf. angereicherte Lebensmittel verwenden. |
| Wenig Folat | folate_ug | min | 30 | warning | health | Ergänze folatreiche Zutaten wie Blattgemüse, Hülsenfrüchte, Vollkornprodukte oder Nüsse. |

#### Scenario: Vegan recipe triggers B12 hint
- **WHEN** a vegan recipe has `vitamin_b12_ug < 0.5` per serving
- **THEN** the system SHALL return a hint suggesting fortified foods

### Requirement: RecipeHint rules for minerals
The system SHALL provide RecipeHint rules for mineral coverage evaluation:

| Name | Parameter | Min/Max | Value | Level | Objective | Improvement Text |
|------|-----------|---------|-------|-------|-----------|------------------|
| Wenig Calcium | calcium_mg | min | 100 | warning | health | Ergänze calciumreiche Zutaten wie Milchprodukte, Brokkoli, Sesam oder angereicherte Pflanzendrinks. |
| Sehr wenig Calcium | calcium_mg | min | 30 | error | health | Das Rezept enthält kaum Calcium. Für Kinder und Jugendliche ist Calcium essenziell für den Knochenaufbau. |
| Wenig Eisen | iron_mg | min | 2.0 | warning | health | Ergänze eisenreiche Zutaten wie Hülsenfrüchte, Vollkornprodukte, Haferflocken oder dunkelgrünes Blattgemüse. Vitamin C verbessert die Eisenaufnahme. |
| Sehr wenig Eisen | iron_mg | min | 0.5 | error | health | Der Eisengehalt ist sehr niedrig. Besonders für Jugendliche ist eine gute Eisenversorgung wichtig. |
| Wenig Magnesium | magnesium_mg | min | 30 | warning | health | Ergänze magnesiumreiche Zutaten wie Nüsse, Samen, Vollkornprodukte oder Bananen. |
| Wenig Zink | zinc_mg | min | 1.0 | warning | health | Ergänze zinkreiche Zutaten wie Kürbiskerne, Linsen, Haferflocken oder Käse. |
| Wenig Kalium | potassium_mg | min | 200 | warning | health | Ergänze kaliumreiche Zutaten wie Bananen, Kartoffeln, Tomaten oder Hülsenfrüchte. Besonders wichtig bei sportlicher Aktivität. |

#### Scenario: Recipe low in calcium triggers warning
- **WHEN** a recipe has `calcium_mg < 100` per serving
- **THEN** the system SHALL return a hint about calcium-rich ingredients

### Requirement: RecipeHint rules differentiated by recipe type
RecipeHint rules MAY be filtered by `recipe_type`. The system SHALL apply type-specific thresholds:

**Breakfast-specific rules:**
| Name | Parameter | Min/Max | Value | Level | Recipe Type | Objective | Improvement Text |
|------|-----------|---------|-------|-------|-------------|-----------|------------------|
| Frühstück: wenig Ballaststoffe | fibre_g | min | 4 | warning | breakfast | health | Vollkornbrot oder Müsli mit Haferflocken sind ideal für ein ballaststoffreiches Frühstück. |
| Frühstück: zu süß | sugar_g | max | 15 | warning | breakfast | health | Verwende ungesüßtes Müsli und frisches Obst statt Marmelade oder Schoko-Aufstrich. |
| Frühstück: wenig Energie | energy_kj | min | 1500 | warning | breakfast | fulfillment | Das Frühstück sollte genug Energie für den Vormittag liefern. Ergänze Nüsse oder Käse. |

**Snack-specific rules:**
| Name | Parameter | Min/Max | Value | Level | Recipe Type | Objective | Improvement Text |
|------|-----------|---------|-------|-------|-------------|-----------|------------------|
| Snack: zu viel Zucker | sugar_g | max | 10 | warning | snack | health | Ersetze süße Snacks durch Obst, Gemüsesticks oder Nüsse. |
| Snack: zu viel Energie | energy_kj | max | 1500 | warning | snack | health | Ein Snack sollte nicht zu viel Energie haben. Greife zu leichten Alternativen. |
| Snack: zu viel Fett | fat_g | max | 15 | warning | snack | health | Wähle fettärmere Snack-Alternativen wie Reiswaffeln oder frisches Obst. |

**Drink-specific rules:**
| Name | Parameter | Min/Max | Value | Level | Recipe Type | Objective | Improvement Text |
|------|-----------|---------|-------|-------|-------------|-----------|------------------|
| Getränk: zu viel Zucker | sugar_g | max | 8 | warning | drink | health | Verwende weniger Zucker oder ersetze durch frische Früchte. Wasser ist immer die beste Wahl. |
| Getränk: viel Zucker | sugar_g | max | 15 | error | drink | health | Der Zuckergehalt ist für ein Getränk viel zu hoch. Verdünne Säfte oder verwende ungesüßte Tees. |

#### Scenario: Breakfast recipe triggers breakfast-specific fibre hint
- **WHEN** a recipe with type "breakfast" has `fibre_g < 4` per 100g
- **THEN** the system SHALL match the breakfast-specific fibre hint (not the generic one)

#### Scenario: Generic rule applies when no type-specific rule exists
- **WHEN** a recipe with type "warm_meal" has `sugar_g > 20` per 100g and no warm_meal-specific sugar rule exists
- **THEN** the system SHALL match the generic sugar warning rule

### Requirement: RecipeHint improvement_text field
The RecipeHint model SHALL have an `improvement_text` field (TextField, blank=True) that contains a concrete, actionable improvement suggestion in German. This field SHALL be separate from the `description` field. Every seeded RecipeHint MUST have an improvement_text.

#### Scenario: Hint with improvement text in API response
- **WHEN** a recipe triggers a RecipeHint that has an improvement_text
- **THEN** the API response SHALL include both the hint description and the improvement_text

### Requirement: Extended HealthRules for cockpit
The system SHALL provide HealthRules for the cockpit dashboard covering vitamins and minerals in addition to macronutrients. New HealthRules:

**Day scope:**
| Name | Parameter | Green | Yellow | Unit | Tip Text |
|------|-----------|-------|--------|------|----------|
| Vitamin C pro Tag | vitamin_c_mg | 60 | 30 | mg | Mehr frisches Obst und Gemüse einplanen, z.B. Paprika oder Orangensaft zum Frühstück. |
| Calcium pro Tag | calcium_mg | 800 | 400 | mg | Milchprodukte oder calciumreiche Alternativen wie Sesam und Brokkoli einplanen. |
| Eisen pro Tag | iron_mg | 10 | 5 | mg | Eisenreiche Lebensmittel wie Haferflocken und Hülsenfrüchte einplanen. Vitamin-C-haltige Beilage verbessert die Aufnahme. |
| Ballaststoffe pro Tag | fibre_g | 25 | 15 | g | Mehr Vollkornprodukte, Gemüse und Hülsenfrüchte einplanen. |
| Protein pro Tag | protein_g | 46 | 30 | g | Ausreichend Proteinquellen über den Tag verteilen: Milchprodukte, Hülsenfrüchte, Eier. |
| Fett pro Tag | fat_g | 70 | 90 | g | Fettgehalt der Mahlzeiten prüfen. Frittiertes und Sahnesoßen reduzieren. |
| Salz pro Tag | salt_g | 5 | 8 | g | Weniger salzige Fertigprodukte und mehr frisch kochen. |
| Vitamin A pro Tag | vitamin_a_mg | 0.8 | 0.4 | mg | Karotten, Süßkartoffeln oder Spinat einplanen. |
| Folat pro Tag | folate_ug | 300 | 150 | µg | Blattgemüse, Hülsenfrüchte oder Vollkornprodukte einplanen. |
| Magnesium pro Tag | magnesium_mg | 300 | 150 | mg | Nüsse, Samen und Vollkornprodukte sind gute Magnesiumquellen. |
| Kalium pro Tag | potassium_mg | 3000 | 1500 | mg | Bananen, Kartoffeln und Hülsenfrüchte einplanen. Wichtig bei sportlicher Aktivität. |
| Zink pro Tag | zinc_mg | 8 | 4 | mg | Kürbiskerne, Haferflocken oder Käse als Zinkquellen einplanen. |

**Meal scope (additional):**
| Name | Parameter | Green | Yellow | Unit | Tip Text |
|------|-----------|-------|--------|------|----------|
| Vitamin C pro Mahlzeit | vitamin_c_mg | 20 | 10 | mg | Frisches Gemüse oder Obst als Beilage servieren. |
| Ballaststoffe pro Mahlzeit | fibre_g | 8 | 4 | g | Vollkornprodukte statt Weißmehlprodukte verwenden. |
| Salzgehalt pro Mahlzeit | salt_g | 2 | 3 | g | Weniger nachsalzen und mehr mit Kräutern würzen. |

#### Scenario: Day cockpit shows vitamin C warning
- **WHEN** a meal day has total vitamin_c_mg below 30
- **THEN** the cockpit SHALL show a yellow status for the Vitamin C rule with the improvement tip

#### Scenario: All day nutrients in green range
- **WHEN** a meal day meets all nutrient thresholds for green status
- **THEN** the cockpit SHALL show all-green summary with green_count equal to total rule count
