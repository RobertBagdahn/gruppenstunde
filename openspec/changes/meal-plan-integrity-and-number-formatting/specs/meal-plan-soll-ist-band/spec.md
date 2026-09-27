## MODIFIED Requirements

### Requirement: Sichtbare Tagesanteil-Überdeckung

Wenn die Summe der `day_part_factor` aller Mahlzeiten eines Tages 100 % überschreitet, SHALL das System diesen Zustand als Überdeckung sichtbar machen (eigener Badge-Zustand „Überplant“ in Warnfarbe) und NICHT still bei 100 % deckeln. Die angezeigte Soll-kcal-Summe (die die Überdeckung bereits einrechnet) und die Badge MUST konsistent sein. Die Tages-Badge beschreibt ausschließlich die Planungsabdeckung und MUST die Labels „Alle Mahlzeiten geplant“ (≥ 80 %), „Teilweise geplant (x %)“ (< 80 %) oder „Überplant (x %)“ (> 100 %) verwenden. Der Energie-Status je Mahlzeit MUST davon getrennt als „Energie ok“ bzw. „Zu wenig Energie (x %)“ erscheinen.

#### Scenario: Überplanter Tag wird gewarnt
- **WHEN** ein Tag Mahlzeiten mit zusammen 110 % Tagesanteil hat (z. B. zwei zusätzliche Snacks)
- **THEN** die Tages-Badge SHALL „Überplant (110 %)“ in Warnfarbe anzeigen

#### Scenario: Normaler Tag
- **WHEN** ein Tag Mahlzeiten mit zusammen 90 % Tagesanteil hat
- **THEN** die Badge SHALL „Alle Mahlzeiten geplant“ anzeigen

#### Scenario: Teilweise geplanter Tag
- **WHEN** ein Tag nur ein Frühstück (25 %) hat
- **THEN** die Badge SHALL „Teilweise geplant (25 %)“ anzeigen

#### Scenario: Mahlzeit mit zu wenig Energie
- **WHEN** eine Mahlzeit 60 % ihrer Soll-kcal erreicht
- **THEN** zeigt sie „Zu wenig Energie (60 %)“ unabhängig von der Tages-Badge

## ADDED Requirements

### Requirement: Cockpit-Ziel aus der Norm-Person
Das Kalorien-Cockpit des Essensplans MUST als Tagesziel den Wert der Norm-Person (`NORM_PERSON_DAILY_KCAL`) aus derselben Quelle wie der Soll-Balken anzeigen. Fest verdrahtete Zielwerte SHALL NICHT existieren.

#### Scenario: Cockpit-Anzeige
- **WHEN** das Cockpit „1976 / 2335 kcal“ zeigt
- **THEN** lautet die Zielangabe „Ziel: 2.335 kcal“
