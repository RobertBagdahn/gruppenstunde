## MODIFIED Requirements

### Requirement: Tabellarisches Grid

Die Detailseite SHALL einen Tab „Tabelle“ mit `<table>` anbieten: geplante Tage als Spalten,
alle aktiven Mahlzeittypen einschließlich `drinks` als Zeilen. Mehrere Snacks eines Tages
stehen untereinander. Auf schmalen Bildschirmen ist die Tabelle horizontal scrollbar und die
erste Spalte bleibt sticky. Spaltenbreiten SHALL mindestens 260px betragen und Textüberläufe
oder Textkollisionen durch elastische Grids und sauberen Zeilenumbruch ausschließen.

#### Scenario: Getränkezeile
- **WHEN** ein Plan einen Getränke-Slot enthält
- **THEN** zeigt die Tabelle eine lokalisierte Getränkezeile

#### Scenario: Responsive Spalten und Viewport
- **WHEN** die Tabelle auf einem Tablet oder schmalen Viewport betrachtet wird
- **THEN** sind Spalten horizontal scrollbar, ohne dass letzte Tage oder Kopfzeilen abgeschnitten werden

### Requirement: Leere Slots und Bearbeitung

Leere, zeitlich gültige Slots SHALL direkte Aktionsbuttons für Rezept (`+ Rezept`), Zutat (`+ Zutat`)
sowie ein Aktionsmenü für weitere Optionen (Notiz, Kopieren) anzeigen. Die Aktion legt den Slot bei
Bedarf automatisch an und öffnet den passenden Suchdialog oder Inline-Editor. Bestehende Items bieten
Faktor- bzw. Mengenanpassung, Notiz- und Entfernen-Controls. Das Entfernen-Icon SHALL auch ohne Hover
dezent sichtbar und touch-bedienbar sein; alle Aktionen respektieren die serverseitigen Berechtigungen.

#### Scenario: Leerer Slot mit Direktauswahl
- **WHEN** ein gültiger Slot leer ist
- **THEN** zeigt er direkt sichtbare Aktionsbuttons für „+ Rezept“ und „+ Zutat“

#### Scenario: Löschen mit Undo-Toast
- **WHEN** der Nutzer ein Rezept oder eine Zutat aus einem Slot entfernt
- **THEN** wird das Item sofort aus der Ansicht entfernt und ein Toast mit Rückgängig-Option angeboten

## ADDED Requirements

### Requirement: Robuste 2-Zeilen Item-Karten ohne Textkollision

Item-Karten in Tabellenslots SHALL in einem robusten 2-Zeilen-Layout dargestellt werden:
- Zeile 1: Name der Zutat bzw. des Rezepts linksbündig (mit Verlinkung und Allergentags) sowie Mengenangabe (z. B. „17 g / P.“ oder „1 Portion“) rechtsbündig.
- Zeile 2: Nährwerte (`kcal`), Portionspreis (`€`) links sowie Mengen-/Faktor-Input und Lösch-Button rechts.
Wenn eine Zutat ein `portion_display` besitzt, das den Zutatennamen bereits enthält, SHALL der Zutatennamen-Titel nicht dupliziert werden und das Mengen-Badge darf keine festen `shrink-0`-Breiten erzwingen, die benachbarte Texte zerquetschen.

#### Scenario: Anzeige von Zutaten mit Portionsangabe
- **WHEN** eine Frühstückszutat mit Portionsangabe (z. B. Emmentaler 17g) im Slot dargestellt wird
- **THEN** überlappen sich Text, Nährwerte und Preise zu keinem Zeitpunkt und der Name wird nicht abgeschnitten oder verdeckt

#### Scenario: Mengenanpassung für Zutaten
- **WHEN** der Nutzer auf eine Zutat in der Tabelle klickt oder den Faktor/die Menge anpasst
- **THEN** lässt sich der Wert inline verändern und die Mahlzeitensumme aktualisiert sich

### Requirement: Kompakte Frühstücks- und Buffetdarstellung

Wenn eine Mahlzeit (insbesondere Frühstück) aus mehreren Einzelzutaten besteht, SHALL die Tabelle
eine kompakte Buffet-Zusammenfassung mit aggregierten Kalorien und Kosten anbieten, die per
Klick ausgeklappt oder direkt im Frühstücks-Assistenten bearbeitet werden kann, um eine vertikale
Überdehnung der Zeile zu verhindern.

#### Scenario: Kompakte Frühstücksansicht
- **WHEN** ein Frühstück mehr als 3 Einzelzutaten enthält
- **THEN** wird eine strukturierte oder ein-/ausklappbare Zusammenfassung angezeigt, sodass andere Tagesmahlzeiten sichtbar bleiben
