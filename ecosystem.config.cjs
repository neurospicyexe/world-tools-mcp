/**
 * pm2 ecosystem config for world-tools-mcp
 * VPS deployment (the VPS 6GB)
 *
 * Usage:
 *   pm2 start ecosystem.config.js        # first-time start
 *   pm2 reload ecosystem.config.js       # rolling restart (scoped to this file only)
 */

require("dotenv").config({ path: "/home/nullsafe/world-tools-mcp/.env" });

module.exports = {
  apps: [
    {
      name: "world-tools",
      cwd: "/home/nullsafe/world-tools-mcp",
      script: "dist/index.js",
      interpreter: "node",
      autorestart: true,
      restart_delay: 5000,
      exp_backoff_restart_delay: 100,
      max_restarts: 15,
      min_uptime: "10s",
      kill_timeout: 8000,
      error_file: "/home/nullsafe/.pm2/logs/world-tools-error.log",
      out_file: "/home/nullsafe/.pm2/logs/world-tools-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      env: {
        NODE_ENV: "production",
        NODE_OPTIONS: "--dns-result-order=ipv4first",
        PORT: process.env.PORT ?? "3456",
        API_KEY: process.env.API_KEY,
        PUBLIC_URL: process.env.PUBLIC_URL ?? "https://world.example.com",
        WEATHER_LAT: process.env.WEATHER_LAT,
        WEATHER_LON: process.env.WEATHER_LON,
      },
    },
  ],
};
