# world-tools-mcp

HTTP MCP server providing time, weather, and moon phase tools to companions and Claude Code. Deployed on VPS behind a Cloudflare Tunnel.

Part of the BBH suite — see root `CLAUDE.md` for cross-project context.

## What It Does

| Tool | Returns |
|------|---------|
| `get_time` | Current time in UTC + optional named timezone |
| `get_weather` | Current conditions via open-meteo (free, no API key required) |
| `get_moon_phase` | Lunar phase name, illumination %, age in days |

## Usage

Called directly by tool name — no `ask_librarian` wrapper needed.

```
get_time        # call at boot after orient (pass timezone from config)
get_moon_phase  # optional; ritual/immersion sessions
get_weather     # optional; presence grounding
```

MCP tool namespace: `mcp__claude_ai_world-tracker`

## Required Env Vars

```env
API_KEY=          # Bearer token for MCP auth
PUBLIC_URL=       # https://world.yourdomain.com
WEATHER_LAT=      # Decimal latitude for your location
WEATHER_LON=      # Decimal longitude for your location
PORT=3456         # Optional, default 3456
DEFAULT_TIMEZONE= # Optional IANA tz (e.g. America/New_York); get_time defaults to UTC without it
```

`WEATHER_LAT` and `WEATHER_LON` are required — the server will refuse to start without them. No default coordinates: wrong coords = wrong city's weather.

## Deployment

- **Process manager: systemd (`world-tools-mcp.service`). NOT pm2.**

Unit file is versioned at `deploy/world-tools-mcp.service`. It binds `PORT` (3456) and reads
`.env` via `EnvironmentFile`.

```bash
# Deploy update
cd ~/world-tools-mcp && git pull && npm install && npm run build
sudo systemctl restart world-tools-mcp.service

# Status / logs
systemctl status world-tools-mcp.service
journalctl -u world-tools-mcp.service -n 50 --no-pager

# First-time setup
sudo cp deploy/world-tools-mcp.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now world-tools-mcp.service
```

### DO NOT run this under pm2 (2026-07-09)

This service was supervised by **both** systemd and pm2 for months. Only one can hold port 3456,
so pm2's copy never bound: it logged `EADDRINUSE 127.0.0.1:3456` and thrashed to **19,269
restarts**. Each time someone "fixed" it by killing the process holding the port, they were
killing the *healthy systemd* process; systemd restarted it (`Restart=on-failure`), pm2 lost the
race again, and the loop resumed. The kill kept working and kept not fixing anything, because the
bug was duplicate supervision, not a zombie.

The pm2 entry was deleted (`pm2 delete world-tools && pm2 save`) and `ecosystem.config.cjs` was
removed from this repo so the instruction that recreated it is gone. **If you find yourself
reaching for `fuser -k` or `kill` on port 3456, stop and run `cat /proc/<pid>/cgroup` first** --
it names the supervisor that owns the process. `PPID=1` means *systemd owns it*, not "orphan".
