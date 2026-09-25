## ADDED Requirements

### Requirement: Gewichtsänderung an referenzierter Portion löst sie ab
Ändert ein Nutzer mit Bearbeitungsrecht an der Zutat (gemäß `food-access-policy`: verifizierte Zutaten nur Staff, Entwürfe Owner/Creator/Editor-Collaborators/Staff) über `PATCH /api/ingredients/{slug}/portions/{portion_id}/` das resultierende `weight_g` einer Portion, die von mindestens einem `RecipeItem` referenziert wird, SHALL das System eine neue Portion mit den angeforderten Werten anlegen und die alte Portion als abgelöst markieren (`superseded_by` = neue Portion, `superseded_at` = jetzt). Die neue Portion MUST denselben Namen (ohne Suffix) und denselben Rang wie die alte erhalten, sofern im Request nichts anderes angegeben ist. Die Ablöse-Regel gilt für jeden Nutzer mit diesem Bearbeitungsrecht gleichermaßen; das Bearbeitungsrecht selbst definiert ausschließlich `food-access-policy`.

#### Scenario: Stück-Gewicht korrigieren
- **GIVEN** die Zutat „Hühnerei“ hat die Portion „Stück“ (50 g, Rang 1), die in 12 Rezepten verwendet wird
- **WHEN** ein berechtigter Nutzer das Gewicht auf 60 g ändert
- **THEN** existiert eine neue aktive Portion „Stück“ (60 g, Rang 1)
- **THEN** ist die alte Portion abgelöst und verweist per `superseded_by` auf die neue
- **THEN** liefert die Antwort die neue Portion mit `replaced_portion_id` = ID der alten

#### Scenario: Unreferenzierte Portion wird direkt geändert
- **WHEN** das Gewicht einer Portion geändert wird, die von keinem `RecipeItem` referenziert wird
- **THEN** wird die Portion in place aktualisiert und keine neue Portion angelegt

#### Scenario: Namens- oder Rangänderung ohne Gewichtsänderung
- **WHEN** nur Name oder Rang einer referenzierten Portion geändert werden und `weight_g` gleich bleibt
- **THEN** wird die Portion in place aktualisiert

#### Scenario: Nicht angemeldeter Nutzer
- **WHEN** ein nicht angemeldeter Nutzer den Endpunkt aufruft
- **THEN** antwortet das System mit 403 („Sitzung nicht gefunden“) und ändert nichts

#### Scenario: Nutzer ohne Bearbeitungsrecht
- **WHEN** ein angemeldeter Nutzer ohne Bearbeitungsrecht an der Zutat den Endpunkt aufruft
- **THEN** antwortet das System je nach Sichtbarkeit der Zutat mit 404 oder 403 und ändert nichts

#### Scenario: Owner einer verifizierten Zutat
- **GIVEN** Nutzer A ist Owner einer verifizierten Zutat, deren Portion „Stück“ in Rezepten verwendet wird
- **WHEN** A das Gewicht von „Stück“ ändern will
- **THEN** antwortet das System mit 403; es entsteht keine neue Portion

#### Scenario: Staff korrigiert verifizierte Zutat
- **WHEN** ein Staff-Nutzer das Gewicht einer referenzierten Portion einer verifizierten Zutat ändert
- **THEN** wird die Portion abgelöst wie oben beschrieben; der Status der Zutat bleibt `verified`

### Requirement: Abgelöste Portionen sind unsichtbar, aber gültig
Abgelöste Portionen MUST NOT in Portionslisten (`GET /api/ingredients/{slug}/portions/`, Zutatendetail, Frühstücks-/Buffet-Katalog), Portion-Pickern, der Portions-Deduplizierung oder der Suche nach Rang-1-/Standardportionen erscheinen. Für bestehende `RecipeItem`-Referenzen MUST eine abgelöste Portion weiterhin für Gewicht, Nährwerte und Preis verwendet werden. Automatische Umhänge-Jobs für gelöschte Portionen MUST abgelöste Portionen ignorieren.

#### Scenario: Nur eine Portion sichtbar
- **GIVEN** „Stück“ (50 g) wurde durch „Stück“ (60 g) abgelöst
- **WHEN** ein Nutzer die Portionen von „Hühnerei“ abruft
- **THEN** enthält die Liste genau eine Portion „Stück“ mit 60 g

#### Scenario: Altes Rezept bleibt rechnerisch unverändert
- **GIVEN** ein Rezept enthält „2 Stück Hühnerei“ mit der abgelösten 50-g-Portion
- **WHEN** Nährwerte und Kosten des Rezepts berechnet werden
- **THEN** gehen 100 g Hühnerei in die Berechnung ein

#### Scenario: Rebind-Job lässt abgelöste Portionen in Ruhe
- **WHEN** `rebind_dead_portion_references` läuft
- **THEN** werden RecipeItems mit abgelöster (nicht gelöschter) Portion nicht umgehängt

### Requirement: Eindeutigkeit nur unter aktiven Portionen
Die Eindeutigkeit von Portionsnamen je Zutat (case-insensitive) und von `rank=1` je Zutat MUST per Datenbank-Constraint nur für Portionen gelten, die weder gelöscht noch abgelöst sind.

#### Scenario: Gleicher Name nach Ablösung
- **WHEN** eine Portion „Stück“ abgelöst und eine neue „Stück“ angelegt wird
- **THEN** akzeptiert die Datenbank beide Datensätze

#### Scenario: Zweite aktive Rang-1-Portion bleibt verboten
- **WHEN** für eine Zutat eine zweite aktive, nicht abgelöste Portion mit `rank=1` angelegt werden soll
- **THEN** lehnt die Datenbank dies mit einem Constraint-Fehler ab

### Requirement: Ablösungsketten bleiben einstufig
Wird eine Portion B abgelöst, die selbst Nachfolger von A ist, SHALL das System alle Portionen, deren `superseded_by` auf B zeigt, auf den neuen Nachfolger C umstellen. Jede abgelöste Portion MUST direkt auf die aktuell aktive Portion verweisen.

#### Scenario: Zweimalige Korrektur
- **GIVEN** A (50 g) wurde von B (60 g) abgelöst
- **WHEN** B auf 55 g korrigiert wird und dadurch C entsteht
- **THEN** verweisen A und B per `superseded_by` auf C

### Requirement: Hinweis und Aktualisierung im Rezept
`RecipeItemOut` SHALL für Zutaten mit abgelöster Portion das Feld `current_portion` (`id`, `name`, `weight_g`) liefern, sonst `null`. Nutzer mit Bearbeitungsrecht am Rezept SHALL im Bearbeitungsmodus pro betroffener Zutat den Hinweis „Veraltete Portion: {Name} ({alt} g) → jetzt {neu} g“ mit der Aktion „Aktualisieren“ sowie rezeptweit „Alle aktualisieren“ sehen. Aktualisieren MUST `portion_id` auf die aktuelle Portion setzen und die `quantity` (Anzahl) unverändert lassen.

#### Scenario: Einzelne Zutat aktualisieren
- **GIVEN** ein Rezept enthält „2 Stück Hühnerei“ mit abgelöster 50-g-Portion
- **WHEN** der Rezeptbesitzer im Bearbeitungsmodus „Aktualisieren“ klickt
- **THEN** referenziert die Zutat die aktuelle 60-g-Portion mit `quantity = 2`
- **THEN** werden Nährwerte und Kosten mit 120 g neu berechnet
- **THEN** verschwindet der Hinweis

#### Scenario: Alle aktualisieren
- **WHEN** der Nutzer `POST /api/recipes/{recipe_id}/recipe-items/adopt-current-portions/` ohne `item_ids` aufruft
- **THEN** werden alle Zutaten des Rezepts mit abgelöster Portion auf die aktuelle Portion umgestellt und die Anzahl der umgestellten Zutaten zurückgegeben

#### Scenario: Leser ohne Bearbeitungsrecht
- **WHEN** ein Nutzer ohne Bearbeitungsrecht (oder nicht angemeldet) das Rezept ansieht
- **THEN** sieht er keinen Hinweis und keine Aktion; die Anzeige nutzt die abgelöste Portion
- **THEN** antwortet der Endpunkt `adopt-current-portions` für ihn mit 403

### Requirement: Bereinigung bestehender „(neu)“-Dubletten
Ein Management-Command `merge_neu_portion_duplicates` SHALL aktive Portionen mit Namen „{X} (neu)“ finden, zu denen eine aktive Portion „{X}“ derselben Zutat und Einheit existiert, die alte Portion als abgelöst markieren, das Suffix entfernen und den Rang übernehmen. Der Befehl MUST `--dry-run` unterstützen und jede Änderung ausgeben.

#### Scenario: Dry-Run
- **WHEN** `uv run python manage.py merge_neu_portion_duplicates --dry-run` ausgeführt wird
- **THEN** listet der Befehl jede betroffene Zutat mit alter und neuer Portion und ändert nichts

#### Scenario: Ausführung
- **WHEN** der Befehl ohne `--dry-run` für „Kuhmilch 3,5 % Fett“ mit „100g Milch“ und „100g Milch (neu)“ läuft
- **THEN** existiert danach genau eine aktive Portion „100g Milch“ und die alte ist abgelöst
