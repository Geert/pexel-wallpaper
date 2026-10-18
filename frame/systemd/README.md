# Daily sync on rzdm5

rzdm5 is on the same network as the TV. The timer runs `frame_sync.py` every
morning at 05:00. The service pulls `main` first, so a merge is the deploy.

Install, once, as the user `geert`:

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
git clone https://github.com/Geert/pexel-wallpaper.git ~/pexel-wallpaper
mkdir -p ~/.config/systemd/user
ln -sf ~/pexel-wallpaper/frame/systemd/pexel-frame.{service,timer} ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now pexel-frame.timer
```

Settings go in `~/.config/pexel-frame/env`, for example `FRAME_HOST=192.168.2.50`.
Without `FRAME_HOST` the script finds the TV on the network and remembers it.

```bash
systemctl --user start pexel-frame.service    # sync now
journalctl --user -u pexel-frame.service -f   # follow the log
systemctl --user list-timers pexel-frame.timer
```

The user needs lingering (`loginctl show-user geert -p Linger` says `yes`),
so the timer runs without a login.
