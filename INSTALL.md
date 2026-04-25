# Installing world-tools-mcp

> **Tech-savvy?** The quick version is in [README.md](./README.md). This guide is for everyone else.

## What is this, in plain English?

World-tools is a small always-on server that gives Claude access to three things:

- **Current time** — in any timezone
- **Current weather** — for your location
- **Moon phase** — current lunar phase and illumination

It runs as a simple Node.js server. Claude connects to it via MCP (Model Context Protocol) and can call these tools mid-conversation.

---

## Local computer vs. VPS — which should I use?

**Local computer:**
The server runs on your machine and is only reachable when your computer is on. Claude Desktop connects to it directly. Good for personal use if your computer is usually on.

**VPS — a virtual private server (recommended for companion use):**
Runs 24/7 on a remote server, accessible via a Cloudflare Tunnel. This is needed if you want companions to access it from Discord bots or other always-on services.

---

## What you need

- **Node.js** — [nodejs.org](https://nodejs.org) (LTS version)
- **Git** — [git-scm.com](https://git-scm.com)
- **Your geographic coordinates** — latitude and longitude. Find them at [latlong.net](https://www.latlong.net) — just search your city.

---

## Option A: Local computer

### 1. Get the code

```bash
git clone https://github.com/neurospicyexe/world-tools-mcp.git
cd world-tools-mcp
npm install
npm run build
```

### 2. Create your environment file

```bash
cp .env.example .env
```

Open `.env` and fill in:

```
API_KEY=pick-any-random-string-as-a-secret
PUBLIC_URL=http://localhost:3456
WEATHER_LAT=40.7128
WEATHER_LON=-74.0060
PORT=3456
```

Replace the latitude/longitude with your actual location coordinates.

> **What's the API_KEY for?** It's a simple password that prevents other people from using your server if it were ever exposed. For local use, any random string works.

### 3. Start the server

```bash
npm start
```

You'll see `Server running on port 3456`. Leave this terminal open.

### 4. Connect Claude

Add to Claude Desktop's MCP config:

```json
{
  "mcpServers": {
    "world-tracker": {
      "command": "node",
      "args": ["/full/path/to/world-tools-mcp/dist/index.js"],
      "env": { "API_KEY": "your-api-key" }
    }
  }
}
```

---

## Option B: VPS (always-on)

### Prerequisites on your VPS

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git
npm install -g pm2
```

### 1. Get the code on your VPS

```bash
git clone https://github.com/neurospicyexe/world-tools-mcp.git
cd world-tools-mcp
npm install
npm run build
```

### 2. Create your environment file

Same as Option A — create `.env` with your API key, coordinates, and set `PUBLIC_URL` to your Cloudflare Tunnel URL (you'll set this up next).

### 3. Start with pm2

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup  # follow the printed instruction for auto-restart on reboot
```

### 4. Set up a Cloudflare Tunnel

A Cloudflare Tunnel creates a secure URL for your server without opening firewall ports.

1. Install cloudflared: [developers.cloudflare.com/cloudflare-one/connections/connect-networks/get-started](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/get-started/)
2. Create a tunnel pointing to `http://localhost:3456`
3. You'll get a URL like `https://world.yourdomain.com`
4. Update `PUBLIC_URL` in your `.env` to that URL, then `pm2 reload ecosystem.config.cjs`

### 5. Connect Claude

```json
{
  "mcpServers": {
    "world-tracker": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://world.yourdomain.com/mcp"],
      "env": { "API_KEY": "your-api-key" }
    }
  }
}
```

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| `WEATHER_LAT and WEATHER_LON are required` | Check your `.env` file — these must both be set |
| Weather returns wrong city | Double-check your coordinates at latlong.net |
| `EADDRINUSE` | Something else is using port 3456. Change `PORT` in `.env` |
| Claude can't reach it | For local: make sure `npm start` is running. For VPS: check `pm2 list` and your Cloudflare Tunnel status |
