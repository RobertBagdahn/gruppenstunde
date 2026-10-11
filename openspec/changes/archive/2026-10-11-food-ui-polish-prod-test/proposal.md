# Food-UI: Kleinigkeiten aus dem Produktivtest

## Why

Der Produktivtest (2026-10-03) hat mehrere kleine Abweichungen gezeigt, die jede für sich unkritisch sind, zusammen aber Vertrauen kosten. Sie werden gebündelt in einem Change behoben.

- Der Schritt-Zähler im Rezept-Wizard zeigt „Schritt 1 von 6“, danach „Schritt 2 von 7“ (`RecipeWizard.tsx` zählt `visibleSteps.length`, und der Review-Schritt wird erst nach der Eingabe sichtbar).
- Nach dem Ändern des Faktors (×2) zeigte die Kachel im Essensplan noch kurz 825 kcal und 1,29 €, während der Header schon verdoppelt war. Nach dem Nachladen stimmen beide. Die Ursache ist dieselbe wie unten: Es wird erst nach der Server-Antwort aktualisiert.
- Nach dem Entfernen eines Rezepts aus einer Mahlzeit zeigen Budget und kcal im Plan-Header 3 bis 5 Sekunden lang den alten Stand.
- Das Speichern einer doppelten Zutat zeigt nur „Fehler beim Erstellen der Zutat“ (`CreateIngredientPage.tsx` verwirft `err.message`). Ein Hinweis auf die vorhandene Zutat fehlt.
- Leere Pflichtfelder (Rezepttitel im Bearbeiten, Zutatenname) werden ohne sichtbare Meldung blockiert oder nur per Toast gemeldet.
- `/login` zeigt das Anmeldeformular auch für eingeloggte Nutzer, und die Seite `/meal-plans` zeigt „Kostenlos anmelden“, obwohl der Nutzer angemeldet ist.

## What Changes

- Schritt-Zähler: Die Gesamtzahl bleibt über alle Schritte eines Pfads stabil. Vor der Wahl des Pfads wird der Pfad mit KI-Review angenommen (7 Schritte), der manuelle Pfad zeigt 6.
- Plan-Summen (Header, Mahlzeit-Totals) und Kachelwerte werden beim Entfernen eines Eintrags und beim Ändern von Faktor oder Menge sofort optimistisch angepasst (reiner Helfer `mealPlanOptimistic`), mit Rollback bei Fehlern. Die Server-Antwort ersetzt den lokalen Wert.
- Fehlermeldungen beim Anlegen von Zutaten übernehmen die Backend-Meldung. Bei einem Duplikat nennt der Hinweis die vorhandene Zutat mit Link.
- Pflichtfeld-Validierung zeigt eine Inline-Meldung am Feld (Titel im Rezept-Bearbeiten, Name der Zutat).
- Auf den Tool-Landingpages entfällt der Anmelde-Button samt „kostenloses Konto“-Text für eingeloggte Nutzer. Die Weiterleitung eingeloggter Nutzer von `/login` ist per Test abgesichert.

## Capabilities

### Modified Capabilities
- `recipe-creation-wizard`: stabiler Schritt-Zähler.
- `meal-plan-frontend`: Kachel-Beschriftung bei Faktor, keine veralteten Header-Werte.
- `ingredient-creation-stepper`: Backend-Fehlertext und Duplikat-Hinweis, Inline-Validierung.
- `auth-session`: Weiterleitung eingeloggter Nutzer von Auth-Seiten, Landingpage-Button.

## Impact

- **Frontend (frontend-food):** `components/recipe/RecipeWizard.tsx`, `pages/planning/` (Mahlzeiten-Kachel und Header-Hooks), `pages/ingredients/CreateIngredientPage.tsx`, Rezept-Bearbeiten-Seite, `App.tsx`/`LoginPage`/`RegisterPage`, `components/ToolLandingPage.tsx`, Rezept-Vorschau-Dialog im Planer.
- **Backend:** Duplikat-Fehler der Zutaten-Erstellung liefert strukturiert die ID/den Slug der vorhandenen Zutat (`backend/supply/api/ingredients.py`).

## Korrekturen nach der Umsetzung

- Das „doppelte Schließen-Icon“ im Produktivtest waren zwei übereinander geöffnete Dialoge (Rezeptsuche und Rezept-Vorschau). Das ist gewolltes Verhalten und kein Fehler.
- Die Kachelwerte enthalten den Faktor bereits. Es braucht keine zusätzliche Beschriftung, nur die sofortige Aktualisierung.
- Der Speichern-Button im Rezept-Bearbeiten war bei leerem Titel deaktiviert, deshalb war der Fehler „still“. Er bleibt jetzt aktiv und zeigt den Fehler am Feld.
- Beim Anlegen einer Zutat mit dem Namen einer gelöschten Zutat entstand ein Datenbankfehler (Slug-Kollision); die Slug-Vergabe berücksichtigt jetzt auch gelöschte Zutaten.

- `/login` und `/register` leiten eingeloggte Nutzer im Code bereits weiter (`LoginPage` mit `<Navigate>`, `RegisterPage` über `/login`). Die Beobachtung in Prod (Formular trotz Anmeldung) konnte lokal nicht reproduziert werden; das Verhalten ist jetzt per Test abgesichert. Es bleibt zu prüfen, ob der Prod-Build älter war.

## Non-Goals

- Slugs bleiben nach Umbenennen unverändert (stabile URLs). Das Abweichen von Slug und Name (z. B. Zutat „Zwiebel“ mit Slug `mittelgroe-zwiebel-klein-geschnitten`) wird nicht in diesem Change behandelt.
- Der leere Equipment-Katalog im Admin ist kein Fehler dieses Changes.
