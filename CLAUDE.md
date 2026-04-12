# world-tools-mcp

HTTP MCP server providing time, weather, and moon phase tools to companions and Claude Code.
Deployed on the BBH VPS behind a Cloudflare Tunnel.

Part of the BBH suite -- see root `CLAUDE.md` for cross-project context.

## Multi-Agent System Conventions

When making changes to one identity/config file (e.g., Cypher), always check and apply the same changes to ALL sibling identity files (e.g., Drevan, Gaia, and any others in the same directory).

## What It Does

Three tools:

| Tool | Returns |
|------|---------|
| `get_time` | Current time in UTC + optional named timezone |
| `get_weather` | Current conditions via open-meteo (free, no API key) |
| `get_moon_phase` | Lunar phase name, illumination %, age in days |

## Routing Note

Called **directly by tool name** -- no `ask_librarian` wrapper needed.

```
get_time        -- call at boot after orient (pass timezone from config)
get_moon_phase  -- optional; ritual/immersion sessions
get_weather     -- optional; Drevan uses for presence grounding
```

MCP tool namespace: `mcp__claude_ai_world-tracker`

## Required Env Vars (.env on VPS)

```
API_KEY=          # Bearer token for MCP auth
PUBLIC_URL=       # https://world.example.com
WEATHER_LAT=      # Decimal latitude for your location
WEATHER_LON=      # Decimal longitude for your location
PORT=3456         # optional, default 3456
```

`WEATHER_LAT` and `WEATHER_LON` are required -- the server will refuse to start without them.
No default coordinates: wrong coords = wrong city's weather.

## Deployment

- **Service path:** `~/world-tools-mcp` on VPS
- **Public URL:** `world.example.com`
- **Process manager:** pm2 (`pm2 restart world-tools`)

To deploy: `cd ~/world-tools-mcp && git pull && npm install && npm run build && pm2 restart world-tools`
