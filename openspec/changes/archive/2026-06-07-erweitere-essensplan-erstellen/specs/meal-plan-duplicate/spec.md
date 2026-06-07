## REMOVED Requirements

### Requirement: Duplicate from card context menu
**Reason**: Der separate Duplikat-Dialog wird durch den neuen einheitlichen Create/Kopie-Dialog ersetzt. Die "Als Vorlage verwenden"-Aktion im 3-Punkt-Menü öffnet jetzt den Create-Dialog mit vorausgewählter Quelle, statt einen separaten Dialog zu öffnen.

**Migration**: Die Duplikat-Funktion ist jetzt in "Neuen Essensplan erstellen" integriert (Checkbox "Von Plan kopieren"). Der alte Duplikat-Dialog entfällt. Für die API-basierte Duplikation bleibt `POST /api/meal-plans/{id}/duplicate/` unverändert bestehen.
