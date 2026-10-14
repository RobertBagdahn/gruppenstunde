# Datenqualität-Dashboard

## ADDED Requirements

### Requirement: Buffet-Vorschlagsmaske in Datenqualität integrieren
Das Staff-only-Dashboard SHALL im Zutatenbereich eine URL-erreichbare Kategorie „Buffet-Vorschläge“ anbieten. Die Kategorie SHALL Kandidaten, KI-/manuelle Zutaten- und Rezeptvorschläge, Rollen-Zuordnungen, Dubletten-Prüfung und den schreibfreien Mapping-Test aus der Capability `buffet-data-quality-proposals` zugänglich machen. Sie SHALL sich in die vorhandene Datenqualitäts-Navigation und URL-State-/Paginierungsmuster integrieren und SHALL keine zweite, unabhängige Datenqualitätsanwendung einführen.

#### Scenario: Staff öffnet Buffet-Vorschläge
- **WHEN** ein Staff-Mitglied den Bereich „Datenqualität → Zutaten → Buffet-Vorschläge“ öffnet
- **THEN** kann es Kandidatenliste, Vorschläge, Freigabestatus und Mapping-Test erreichen

#### Scenario: Nicht-Staff öffnet direkte URL
- **WHEN** ein anonymer oder Nicht-Staff-Nutzer die URL der Buffet-Vorschlagsmaske direkt öffnet
- **THEN** wird der bestehende Staff-only-Zugriffsschutz angewendet

#### Scenario: URL-State und Paginierung
- **WHEN** Staff Kandidaten oder Vorschläge filtert und eine weitere Ergebnisseite aufruft
- **THEN** bleiben Filter und Pagination im URL-State erhalten und die API liefert das paginierte Standardformat
