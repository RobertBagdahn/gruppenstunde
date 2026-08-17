## 1. MEDIA_ROOT anpassen

- [x] 1.1 In `backend/inspi/settings/local.py` den `MEDIA_ROOT` auf `/tmp/inspi-media/` setzen
- [x] 1.2 Sicherstellen, dass das Verzeichnis beim Start erstellt wird (os.makedirs mit exist_ok)

## 2. Verifizierung

- [x] 2.1 Django Dev-Server starten, AI-Bild generieren, prüfen dass kein Reload passiert
- [x] 2.2 Prüfen dass Bilder unter `/media/` weiterhin korrekt ausgeliefert werden
