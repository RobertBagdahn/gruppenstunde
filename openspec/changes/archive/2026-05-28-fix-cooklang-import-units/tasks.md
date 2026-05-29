# Tasks

## 1. Unit-Resolution erweitern

- [x] 1.1 `unit_aliases` dict in `import_cooklang.py` erweitern um: l, liter, kg, kilogramm, ml, milliliter, el, esslöffel, tl, teelöffel, packung, paket, tüte, päckchen
- [x] 1.2 `UNIT_CONVERSIONS` dict hinzufügen: `{"kg": ("gramm", 1000), "kilogramm": ("gramm", 1000), "l": ("milliliter", 1000), "liter": ("milliliter", 1000)}`
- [x] 1.3 Nach Unit-Alias-Auflösung prüfen ob Conversion nötig ist; quantity multiplizieren und resolved unit verwenden
- [x] 1.4 Fallback: wenn unit nicht auflösbar, unit-Text in note speichern statt silent-drop

## 2. Testen

- [x] 2.1 Manuell testen: bestehende Rezepte löschen und `import_cooklang` erneut ausführen mit der Apfel-Zimt-Datei
