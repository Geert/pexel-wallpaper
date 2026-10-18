# Pexels for Samsung The Frame

`frame_sync.py` puts the photos of a [Pexels](https://www.pexels.com) collection in the Art Mode of a Samsung The Frame TV, and keeps them in sync. The TV's own Art Mode slideshow shows them.

Nothing is installed on the TV. The script runs on a computer on the same network, such as a Raspberry Pi, a home server or a Mac. It talks to the TV over the TV's local WebSocket API through [samsungtvws](https://github.com/xchwarze/samsung-tv-ws-api). This is the approach of [drnic/samsung-tv-art](https://github.com/drnic/samsung-tv-art). No Samsung account, SmartThings or developer mode is needed, and nothing goes through the cloud.

## What it does

Every run:

1. Reads the collection. Without settings, this is the default collection, published as JSON on GitHub Pages. With a Pexels API key, it can be any Pexels collection.
2. Finds the TV on the network, and wakes it with Wake-on-LAN when it has the MAC address.
3. Uploads the landscape photos that are not on the TV yet. It asks the Pexels CDN for a JPG cropped to exactly 3840x2160 (about 1.5 MB), so the TV does not have to scale. It skips portrait photos, because Art Mode fills a 16:9 screen.
4. Deletes the photos it uploaded earlier that are no longer in the collection.
5. Turns on the Art Mode slideshow on *My Photos*: shuffled, with a new photo every 15 minutes.

The script remembers which image on the TV is which Pexels photo. It only deletes images that it uploaded itself.

> [!IMPORTANT]
> The slideshow runs on all of *My Photos*. Photos that you uploaded yourself, for example with the SmartThings app, show up in it as well. The TV cannot run a slideshow over only a part of *My Photos*, and it cannot mark your own photos as favourites. If you want only Pexels photos in the slideshow, remove your own photos from *My Photos*. The script never does that for you.

## Requirements

- **A Samsung The Frame TV** on the same network as the computer. Tested on a 2024 The Frame (QE65LS03D, Art API 5.0.1.0); drnic/samsung-tv-art was tested on firmware with Art API 0.97. Other Frame models that samsungtvws supports should work as well.
- **[uv](https://docs.astral.sh/uv/)**, which installs Python 3.11 or newer and `samsungtvws` by itself:
  ```bash
  curl -LsSf https://astral.sh/uv/install.sh | sh
  ```
  On Windows, see the [uv installation guide](https://docs.astral.sh/uv/getting-started/installation/).
- **Optional: a free [Pexels API key](https://www.pexels.com/api/)**, if you want a collection other than the default.

### TV settings

The TV must be on, or in Art Mode, to answer. When it is fully off, its Wi-Fi sleeps. The menu names differ a little per model and year:

- *Settings > General > Network > Expert Settings > Power On with Mobile*: **On**. Wake-on-LAN then works.
- *Settings > General > External Device Manager > Device Connection Manager > Access Notification*: **First Time Only**.
- Give the TV a fixed IP address with a DHCP reservation in your router. The script finds the TV again if its address changes, but only when it is the only Frame on the network.

## Install

The script is a single file. Clone the repository:

```bash
git clone https://github.com/Geert/pexel-wallpaper.git
cd pexel-wallpaper/frame
```

You can also download only the script:

```bash
curl -O https://raw.githubusercontent.com/Geert/pexel-wallpaper/main/frame/frame_sync.py
```

## Quick start

```bash
uv run frame_sync.py discover    # find the TV and remember it
uv run frame_sync.py pair        # select Allow on the TV within 30 seconds
uv run frame_sync.py --dry-run   # show what it would upload
uv run frame_sync.py             # sync now
uv run frame_sync.py info        # art mode, current image, slideshow
```

On the first connection, the TV shows a prompt to allow *PexelWallpaper*. It closes after about 30 seconds, so stand by the TV with the remote when you run `pair`. If you skip `pair`, the first sync pairs first.

The first sync of a large collection takes a while. Expect about 5 seconds per photo, so roughly 2.5 hours for 2000 photos. After that, a sync only uploads what is new.

## Settings

Every option can be passed on the command line or set as an environment variable:

| Option | Environment | Default | Meaning |
|---|---|---|---|
| `--collection` | `PEXELS_COLLECTION` | the default collection | Pexels collection URL or id, e.g. `https://www.pexels.com/collections/wallpapers-vmnecek/` |
| | `PEXELS_API_KEY` | | needed with `--collection` |
| `--photos` | `FRAME_PHOTOS` | `0` (all) | maximum number of photos on the TV |
| `--replace` | `FRAME_REPLACE` | `0` | oldest uploads to replace each run |
| `--minutes` | `FRAME_MINUTES` | `15` | minutes per photo in the slideshow |
| `--matte` | `FRAME_MATTE` | `none` | frame around the photo, e.g. `shadowbox_polar` |
| `--host` | `FRAME_HOST` | found on the network | IP address of the TV |
| `--mac` | `FRAME_MAC` | found on the network | MAC address, for Wake-on-LAN |
| `--photo-data-url` | `PHOTO_DATA_URL` | the default collection | a JSON file in the format of [`pexels_photo_data.json`](../docs/pexels_photo_data.json) |
| `--dry-run` | | | print the plan, do not touch the TV |

### A rotating set instead of the whole collection

With `--photos` and `--replace`, the TV holds a smaller set that changes every day. Each run replaces the oldest uploads with photos that were on the TV longest ago, or never. Photos are only repeated after the whole collection has been on the TV.

```bash
# 100 photos, all new every day; at 15 minutes each that is 25 hours of photos
FRAME_PHOTOS=100 FRAME_REPLACE=100 uv run frame_sync.py
```

### Your own collection

Create a collection on pexels.com, [get an API key](https://www.pexels.com/api/), and pass both:

```bash
PEXELS_API_KEY=... uv run frame_sync.py --collection https://www.pexels.com/collections/my-art-abc1234/
```

If you switch collections, the next sync deletes the photos of the old collection and uploads the new ones.

Photos made for a 16:9 screen look best, at 3840x2160 or larger. The default collection, [wallpapers](https://www.pexels.com/collections/wallpapers-vmnecek/), contains photos by Geert Rozendom, almost all of them 16:9 at 4K or more. Most other Pexels photos are 3:2 or 4:3, and the crop to 16:9 cuts 11 to 25% off the top and bottom.

## Run it every day

A sync only does work when the collection changes, so once a day is enough. Start it at a time when the TV is usually on or in Art Mode. The examples assume the repository is in your home directory, at `~/pexel-wallpaper`. Settings go in `~/.config/pexel-frame/env`, one `NAME=value` per line, for example:

```ini
FRAME_MINUTES=3
```

### Linux and Raspberry Pi: systemd

The units in [`systemd/`](systemd/) run the sync every morning at 05:00. They first `git pull` the repository, and retry every 30 minutes, for about three hours, when the TV does not answer.

```bash
mkdir -p ~/.config/systemd/user
ln -sf ~/pexel-wallpaper/frame/systemd/pexel-frame.{service,timer} ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now pexel-frame.timer
loginctl enable-linger "$USER"     # run without being logged in

systemctl --user start pexel-frame.service    # sync now
journalctl --user -u pexel-frame.service -f   # follow the log
```

The units expect `uv` in `~/.local/bin`, which is where the installer puts it.

### macOS: launchd

Save this as `~/Library/LaunchAgents/com.github.geert.pexel-frame.plist`, replacing `YOU` with your user name:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.github.geert.pexel-frame</string>
  <key>ProgramArguments</key>
  <array>
    <string>/Users/YOU/.local/bin/uv</string>
    <string>run</string>
    <string>--quiet</string>
    <string>/Users/YOU/pexel-wallpaper/frame/frame_sync.py</string>
  </array>
  <key>StartCalendarInterval</key>
  <dict><key>Hour</key><integer>5</integer><key>Minute</key><integer>0</integer></dict>
  <key>StandardOutPath</key><string>/tmp/pexel-frame.log</string>
  <key>StandardErrorPath</key><string>/tmp/pexel-frame.log</string>
</dict>
</plist>
```

```bash
launchctl load ~/Library/LaunchAgents/com.github.geert.pexel-frame.plist
```

launchd does not read `~/.config/pexel-frame/env`. Put settings in the plist under `EnvironmentVariables`. If the Mac is asleep at that time, launchd runs the job when it wakes up; if it is off, the job is skipped.

### Any other system: cron

```cron
0 5 * * * FRAME_MINUTES=15 $HOME/.local/bin/uv run --quiet $HOME/pexel-wallpaper/frame/frame_sync.py >> $HOME/pexel-frame.log 2>&1
```

On Windows, Task Scheduler can run `uv run frame_sync.py` the same way. That is not tested.

## Files

Everything the script keeps is in `~/.config/pexel-frame/`. Set `FRAME_CONFIG_DIR` to use another directory.

| File | Content |
|---|---|
| `token` | the pairing token from the TV. Keep it private: with it, anyone on your network can control the TV. |
| `state.json` | the TV's address, and which image on the TV is which Pexels photo |
| `env` | your settings, for systemd |

If you lose `state.json`, the next sync does not know which images it uploaded. It then uploads the collection again, which gives duplicates. Delete the old images on the TV first, or restore the file.

## Troubleshooting

| Problem | What to do |
|---|---|
| `found no Frame TV` | Turn the TV on, check it is on the same network, or pass `--host`. Discovery only searches the local /24 network. |
| `pairing failed` or `ms.channel.timeOut` | The Allow prompt timed out. Run `pair` again, and select *Allow* within 30 seconds. |
| No Allow prompt appears | The TV may have refused *PexelWallpaper* before. Check *Device Connection Manager > Device List* on the TV, remove or allow it, delete `~/.config/pexel-frame/token`, and run `pair` again. |
| The sync hangs | Newer firmware ignores some requests, and samsungtvws then waits forever. The script gives every request a time limit. If one runs out, please open an issue with your model and the output of `info`. |
| `upload ... failed, the TV may be full` | The TV refused an upload. The script keeps what is on the TV and starts the slideshow. Lower `--photos`, or delete photos on the TV. |
| `skip ...: expected image/jpeg` | The CDN did not return a JPG for that photo. The next sync tries again. |
| The slideshow does not change | It runs in Art Mode. Press the power button once to switch between TV and Art Mode. |

## How it works

The TV has a WebSocket API on port 8002, with a self-signed certificate. The SmartThings app uses the same API. The script uses two of its channels:

- **The remote-control channel** (`samsung.remote.control`) shows the Allow prompt, and hands out the token. On Art API 5 firmware, only this channel shows the prompt; without a token, the Art Mode channel waits silently.
- **The Art Mode channel** (`com.samsung.art-app`) handles listing, uploading and deleting images, and the slideshow. Art API 5 answers `set_slideshow_status`, while firmware with Art API 0.97 only knows `set_auto_rotation_status`. The script picks the right one from `get_api_version`.

Uploads go to category `MY-C0002` (*My Photos*). After each upload, the script deletes one image that has to go, if there is one. The TV then never holds more than one extra image, and the slideshow never runs empty.

The tests in `test_frame_sync.py` need only the Python standard library:

```bash
python3 -m unittest discover frame
```

## Credits and license

- [drnic/samsung-tv-art](https://github.com/drnic/samsung-tv-art) showed how to drive Art Mode over the local network.
- [samsungtvws](https://github.com/xchwarze/samsung-tv-ws-api) implements the TV's WebSocket API.
- Photos come from [Pexels](https://www.pexels.com) under the [Pexels license](https://www.pexels.com/license/). The photos of the default collection are by [Geert Rozendom](https://www.pexels.com/@joepkoek). If you use the Pexels API for your own collection, follow the [Pexels API guidelines](https://www.pexels.com/api/documentation/#guidelines).
- The code is under the [MIT license](../LICENSE).
