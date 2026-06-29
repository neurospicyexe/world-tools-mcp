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

- **Process manager:** pm2 via `ecosystem.config.cjs`

```bash
# Deploy update
cd ~/world-tools-mcp && git pull && npm install && npm run build && pm2 reload ecosystem.config.cjs

# First-time setup
pm2 start ecosystem.config.cjs && pm2 save
```
