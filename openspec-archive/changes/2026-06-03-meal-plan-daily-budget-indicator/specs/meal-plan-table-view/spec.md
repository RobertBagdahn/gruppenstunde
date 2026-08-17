## ADDED Requirements

### Requirement: Tägliche Budget-Ampel im Tabellenfuß

Das System SHALL im Tabellenfuß (`<tfoot>`) der Tabellenansicht für jeden geplanten Tag eine farbcodierte Budget-Ampel anzeigen, sofern ein Budget pro Tag und Person (`budget_per_person_per_day`) im Speiseplan konfiguriert ist.

- Die täglichen Kosten pro Person berechnen sich aus den Gesamtkosten aller Mahlzeiten des Tages geteilt durch die Anzahl der Normportionen (`norm_portions`).
- Ist kein Tagesbudget konfiguriert (Wert ist null oder <= 0), darf kein Indikator angezeigt werden.
- Die farbliche Kennzeichnung MUSS folgenden Schwellenwerten entsprechen:
  - Grün (Kosten <= Budget): `bg-emerald-50 text-emerald-700 border-emerald-200`
  - Gelb (Kosten <= Budget * 1.2): `bg-amber-50 text-amber-700 border-amber-200`
  - Rot (Kosten > Budget * 1.2): `bg-red-50 text-red-700 border-red-200`
- Das Badge MUSS den verbleibenden Betrag oder den Überschreitungsbetrag wie folgt formatieren:
  - Bei Einhaltung des Budgets: `noch X,XX € / Pers.`
  - Bei Überschreitung des Budgets: `+X,XX € / Pers.`

#### Scenario: Budget eingehalten (Grün)
- **WHEN** die Kosten pro Person an einem Tag <= dem konfigurierten Budget sind
- **THEN** zeigt das System ein grünes Badge mit dem verbleibenden Betrag im Format `noch X,XX € / Pers.` an

#### Scenario: Budget leicht überschritten (Gelb)
- **WHEN** die Kosten pro Person an einem Tag > dem konfigurierten Budget, aber <= Budget * 1.2 sind
- **THEN** zeigt das System ein gelbes Badge mit dem Überschreitungsbetrag im Format `+X,XX € / Pers.` an

#### Scenario: Budget deutlich überschritten (Rot)
- **WHEN** die Kosten pro Person an einem Tag > Budget * 1.2 sind
- **THEN** zeigt das System ein rotes Badge mit dem Überschreitungsbetrag im Format `+X,XX € / Pers.` an

#### Scenario: Kein Budget konfiguriert
- **WHEN** kein Budget im Speiseplan konfiguriert ist (null oder <= 0)
- **THEN** wird kein Budget-Indikator in den Spalten des Tabellenfußes angezeigt
