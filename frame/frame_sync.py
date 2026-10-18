# /// script
# requires-python = ">=3.11"
# dependencies = ["samsungtvws>=3.0.6"]
# ///
"""Keep a rotating set of Pexels photos in the Art Mode of a Samsung The Frame TV.

Every run replaces the photos this script put on the TV with photos from the
collection that were on the TV longest ago (or never), and turns on the Art
Mode slideshow. It only deletes images it uploaded itself.

Run it on a computer on the same network as the TV:

    uv run frame/frame_sync.py              # sync now
    uv run frame/frame_sync.py --dry-run    # print the plan only
    uv run frame/frame_sync.py --host 192.168.2.50 info
"""

import argparse
import ipaddress
import json
import os
import random
import socket
import sys
import time
import urllib.request
import warnings
from concurrent.futures import ThreadPoolExecutor
from datetime import date
from pathlib import Path

PHOTO_DATA_URL = "https://geert.github.io/pexel-wallpaper/pexels_photo_data.json"
CATEGORY = "MY-C0002"  # "My Photos" on the TV
SCREEN = (3840, 2160)
CONFIG_DIR = Path(os.environ.get("FRAME_CONFIG_DIR", Path.home() / ".config" / "pexel-frame"))
STATE_FILE = CONFIG_DIR / "state.json"
TOKEN_FILE = CONFIG_DIR / "token"
USER_AGENT = "PexelWallpaperFrame/1.0"

# The TV uses a self-signed certificate on port 8002.
warnings.filterwarnings("ignore", message="Unverified HTTPS request")


def log(msg):
    print(msg, flush=True)


# --- State ---


def load_state():
    try:
        state = json.loads(STATE_FILE.read_text())
    except FileNotFoundError:
        state = {}
    state.setdefault("uploaded", {})  # content_id -> {"pexelsId": int, "since": "YYYY-MM-DD"}
    state.setdefault("lastOnTv", {})  # str(pexels_id) -> "YYYY-MM-DD"
    return state


def save_state(state):
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    tmp = STATE_FILE.with_suffix(".tmp")
    tmp.write_text(json.dumps(state, indent=2, sort_keys=True))
    tmp.replace(STATE_FILE)


# --- Photos ---


def load_photos(url):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=30) as r:
        data = json.load(r)
    # Art Mode fills a 16:9 screen; the collection is almost all landscape.
    return [p for p in data["photos"] if p["width"] > p["height"]]


def screen_url(photo):
    """A JPG of the photo cropped to the screen size, made by the Pexels CDN."""
    w, h = SCREEN
    return f"{photo['imageUrl']}?cs=srgb&fit=crop&w={w}&h={h}"


def download(url):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=60) as r:
        if r.headers.get_content_type() != "image/jpeg":
            raise ValueError(f"expected image/jpeg, got {r.headers.get_content_type()}")
        return r.read()


# --- Plan ---


def plan(photos, uploaded, last_on_tv, count, replace, rng):
    """Return (content ids to delete, photos to upload).

    Drops uploads whose photo left the collection, then replaces the `replace`
    oldest uploads. Fills the set up to `count` with the photos that were on
    the TV longest ago, never-shown photos first, in random order otherwise.
    """
    ids = {p["id"] for p in photos}
    gone = [cid for cid, u in uploaded.items() if u["pexelsId"] not in ids]
    kept = sorted(
        ((cid, u) for cid, u in uploaded.items() if cid not in gone),
        key=lambda item: item[1]["since"],
    )
    n_replace = max(0, min(replace, len(kept)))
    too_many = max(0, len(kept) - n_replace - count)
    old = [cid for cid, _ in kept[: n_replace + too_many]]
    keep = {u["pexelsId"] for cid, u in kept[n_replace + too_many :]}
    replaced = {uploaded[cid]["pexelsId"] for cid in old}

    candidates = [p for p in photos if p["id"] not in keep and p["id"] not in replaced]
    rng.shuffle(candidates)
    candidates.sort(key=lambda p: last_on_tv.get(str(p["id"]), ""))
    needed = max(0, count - len(keep))
    new = candidates[:needed]
    if len(new) < needed:
        # A small collection: reuse photos that were just replaced.
        new += [p for p in photos if p["id"] in replaced][: needed - len(new)]
    return gone + old, new


# --- TV ---


def tv_info(host, timeout=1):
    """Return the REST API device info of a Samsung TV, or None."""
    try:
        with urllib.request.urlopen(f"http://{host}:8001/api/v2/", timeout=timeout) as r:
            return json.load(r)["device"]
    except (OSError, ValueError, KeyError):
        return None


def local_ip():
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
        s.connect(("192.0.2.1", 9))  # no packet is sent
        return s.getsockname()[0]


def discover():
    """Find a Frame TV on the local /24 network."""
    net = ipaddress.ip_network(f"{local_ip()}/24", strict=False)
    with ThreadPoolExecutor(64) as pool:
        infos = pool.map(tv_info, (str(h) for h in net.hosts()))
    frames = [i for i in infos if i and i.get("FrameTVSupport") == "true"]
    if len(frames) != 1:
        return None
    log(f"found {frames[0].get('modelName', 'Frame TV')} at {frames[0]['ip']}")
    return frames[0]


def wake(mac, host):
    packet = b"\xff" * 6 + bytes.fromhex(mac.replace(":", "")) * 16
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
        s.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
        s.sendto(packet, ("255.255.255.255", 9))
        if host:
            s.sendto(packet, (host, 9))


def find_tv(args, state):
    """Return the host of the TV, waking or discovering it when needed."""
    host = args.host or state.get("host")
    mac = args.mac or state.get("mac")
    if host and tv_info(host, timeout=3):
        return host
    if mac:
        log(f"no answer from {host or 'the TV'}, sending Wake-on-LAN to {mac}")
        wake(mac, host)
        for _ in range(12):
            time.sleep(5)
            if host and tv_info(host, timeout=3):
                return host
    if args.host:
        sys.exit(f"error: no Samsung TV answered at {args.host}")
    info = discover()
    if not info:
        sys.exit("error: found no Frame TV. Turn the TV on, or pass --host or set FRAME_HOST.")
    state["host"] = info["ip"]
    if info.get("wifiMac"):
        state["mac"] = info["wifiMac"].lower()
    save_state(state)
    return info["ip"]


def connect(host, timeout):
    from samsungtvws import SamsungTVWS

    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    tv = SamsungTVWS(
        host=host, port=8002, token_file=str(TOKEN_FILE), name="PexelWallpaper", timeout=timeout
    )
    return tv.art()


# --- Commands ---


def cmd_sync(args):
    state = load_state()
    photos = load_photos(args.photo_data_url)
    log(f"{len(photos)} landscape photos in the collection")
    today = date.today().isoformat()

    art = None
    if not args.dry_run:
        art = connect(find_tv(args, state), args.timeout)
        on_tv = {item["content_id"] for item in art.available(CATEGORY)}
        missing = [cid for cid in state["uploaded"] if cid not in on_tv]
        for cid in missing:
            del state["uploaded"][cid]
        if missing:
            log(f"{len(missing)} uploads were removed from the TV by hand")

    replace = args.photos if args.replace is None else args.replace
    to_delete, to_upload = plan(
        photos, state["uploaded"], state["lastOnTv"], args.photos, replace, random.Random()
    )
    log(f"plan: upload {len(to_upload)}, delete {len(to_delete)}, "
        f"keep {len(state['uploaded']) - len(to_delete)}")
    if args.dry_run:
        for p in to_upload:
            log(f"  + {p['id']}  {(p.get('alt') or '')[:70]}")
        return

    # Delete one old image after each upload, so the TV never holds more than
    # one extra image and never runs empty.
    pending = list(to_delete)
    uploaded = 0
    for photo in to_upload:
        try:
            data = download(screen_url(photo))
        except (OSError, ValueError) as e:
            log(f"skip {photo['id']}: {e}")
            continue
        content_id = art.upload(data, file_type="jpg", matte=args.matte, portrait_matte=args.matte)
        state["uploaded"][content_id] = {"pexelsId": photo["id"], "since": today}
        state["lastOnTv"][str(photo["id"])] = today
        uploaded += 1
        if pending:
            delete(art, state, [pending.pop(0)])
        save_state(state)
        log(f"{uploaded}/{len(to_upload)} {photo['id']} -> {content_id}")
    if pending:
        delete(art, state, pending)
    for u in state["uploaded"].values():
        state["lastOnTv"][str(u["pexelsId"])] = today
    save_state(state)

    art.set_auto_rotation_status(duration=args.minutes, type=True, category_id=CATEGORY)
    log(f"slideshow: {len(state['uploaded'])} photos, {args.minutes} minutes each")


def delete(art, state, content_ids):
    if not art.delete_list(content_ids):
        log(f"warning: the TV did not confirm deleting {', '.join(content_ids)}")
    for cid in content_ids:
        state["uploaded"].pop(cid, None)


def cmd_info(args):
    state = load_state()
    art = connect(find_tv(args, state), args.timeout)
    print(json.dumps({
        "art_mode": art.get_artmode(),
        "current": art.get_current(),
        "slideshow": art.get_auto_rotation_status(),
        "my_photos": len(art.available(CATEGORY)),
        "uploaded_by_sync": len(state["uploaded"]),
    }, indent=2))


def env_int(name, default):
    return int(os.environ.get(name, default))


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--host", default=os.environ.get("FRAME_HOST"),
                        help="IP address of the TV (FRAME_HOST); found on the network if omitted")
    parser.add_argument("--mac", default=os.environ.get("FRAME_MAC"),
                        help="MAC address for Wake-on-LAN (FRAME_MAC)")
    parser.add_argument("--photos", type=int, default=env_int("FRAME_PHOTOS", 100),
                        help="photos on the TV at once (FRAME_PHOTOS, default 100)")
    parser.add_argument("--minutes", type=int, default=env_int("FRAME_MINUTES", 15),
                        help="minutes per photo (FRAME_MINUTES, default 15)")
    parser.add_argument("--replace", type=int,
                        default=int(os.environ["FRAME_REPLACE"]) if "FRAME_REPLACE" in os.environ
                        else None,
                        help="photos to replace per run (FRAME_REPLACE, default all)")
    parser.add_argument("--matte", default=os.environ.get("FRAME_MATTE", "none"),
                        help="matte, e.g. none or shadowbox_polar (FRAME_MATTE, default none)")
    parser.add_argument("--photo-data-url", default=os.environ.get("PHOTO_DATA_URL", PHOTO_DATA_URL))
    parser.add_argument("--timeout", type=int, default=30)
    parser.add_argument("--dry-run", action="store_true", help="print the plan, do not touch the TV")
    parser.add_argument("command", nargs="?", default="sync", choices=["sync", "info"])
    args = parser.parse_args()
    {"sync": cmd_sync, "info": cmd_info}[args.command](args)


if __name__ == "__main__":
    main()
