## MODIFIED Requirements

### Button-Sichtbarkeit

- Der KI-Zauberstab-Button auf der Zutaten-Detail-Seite MUSS nur für User mit `is_staff=true` oder `is_superuser=true` sichtbar sein
- Der Button MUSS neben den bestehenden Edit/Delete-Buttons platziert werden
- Der Button MUSS das `auto_fix_high` Icon verwenden
- Bei Klick MUSS das bestehende `AiSuggestDialog`-Modal geöffnet werden
