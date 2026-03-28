# Deployment

Same pattern as nullsafe-second-brain. VPS + Cloudflare Tunnel.

## VPS setup

```bash
cd ~
git clone <repo> world-tools-mcp
cd world-tools-mcp
npm install
npm run build

# Create env file
cp .env.example .env
nano .env   # set API_KEY, PUBLIC_URL, WEATHER_LAT, WEATHER_LON
```

## systemd service

```ini
# /etc/systemd/system/world-tools-mcp.service
[Unit]
Description=world-tools-mcp
After=network.target

[Service]
Type=simple
User=nullsafe
WorkingDirectory=/home/nullsafe/world-tools-mcp
EnvironmentFile=/home/nullsafe/world-tools-mcp/.env
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable world-tools-mcp
sudo systemctl start world-tools-mcp
sudo systemctl status world-tools-mcp
```

## Cloudflare Tunnel

Add a new public hostname in your existing tunnel (same tunnel as mcp.example.com):

- **Subdomain**: `world`
- **Domain**: `example.com`
- **Service**: `http://localhost:3456`

Or via wrangler if using config file, add to `ingress`:
```yaml
- hostname: world.example.com
  service: http://localhost:3456
```

## Claude.ai setup

1. Go to Claude.ai → Settings → Integrations → Add MCP
2. URL: `https://world.example.com/mcp`
3. Click Connect → OAuth flow auto-approves → enter API_KEY when prompted

## Verify

```bash
curl https://world.example.com/health
# {"status":"ok","service":"world-tools-mcp",...}
```
