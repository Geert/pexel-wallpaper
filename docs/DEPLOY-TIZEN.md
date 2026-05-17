# Deploying the Tizen build to a Samsung Smart TV

This guide describes how to package `docs/` into a `.wgt` and install it on a
Samsung Smart TV that has Developer Mode enabled. It is intentionally
generic — fill in your own TV IP, device alias and certificate paths.

The Tizen frontend lives inside `docs/` alongside the GitHub Pages build.
`docs/config.xml` is the Tizen widget manifest and `docs/.tzpkgignore` lists
files that should not end up in the `.wgt` (the JSON fallback is fetched
remotely at runtime, so it is dead weight inside the package).

## Prerequisites

- **Tizen Studio** with the *TV Extensions* and *Samsung Certificate Extension*
  installed via Package Manager. The CLI tools `tizen` and `sdb` live under
  `<tizen-studio>/tools/ide/bin/` and `<tizen-studio>/tools/` respectively.
- A **certificate profile** registered in Tizen Studio's Certificate Manager.
  For deployment to a physical TV the distributor certificate must be a
  Samsung-issued one bound to the TV's DUID — a self-signed sample profile
  packages fine but the TV will silently refuse to launch the app.
- A Samsung TV with **Developer Mode** turned on (Apps screen → `12345` on the
  remote) and the **Host PC IP** field set to the IP of the machine you are
  deploying from. Reboot the TV after changing the IP.

Alternative tooling: [Jellyfin2Samsung](https://github.com/jeppevinkel/jellyfin-tizen-builds)
bundles its own `TizenSdb` binary and a pre-issued Samsung certificate pair.
It is the easiest path if you do not have a Samsung Developer account, since
its `resign` command stamps any `.wgt` with certificates the TV already
trusts.

## 1. Package the `.wgt`

From the repository root:

```bash
cd docs
"<tizen-studio>/tools/ide/bin/tizen" package -t wgt -s <profile-name> -- .
```

This produces `docs/Pexel Wallpaper.wgt`. The CLI does not currently honor
`.tzpkgignore`; if you care about package size, configure the same exclusion
list under *Project Properties → Tizen Studio → Package* in the GUI, or strip
the files from the `.wgt` (it is a zip) after building.

## 2. Connect to the TV

```bash
sdb connect <tv-ip>
sdb devices
```

Common failure: `failed to connect to <tv-ip>:26101` while TCP port 26101 is
clearly open. This means Developer Mode is on but the TV's whitelisted host
IP does not match the machine you are calling from. Either update the host
IP on the TV (and reboot) or deploy from the machine the TV expects.

You can read the TV's current developer status without the remote:

```bash
curl -sk http://<tv-ip>:8001/api/v2/ | python3 -m json.tool
```

Look for the `developerMode` and `developerIP` fields.

## 3. Install and launch

```bash
tizen install -n "Pexel Wallpaper.wgt" -t <device-alias>
sdb shell 0 was_execute PxlWallppr.TizenWallpaper
```

The device alias is whatever `sdb devices` reported in the second column
(for example `UE65...0`). The app package id is fixed in `config.xml` as
`PxlWallppr.TizenWallpaper`.

### Jellyfin2Samsung's TizenSdb workflow

If you use the bundled Jellyfin2Samsung tooling instead of Tizen Studio's
own `tizen`/`sdb`, the equivalent sequence is:

```bash
TizenSdb resign        <wgt> <author.p12> <distributor.p12> <password>
TizenSdb permit-install <tv-ip> <device-profile.xml> /home/owner/share/tmp/sdk_tools
TizenSdb install        <tv-ip> <wgt> /home/owner/share/tmp/sdk_tools
TizenSdb launch         <tv-ip> PxlWallppr.TizenWallpaper
```

This route signs your build with Jellyfin2Samsung's pre-issued Samsung
certificates and is the most reliable path when you do not have your own
Samsung-signed distributor cert for the target TV's DUID.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `sdb connect` fails, port 26101 *is* open | TV's `developerIP` field points at a different host. Fix on the TV remote and reboot. |
| Install reports success but the app does not appear in the launcher | `.wgt` was signed with a distributor cert the TV does not trust. Re-sign with a Samsung-issued cert tied to this TV's DUID. |
| App launches but cannot reach `images.pexels.com` or the photo JSON | CSP / access-origin mismatch in `docs/config.xml`. The shipped manifest already allows `images.pexels.com` and `geert.github.io`; verify it has not drifted. |
| Old version keeps loading after install | TV caches the previous build. Uninstall first (`sdb shell 0 vd_appcontrol -e DELETE -p PxlWallppr.TizenWallpaper`) or bump `version` in `config.xml`. |

## Updating photos

You do not need to rebuild the `.wgt` to refresh the photo collection. The
TV fetches `pexels_photo_data.json` from
<https://geert.github.io/pexel-wallpaper/> at runtime, and that file is kept
up to date by the daily GitHub Actions workflow.

Rebuild the `.wgt` only when you change the app itself (UI, logic, manifest,
icons, version bump).
