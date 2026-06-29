# world-tools-mcp

A lightweight MCP server that gives Claude access to current time, weather, and moon phase data. Stateless — no database, no companion data. Calls open public APIs and returns results.

Part of the [Nullsafe BBH suite](../CLAUDE.md).

> **⚠️ Disclaimer**
> This project was built with AI assistance ("vibe-coded"). Security hardening has been applied to the best of our ability — API key auth, no data persistence, minimal attack surface — but this software comes with **no warranty and no liability**. It has not undergone a professional security audit. If you use it, you use it at your own risk.

## Tools

| Tool | Returns |
|------|---------|
| `get_time` | Current time in UTC + any named timezone |
| `get_weather` | Current conditions via open-meteo (free, no API key required) |
| `get_moon_phase` | Lunar phase name, illumination %, age in days |

## Quick setup (if you know what you're doing)

```bash
git clone https://github.com/neurospicyexe/world-tools-mcp.git
cd world-tools-mcp
npm install && npm run build
cp .env.example .env   # fill in API_KEY, WEATHER_LAT, WEATHER_LON
npm start
```

For VPS deployment, use `pm2 start ecosystem.config.cjs` and a Cloudflare Tunnel.

**Not sure where to start?** See [INSTALL.md](./INSTALL.md) for step-by-step instructions.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `API_KEY` | Yes | Bearer token for MCP auth |
| `WEATHER_LAT` | Yes | Decimal latitude for weather |
| `WEATHER_LON` | Yes | Decimal longitude for weather |
| `PUBLIC_URL` | Yes | Full URL this server is reachable at |
| `PORT` | No | Server port (default: 3456) |
| `DEFAULT_TIMEZONE` | No | IANA timezone (e.g. `America/New_York`) so `get_time` returns local time by default instead of UTC. Falls back to the process `TZ` if set. |

`WEATHER_LAT` and `WEATHER_LON` are required — the server refuses to start without them.
Set `DEFAULT_TIMEZONE` too, or `get_time` will only report UTC unless the caller passes a timezone.

## MCP tool namespace

`mcp__claude_ai_world-tracker`

## Security

See [SECURITY.md](./SECURITY.md).

## Acknowledgments

The original idea — a tiny MCP server bundling time, weather, and moon phase — comes from
**[SweetSunnyBunny's Sharing-MCPs](https://github.com/SweetSunnyBunny/Sharing-MCPs/tree/main/world-tools-mcp)**.
This is an independent reimplementation (its own server/OAuth/transport code, plus fixes for a
process crash-loop and a default-timezone bug), shared back in the same spirit. Thank you for the
original idea. 🌙
