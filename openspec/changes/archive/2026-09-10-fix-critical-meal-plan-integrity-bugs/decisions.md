# Decisions: fix-critical-meal-plan-integrity-bugs

Dieses Dokument hält die verbindlichen Architekturentscheidungen aus den Rückfragen fest.

## Beschlossene Richtlinien

1. **KI-Kandidaten Datenschutz:**
   - Nur eigene Pläne des Users, öffentlich markierte Vorlagen (`is_template=True`) und verifizierte System-Vorlagen. Keine fremden privaten Daten im LLM-Prompt.
2. **Rechteprüfung Referenzen & AI-Apply:**
   - Hart ablehnen mit HTTP 403 / Fehlermeldung, wenn auf eine übergebene `recipe_id` oder `ingredient_id` kein Leserecht besteht.
3. **Allergen-Aggregation im PDF:**
   - Volle Aggregation: Rezepte (gepflegte Allergene + analysierte Zutaten) sowie direkte Lebensmittelzutaten mit ihren Allergenen einbeziehen.
4. **Leere Allergen-Tage im PDF:**
   - Textlicher Hinweis: „Keine Allergene in den geplanten Gerichten deklariert (Spuren möglich)“ statt falscher Pauschal-Entwarnung.
5. **PDF Rezept-Zutaten Skalierung:**
   - Volle Deckungsgleichheit mit App: Basis-Portionen, Eintragsfaktor (`factor`), aktive Varianten (`active_recipe_items`) und Mahlzeiten-Portionen verrechnen.
6. **KI-Zutaten Standardeinheit:**
   - Standard-Portionseinheit (Rank 1, z.B. Stück/Scheibe) der Zutat zuweisen, sonst Gramm.
7. **Zutatendialog Mengeneinheit:**
   - Echte Portionsanzahl mit gewählter Portionseinheit speichern. Gramm nur als Hilfstext.
8. **Frühstücks-Mengen Wiederöffnung:**
   - Gespeicherte Mengen direkt 1:1 als personenbasiert interpretieren. Keine erneute Division durch `normPortions`.
9. **Plan-Duplikation Varianten:**
   - `active_recipe_item_ids` und `variant_group_id` 1:1 kopieren, damit Varianten exakt erhalten bleiben.
10. **Altzutaten bei externen Mahlzeiten:**
    - In der DB inaktiv belassen, aber in Einkauf, Nährwerten und PDF strikt ignorieren (`meal.is_external == False`).
11. **Varianten-Schieberegler Formel:**
    - Largest-Remainder auf echte Anteile anwenden, sodass die Gesamtsumme invariant bleibt.
12. **Getränke in der Tabelle:**
    - Als feste 5. Zeile „Getränke“ in der `TableView` integrieren.
13. **Löschen & Undo in Tabelle:**
    - Direktes Löschen mit Toast und funktionierendem Undo-Button (ohne blockierenden Bestätigungsdialog).
14. **Frühstücksassistent Kontext:**
    - Öffnet das konkrete Tages-Frühstück. Im Assistenten gibt es die Option „Für alle Frühstücke des Plans übernehmen“.
15. **Zutatensuche:**
    - Kombiniertes Suchfeld für Rezepte und Zutaten mit gemeinsamen Filtern.
16. **KI-Vorschläge Übernahme:**
    - Selektive Übernahme: Einzelne Mahlzeiten/Tage können im Wizard an- oder abgewählt werden.
17. **Nährwert-Tagesansicht:**
    - Echte berechnete Tageswerte pro Tag statt Wiederholung des Plandurchschnitts.
