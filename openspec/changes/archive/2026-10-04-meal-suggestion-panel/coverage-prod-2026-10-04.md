<!-- Read-only Lauf gegen Prod am 2026-10-04 (nach Backfill_standalone_food): backend/manage.py report_suggestion_coverage -->
# Abdeckung der Vorschläge (Lücke = weniger als 4 Treffer)

| Meal-Typ | Richtung | alle | taste=sweet | taste=savory | prep=none | prep=some | kids | budget=cheap | diet=vegetarian | cooking=none | cooking=campfire | cooking=gas_burner | cooling=none |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| breakfast | bread | 72 | 25 | 47 | 43 | 29 | 70 | 53 | 65 | 55 | 71 | 67 | 62 |
| breakfast | muesli | 4 | **1** | **3** | **3** | **1** | 4 | 4 | 4 | **3** | 4 | 4 | **3** |
| breakfast | warm | **2** | **0** | **2** | **0** | **2** | **2** | **2** | **2** | **0** | **2** | **2** | **1** |
| breakfast | fruit_yogurt | 14 | 6 | 8 | 8 | 6 | 14 | 12 | 14 | 13 | 14 | 14 | 9 |
| lunch | classic | 96 | **1** | 95 | 10 | 86 | 87 | 27 | 50 | 17 | 88 | 86 | 83 |
| lunch | vegetarian | 50 | **1** | 49 | 9 | 41 | 44 | 20 | 50 | 13 | 48 | 47 | 48 |
| lunch | one_pot | 29 | **0** | 29 | **1** | 28 | 20 | 6 | 18 | **1** | 25 | 24 | 26 |
| lunch | quick_cheap | 27 | **1** | 26 | 9 | 18 | 25 | 27 | 20 | 13 | 26 | 25 | 22 |
| lunch | dessert | 25 | 7 | 18 | **2** | 23 | 25 | 15 | 23 | 16 | 18 | 16 | 20 |
| dinner | classic | 96 | **1** | 95 | 10 | 86 | 87 | 27 | 50 | 17 | 88 | 86 | 83 |
| dinner | vegetarian | 50 | **1** | 49 | 9 | 41 | 44 | 20 | 50 | 13 | 48 | 47 | 48 |
| dinner | one_pot | 29 | **0** | 29 | **1** | 28 | 20 | 6 | 18 | **1** | 25 | 24 | 26 |
| dinner | quick_cheap | 27 | **1** | 26 | 9 | 18 | 25 | 27 | 20 | 13 | 26 | 25 | 22 |
| dinner | dessert | 25 | 7 | 18 | **2** | 23 | 25 | 15 | 23 | 16 | 18 | 16 | 20 |
| snack | fruit_veg | 56 | 11 | 45 | 51 | 5 | 32 | 42 | 45 | 53 | 55 | 53 | 56 |
| snack | sweet | 35 | 35 | **0** | 26 | 9 | 35 | 25 | 30 | 30 | 34 | 31 | 33 |
| snack | savory | 81 | **0** | 81 | 58 | 23 | 53 | 57 | 56 | 70 | 74 | 71 | 68 |
| snack | homemade | 32 | 9 | 23 | **0** | 32 | 32 | 14 | 28 | 16 | 24 | 18 | 26 |
| drinks | cold | 20 | **1** | 19 | 19 | **1** | 20 | 15 | 9 | 20 | 20 | 20 | 13 |
| drinks | warm | 18 | **2** | 16 | 6 | 12 | 12 | 16 | 14 | 6 | 18 | 18 | 17 |
| drinks | mixed | 17 | **1** | 16 | 5 | 12 | 15 | 16 | 17 | 6 | 17 | 17 | 17 |
| drinks | ready | 18 | **0** | 18 | 18 | **0** | 14 | 13 | **3** | 18 | 18 | 18 | 10 |

## Seed-Backlog (Lücken)

- breakfast / muesli: taste=sweet, taste=savory, prep=none, prep=some, cooking=none, cooling=none
- breakfast / warm: alle, taste=sweet, taste=savory, prep=none, prep=some, kids, budget=cheap, diet=vegetarian, cooking=none, cooking=campfire, cooking=gas_burner, cooling=none
- lunch / classic: taste=sweet
- lunch / vegetarian: taste=sweet
- lunch / one_pot: taste=sweet, prep=none, cooking=none
- lunch / quick_cheap: taste=sweet
- lunch / dessert: prep=none
- dinner / classic: taste=sweet
- dinner / vegetarian: taste=sweet
- dinner / one_pot: taste=sweet, prep=none, cooking=none
- dinner / quick_cheap: taste=sweet
- dinner / dessert: prep=none
- snack / sweet: taste=savory
- snack / savory: taste=sweet
- snack / homemade: prep=none
- drinks / cold: taste=sweet, prep=some
- drinks / warm: taste=sweet
- drinks / mixed: taste=sweet
- drinks / ready: taste=sweet, prep=some, diet=vegetarian
