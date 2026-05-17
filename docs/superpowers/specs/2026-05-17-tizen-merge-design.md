# Tizen-merge: Samsung TV als derde frontend

**Datum:** 2026-05-17
**Status:** approved (sectie 1–3)

## Doel

[`Geert/tizenwallpaper`](https://github.com/Geert/tizenwallpaper) opheffen en zijn functionaliteit overbrengen naar `Geert/pexel-wallpaper` als een derde frontend naast Plash (macOS) en Lively (Windows). De Tizen-app haalt zijn photo-metadata op runtime op van GitHub Pages in plaats van een gebundelde JSON. Bron- en code-duplicatie tussen de twee repos verdwijnt.

## Achtergrond

De twee repos zijn voor 95% identiek: CSS, `storage.mjs`, `status.mjs`, `i18n.mjs` en `translations.json` zijn 1:1, en `main.mjs` verschilt op drie plekken die allemaal met runtime-detectie opgelost kunnen worden. `pexel-wallpaper` heeft al een `isTizenTV()`-functie en gebruikt die voor het verbergen van de settings-knop. Photo-info bij OK/Enter en arrow-key navigatie zijn al universeel geïmplementeerd in `pexel-wallpaper/docs/js/main.mjs`.

De Samsung Store CSP staat geen remote JavaScript toe; wel JSON en images van toegestane origins. De huidige `config.xml` in tizenwallpaper bevat `connect-src https://geert.github.io` — runtime JSON-fetch is dus al toegestaan.

Offline-caching heeft nooit als bewuste feature bestaan in de repo (geverifieerd in git history). Het "gedeeltelijke" offline-gedrag komt uit de standaard browser HTTP-cache op de Pexels CDN images. Dit blijft zo — geen service worker, geen image-prefetch in scope.

## Architectuur

### Drie frontends, één codebase

| Frontend | Detectie | Settings-UI | Config-bron | Arrow/OK keys | JSON-bron |
|---|---|---|---|---|---|
| Plash (macOS) | `is-plash-app` class / UA `plash` | Op pointer/key-activiteit | URL params → localStorage → defaults | Werken bij interactiviteit | Lokaal `./pexels_photo_data.json` |
| Lively (Windows) | UA `livelywallpaper` / `window.livelyPropertyListener` | Op pointer/key-activiteit | Idem | Werken bij interactiviteit | Lokaal `./pexels_photo_data.json` |
| Samsung TV | `typeof tizen !== 'undefined'` | Altijd verborgen | Altijd `loadDefaults()` (geen API) | Altijd actief (D-pad) | Remote `https://geert.github.io/pexel-wallpaper/pexels_photo_data.json` |

### Repo-structuur na merge

```
docs/
  index.html
  config.xml          ← NIEUW: Tizen widget manifest (Tizen Studio opent docs/ als project)
  .tizenignore        ← NIEUW: sluit pexels_photo_data.json + pexels_photo_urls.txt + manifest.json uit van .wgt
  manifest.json       ongewijzigd (PWA manifest voor web, niet Tizen)
  images/
    favicon.ico, icon-16/32/180.png        index.html refs
    icon-192/256/512.png                   manifest.json refs (+ Samsung Store gebruikt 512)
    icon-128.png                           config.xml refs (als app-icon)
    icon-48.png, icon-64.png               nog steeds unreferenced (zie open vragen)
  css/style.css       ongewijzigd
  js/
    main.mjs          gewijzigd
    slideshow.mjs     gewijzigd
    config.mjs        gewijzigd (constant toegevoegd)
    i18n.mjs          gewijzigd (nieuwe label)
    translations.json gewijzigd (nieuwe label, 4 talen)
    storage.mjs       ongewijzigd
    status.mjs        ongewijzigd
```

### config.xml (basis uit tizenwallpaper)

Wijzigingen t.o.v. de huidige tizenwallpaper-versie:
- `<icon src="images/icon-128.png"/>` (was `<icon src="icon.png"/>` op tizen root — vervalt)
- `connect-src` in CSP: alleen `'self'` en `https://geert.github.io`. `api.pexels.com` verwijderd; de Tizen-build belt de Pexels API nooit direct.

### Build & distributie

Geen build-script en geen CI voor `.wgt`. De ontwikkelaar opent `docs/` als project in Tizen Studio en bouwt daar handmatig. De `.tizenignore` zorgt dat de gegenereerde `.wgt` geen onnodige metadata-bestanden bevat (de JSON wordt remote opgehaald).

## Componenten

### 1. `detectEnvironment()` in [main.mjs](../../js/main.mjs)

Voeg `'usageTizenTV'` toe als return-waarde, vóór de bestaande Plash/Lively/browser checks:

```js
function detectEnvironment() {
  if (typeof tizen !== 'undefined') return 'usageTizenTV';
  // ...bestaande logica
}
```

### 2. `handleConfiguration()` in [main.mjs](../../js/main.mjs)

Gate op `isTizenTV()`:

```js
function handleConfiguration() {
  if (isTizenTV()) {
    loadDefaults();
    return;
  }
  // ...bestaande URL-param + localStorage flow
}
```

### 3. `loadDefaultPhotoData()` in [slideshow.mjs](../../js/slideshow.mjs)

Nieuwe (of gewijzigde) helper die de bron kiest:

```js
const source = isTizenTV()
  ? REMOTE_PHOTO_DATA_URL
  : LOCAL_IMAGE_DATA_FILE;
const response = await fetch(source, { signal });
// op fail: status.mjs toont error overlay, geen retry, geen localStorage fallback
```

`REMOTE_PHOTO_DATA_URL` als nieuwe constant in [config.mjs](../../js/config.mjs):

```js
export const REMOTE_PHOTO_DATA_URL =
  'https://geert.github.io/pexel-wallpaper/pexels_photo_data.json';
```

### 4. i18n label

Voeg `usageTizenTV` toe aan [i18n.mjs](../../js/i18n.mjs) fallback object en aan [translations.json](../../js/translations.json) voor EN, NL, DE, FR. Voorbeeld-waarde EN: `"Samsung TV"`.

## Datastromen

### Tizen-app startup

```
opstart
  → handleConfiguration() → isTizenTV() == true → loadDefaults()
  → loadDefaultPhotoData() → fetch(REMOTE_PHOTO_DATA_URL)
      ├─ ok: parse JSON, init slideshow
      └─ fail (network/timeout/4xx/5xx): showStatus(t.statusErrorNetwork)
                                        slideshow blijft leeg
```

### Web-frontend startup (Plash/Lively/browser)

Onveranderd:
```
opstart
  → handleConfiguration() → check URL params / localStorage
      ├─ apiKey + collectionId aanwezig: loadFromAPI() (24h URL-cache via storage.mjs)
      └─ niet aanwezig: loadDefaults() → fetch(LOCAL_IMAGE_DATA_FILE)
```

## Error handling

- **Tizen fetch faalt:** standaard `t.statusErrorNetwork` overlay via [status.mjs](../../js/status.mjs). Geen retry-logica, geen fallback. Bij volgende app-start wordt de fetch opnieuw geprobeerd.
- **Tizen fetch 4xx/5xx:** zelfde overlay. Operationeel ongebruikelijk; alleen relevant als GitHub Pages down is of we de JSON-naam wijzigen.
- **Web-frontends:** ongewijzigd. Bestaande error paths blijven.

## Testen

- **Bestaande Jest-tests:** moeten blijven slagen. `__tests__/script.test.js` mockt `fetch` al; eventueel een nieuwe test toevoegen voor de Tizen-source-keuze in `loadDefaultPhotoData`.
- **Handmatige Tizen-test:** open `docs/` in Tizen Studio, bouw `.wgt`, installeer op een Samsung TV of Tizen TV emulator, verifieer dat:
  - Settings-knop niet zichtbaar is
  - Slideshow start vanuit remote JSON
  - OK toont info bottom-right; arrows next/prev werken
  - Bij offline-boot verschijnt de error-overlay
- **Handmatige Plash-test:** start Plash met de github.io URL; in browsing-mode verschijnt settings-knop bij activiteit, OK toont info, arrows navigeren.
- **Geen test voor Lively** (geen toegang) — code-paden zijn identiek aan Plash, dus dekking via Plash-test.

## Migratie van oude tizenwallpaper repo

1. In `Geert/tizenwallpaper`: commit een nieuwe `README.md` die naar `pexel-wallpaper` verwijst en uitleg geeft over de samengevoegde structuur.
2. GitHub Settings → "Archive this repository".
3. Geen file deletion, geen redirects in DNS — bestaande Samsung Store-listings en clones blijven werken voor wie de oude versie heeft, en de history blijft zichtbaar.

## Wat niet in scope is

- **Service worker / image-caching:** geen "echte" offline. Browser-HTTP-cache blijft het lichte werk doen.
- **CI-build voor `.wgt`:** lokaal via Tizen Studio.
- **Sync-mechanisme tizenwallpaper → pexel-wallpaper:** niet nodig na merge.
- **Photo-info-uitbreiding:** huidige weergave (alt + photographer) blijft.
- **Ongebruikte icons** (`icon-48.png`, `icon-64.png`): blijven staan; aparte cleanup-taak.

## Open vragen

Geen — alle drie de secties zijn besproken en goedgekeurd.

## Acceptatiecriteria

- [ ] `docs/config.xml` aanwezig, Tizen Studio opent `docs/` zonder errors
- [ ] `.wgt` build bevat geen `pexels_photo_data.json` of `pexels_photo_urls.txt`
- [ ] Op een Tizen TV: settings-knop nooit zichtbaar, slideshow start, OK toont info, arrows navigeren
- [ ] In Plash interactieve modus: settings-knop verschijnt bij muis, OK toont info, arrows navigeren
- [ ] In Plash niet-interactieve modus: geen UI-chrome zichtbaar
- [ ] Jest-suite slaagt
- [ ] `Geert/tizenwallpaper` repo is gearchiveerd met deprecation-README
