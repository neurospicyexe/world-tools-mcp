/**
 * pm2 ecosystem config for world-tools-mcp
 * VPS deployment (persistent host)
 *
 * Usage:
 *   pm2 start ecosystem.config.cjs        # first-time start
 *   pm2 reload ecosystem.config.cjs       # rolling restart (scoped to this file only)
 */

const fs = require("fs");

// Parse .env manually -- pm2 runs this file in its own global context,
// not the project's node_modules, so require('dotenv') would fail.
const env = {};
try {
  const lines = fs.readFileSync("/home/nullsafe/world-tools-mcp/.env", "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (key) env[key] = val;
  }
} catch (e) {
  console.error("[ecosystem] failed to load .env:", e.message);
}

module.exports = {
  apps: [
    {
      name: "world-tools",
      cwd: "/home/nullsafe/world-tools-mcp",
      script: "dist/index.js",
      interpreter: "node",
      autorestart: true,
      restart_delay: 10000,
      max_restarts: 10,
      min_uptime: "15s",
      kill_timeout: 8000,
      error_file: "/home/nullsafe/.pm2/logs/world-tools-error.log",
      out_file: "/home/nullsafe/.pm2/logs/world-tools-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      env: {
        NODE_ENV:    "production",
        NODE_OPTIONS: "--dns-result-order=ipv4first",
        PORT:        env.PORT        ?? "3456",
        API_KEY:     env.API_KEY,
        PUBLIC_URL:  env.PUBLIC_URL  ?? "http://localhost:3456",
        WEATHER_LAT: env.WEATHER_LAT,
        WEATHER_LON: env.WEATHER_LON,
      },
    },
  ],
};
