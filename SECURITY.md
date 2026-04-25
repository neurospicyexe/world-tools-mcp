# Security — world-tools-mcp

A stateless tool server — it fetches time, weather, and moon data and returns it. No database, no companion data, no credentials stored beyond what's needed to call external APIs.

## Honest disclosure

This project was built with AI assistance ("vibe-coded"). Security hardening has been applied to the best of our ability — API key auth, HTTPS via Cloudflare Tunnel, no data persistence — but this software comes with **no warranty and no liability**. It has not undergone a professional security audit. If you use it, you use it at your own risk.

## Reporting a Vulnerability

If you find a security vulnerability, please report it privately before public disclosure. Open a GitHub security advisory on this repository or contact the maintainer directly.

---

## What's Protected Here

This service is low-risk compared to the rest of the system. It holds no companion memories. The main concern is availability (if it's compromised and taken down, companions lose time/weather/moon tools) and any weather API credentials.

---

## Secrets Used by This Service

| Secret | Where | Risk if leaked |
|--------|-------|---------------|
| Weather API key (if used) | `~/world-tools-mcp/.env` on VPS | API credit usage |

No Halseth credentials. No companion data. This service only calls out to public/weather APIs and returns results.

---

## VPS Exposure

The service runs on a local port and is exposed only through a Cloudflare Tunnel (HTTPS). It is not directly reachable from the internet without the tunnel.

Because it's stateless and holds no sensitive data, the blast radius of a compromise here is minimal — the worst case is service disruption, not data loss.
