# Verbeterpunten Pexel Wallpaper

## 🔒 Hoge prioriteit – Veiligheid & betrouwbaarheid
- [x] Vervang het cookie-gebaseerde opslaan van de Pexels API-sleutel door opslag die niet automatisch naar de server wordt gestuurd (`docs/js/storage.mjs`, `docs/js/main.mjs`).
- [x] Verwerk `apiKey`/`collectionUrl` query-parameters zonder de sleutel zichtbaar te laten in de adresbalk of instructies; verwijder ze met `history.replaceState` en toon in de UI een geschoonde URL (`docs/js/main.mjs`, `docs/index.html`).
- [x] Los de verwijzing naar de niet-bestaande `updateWallpaperAltText()` op zodat de slideshow geen runtime-fouten meer logt (`docs/js/main.mjs`).


## 🧭 Middelbare prioriteit – Gebruikservaring
- [x] Maak de instellingenknop toegankelijk voor toetsenbord en touch; momenteel blijft het element verborgen zonder muisbeweging en blokkeert `#settingsHoverTrigger` interacties (`docs/css/style.css`, `docs/js/main.mjs`).
- [x] Koppel een zichtbare “Reset”/“Wis opgeslagen gegevens”-actie aan `clearSettingsAndShowForm()` zodat gebruikers hun sleutel en collectie snel verwijderen (`docs/js/main.mjs`).
- [x] Geef het status-overlay element een `role="status"`/`aria-live` en toon foutmeldingen met concrete herstelstappen per HTTP-status (401 vs 429) (`docs/index.html`, `docs/js/slideshow.mjs`).
- [x] Toon in de instructielijst een vaste basis-URL i.p.v. `window.location.href`, zodat gebruikers geen gevoelige query’s kopiëren (`docs/js/main.mjs`).
- [x] Voeg duidelijke feedback toe wanneer de lokale fallback (`pexels_photo_urls.txt`) ontbreekt of leeg is, inclusief verwijzing naar het Python-script en benodigde stappen (`docs/js/main.mjs`, `fetch_pexels_urls.py`, `README.md`).
- [x] Voeg een request-timeout en eenvoudige retry toe aan `fetch_pexels_urls.py` zodat het script niet blijft hangen en mislukkingen vriendelijker meldt (`fetch_pexels_urls.py`).

## 🛠 Lage prioriteit – Onderhoud & eenvoud
- [x] Splits `docs/js/script.js` in kleinere modules (config, i18n, storage, slideshow) om de codebasis overzichtelijker te maken (`docs/js/*.mjs`).
- [x] Voeg unit tests toe voor functies zoals `extractCollectionIdFromUrl()` en caching-logica (bijv. met Jest/Vitest) om regressies te voorkomen (`__tests__/script.test.js`).
- [x] Gebruik daadwerkelijk `python-dotenv` in `fetch_pexels_urls.py`/`update.sh` om verwarring te voorkomen (`fetch_pexels_urls.py`, `update.sh`, `requirements.txt`).
- [x] Voeg een `.env.example` toe en documenteer het update-proces (in README) zodat nieuwe gebruikers veilig kunnen starten.
- [x] Voeg een eenvoudige lint/format-check toe (bijv. `eslint` + `prettier` en `ruff` voor Python) zodat bijdragen consistent blijven (`package.json`, `.eslintrc.cjs`, `.prettierrc`, `ruff.toml`).
