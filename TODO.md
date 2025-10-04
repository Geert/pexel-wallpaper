# Verbeterpunten Pexel Wallpaper

## 🔒 Hoge prioriteit – Veiligheid & betrouwbaarheid
- [ ] Vervang het cookie-gebaseerde opslaan van de Pexels API-sleutel door een opslag die niet automatisch naar de server wordt gestuurd (bijv. `sessionStorage`) en werk alle referenties bij (`docs/js/script.js:143-409`).
- [ ] Verwerk `apiKey`/`collectionUrl` query-parameters zonder de sleutel zichtbaar te laten in de adresbalk of instructies; verwijder ze met `history.replaceState` en toon in de UI een geschoonde URL (`docs/js/script.js:306-371`, `docs/index.html:29`).
- [ ] Los de verwijzing naar de niet-bestaande `updateWallpaperAltText()` op zodat de slideshow geen runtime-fouten meer logt (`docs/js/script.js:330`).


## 🧭 Middelbare prioriteit – Gebruikservaring
- [ ] Maak de instellingenknop toegankelijk voor toetsenbord en touch; momenteel blijft het element verborgen zonder muisbeweging en blokkeert `#settingsHoverTrigger` interacties (`docs/css/style.css:18-63`, `docs/js/script.js:387-412`).
- [ ] Koppel een zichtbare “Reset”/“Wis opgeslagen gegevens”-actie aan `clearSettingsAndShowForm()` zodat gebruikers hun sleutel en collectie snel verwijderen (`docs/js/script.js:341-350`).
- [ ] Geef het status-overlay element een `role="status"`/`aria-live` en toon foutmeldingen met concrete herstelstappen per HTTP-status (401 vs 429) (`docs/index.html:19`, `docs/js/script.js:214-338`).
- [ ] Toon in de instructielijst een vaste basis-URL i.p.v. `window.location.href`, zodat gebruikers geen gevoelige query’s kopiëren (`docs/js/script.js:310`, `docs/index.html:29`).
- [ ] Voeg duidelijke feedback toe wanneer de lokale fallback (`pexels_photo_urls.txt`) ontbreekt of leeg is, inclusief verwijzing naar het Python-script en benodigde stappen (`docs/js/script.js:414-452`, `README.md`).
- [ ] Voeg een request-timeout en eenvoudige retry toe aan `fetch_pexels_urls.py` zodat het script niet blijft hangen en mislukkingen vriendelijker meldt (`fetch_pexels_urls.py:56-89`).

## 🛠 Lage prioriteit – Onderhoud & eenvoud
- [ ] Splits `docs/js/script.js` in kleinere modules (config, i18n, storage, slideshow) om de codebasis overzichtelijker te maken.
- [ ] Voeg unit tests toe voor functies zoals `extractCollectionIdFromUrl()` en caching-logica (bijv. met Jest/Vitest) om regressies te voorkomen.
- [ ] Gebruik daadwerkelijk `python-dotenv` in `fetch_pexels_urls.py`/`update.sh` of verwijder het uit `requirements.txt` om verwarring te voorkomen (`fetch_pexels_urls.py`, `update.sh`, `requirements.txt`).
- [ ] Voeg een `.env.example` toe en documenteer het update-proces (in README of aparte gids) zodat nieuwe gebruikers veilig kunnen starten.
- [ ] Voeg een eenvoudige lint/format-check toe (bijv. `eslint` + `prettier` en `ruff` voor Python) zodat bijdragen consistent blijven.
