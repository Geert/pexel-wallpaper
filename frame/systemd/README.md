# systemd units

`pexel-frame.timer` runs `pexel-frame.service` every morning at 05:00 (the
system's time zone). The service pulls `~/pexel-wallpaper` first, runs
`frame_sync.py` with the settings from `~/.config/pexel-frame/env`, and
retries every 30 minutes for about three hours when the TV does not answer.

Installation and settings: see [the Frame README](../README.md#linux-and-raspberry-pi-systemd).
