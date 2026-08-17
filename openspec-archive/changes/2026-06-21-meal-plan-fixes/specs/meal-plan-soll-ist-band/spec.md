## ADDED Requirements

### Requirement: Norm-Person als einziger Tagesbedarfs-Bezug

Das System SHALL die Norm-Person (`NORM_PERSON_DAILY_KCAL = 2335`, PAL 1.75) als einzigen
Bezugswert für den täglichen Energiebedarf verwenden. Die DGE-basierte Energie-Rule
(`seed_rules.py`, scope `day` und `meal_event`) MUST so gesetzt sein, dass ihr grünes Band
um 2335 kcal zentriert ist, damit Tagesplan-Soll und Nährwert-Bewertung denselben Zielpunkt
teilen.

#### Scenario: Energie-Rule um Norm-Person zentriert
- **WHEN** die Energie-Rule (scope day) ausgewertet wird
- **THEN** die Bandmitte (`target_mid = (min_green + max_green) / 2`) SHALL ≈ 2335 kcal sein

#### Scenario: Tagesplan-Soll und Nährwert-Ziel konsistent
- **WHEN** ein Tag exakt das Tagesplan-Soll (2335 kcal/Person) trifft
- **THEN** die Nährwert-Bewertung SHALL diesen Wert als zentral/grün einordnen

### Requirement: Sichtbare Tagesanteil-Überdeckung

Wenn die Summe der `day_part_factor` aller Mahlzeiten eines Tages 100% überschreitet, SHALL
das System diesen Zustand als Überdeckung sichtbar machen (eigener Badge-Zustand "Überplant"
in Warnfarbe) und NICHT still bei 100% deckeln. Die angezeigte Soll-kcal-Summe (die die
Überdeckung bereits einrechnet) und die Coverage-Badge MUST konsistent sein.

#### Scenario: Überplanter Tag wird gewarnt
- **WHEN** ein Tag Mahlzeiten mit zusammen 110% Tagesanteil hat (z.B. zwei zusätzliche Snacks)
- **THEN** die Tages-Badge SHALL "Überplant" (110%) in Warnfarbe anzeigen, nicht "Vollständig"

#### Scenario: Normaler Tag bleibt unverändert
- **WHEN** ein Tag Mahlzeiten mit zusammen ≤100% Tagesanteil hat
- **THEN** die Badge SHALL wie bisher Vollständig/Teilweise/Lückenhaft anzeigen
