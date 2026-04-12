import express from "express";
import type { Request, Response, NextFunction } from "express";
import cors from "cors";
import { createServer as createHttpServer } from "http";
import { randomUUID } from "crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { mcpAuthRouter } from "@modelcontextprotocol/sdk/server/auth/router.js";
import { requireBearerAuth } from "@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js";
import { SingleUserOAuthProvider } from "./oauth-provider.js";
import { registerTools } from "./tools.js";

// ── Config from env ───────────────────────────────────────────────────────────

const port = parseInt(process.env.PORT ?? "3456", 10);
const apiKey = process.env.API_KEY ?? "";
const publicUrl = process.env.PUBLIC_URL ?? "https://world.example.com";

// Location config -- must be set in .env on each deployment.
// No sensible default: wrong coordinates = wrong city's weather.
const defaultLat = parseFloat(process.env.WEATHER_LAT ?? "");
const defaultLon = parseFloat(process.env.WEATHER_LON ?? "");

if (!apiKey) {
  console.error("[startup] API_KEY env var is required");
  process.exit(1);
}
if (isNaN(defaultLat) || isNaN(defaultLon)) {
  console.error("[startup] WEATHER_LAT and WEATHER_LON env vars are required (decimal degrees)");
  process.exit(1);
}

console.log("[startup] world-tools-mcp starting");
console.log(`  port       : ${port}`);
console.log(`  public_url : ${publicUrl}`);
console.log(`  weather    : configured`);

// ── OAuth ─────────────────────────────────────────────────────────────────────

const issuerUrl = new URL(publicUrl);
const resourceServerUrl = new URL(`${publicUrl}/mcp`);
const resourceMetadataUrl = `${publicUrl}/.well-known/oauth-protected-resource/mcp`;
const oauthProvider = new SingleUserOAuthProvider(apiKey);

// ── MCP server factory ────────────────────────────────────────────────────────

function makeMcpServer(): McpServer {
  const server = new McpServer({ name: "world-tools", version: "1.0.0" });
  registerTools(server, defaultLat, defaultLon);
  return server;
}

// ── Express ───────────────────────────────────────────────────────────────────

const app = express();
app.set("trust proxy", 1);

app.use(cors({
  origin: ["https://claude.ai", publicUrl],
  credentials: true,
}));

app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  next();
});

app.use(express.json({ limit: "1mb" }));

app.use((err: Error & { type?: string; status?: number }, _req: Request, res: Response, next: NextFunction) => {
  if (err.type === "entity.too.large") {
    res.status(413).json({ jsonrpc: "2.0", error: { code: -32700, message: "Payload too large" }, id: null });
    return;
  }
  if (err instanceof SyntaxError && err.status === 400) {
    res.status(400).json({ jsonrpc: "2.0", error: { code: -32700, message: "Parse error" }, id: null });
    return;
  }
  next(err);
});

app.use(mcpAuthRouter({ provider: oauthProvider, issuerUrl, resourceServerUrl }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "world-tools-mcp", timestamp: new Date().toISOString() });
});

app.use("/mcp", requireBearerAuth({ verifier: oauthProvider, resourceMetadataUrl }));

// ── Session registry ──────────────────────────────────────────────────────────

const transports = new Map<string, StreamableHTTPServerTransport>();

const mcpHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;

    if (sessionId && transports.has(sessionId)) {
      await transports.get(sessionId)!.handleRequest(req, res, req.body);
      return;
    }

    if (req.method === "POST" && isInitializeRequest(req.body)) {
      const reuseId = sessionId ?? null;
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: reuseId ? () => reuseId : () => randomUUID(),
        onsessioninitialized: (sid) => {
          transports.set(sid, transport);
          console.error(`[mcp] Session ${reuseId ? "re-registered" : "initialized"}: ${sid}`);
        },
      });
      transport.onclose = () => {
        const sid = transport.sessionId;
        if (sid) transports.delete(sid);
      };
      await makeMcpServer().connect(transport);
      await transport.handleRequest(req, res, req.body);
      return;
    }

    res.status(404).json({
      jsonrpc: "2.0",
      error: { code: -32001, message: "Session not found: please re-initialize" },
      id: null,
    });
  } catch (err) {
    console.error("[mcp] Handler error:", err);
    if (!res.headersSent) {
      res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "Internal error" }, id: null });
    }
  }
};

app.post("/mcp", mcpHandler);
app.get("/mcp", mcpHandler);
app.delete("/mcp", mcpHandler);

// ── Start ─────────────────────────────────────────────────────────────────────

const httpServer = createHttpServer(app);
httpServer.setTimeout(30_000);
httpServer.on("clientError", (_err, socket) => socket.destroy());
httpServer.listen(port, "127.0.0.1", () => {
  console.log(`[startup] listening on 127.0.0.1:${port}`);
});

const shutdown = (signal: string) => {
  console.log(`[process] ${signal} — shutting down`);
  httpServer.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 5_000).unref();
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("uncaughtException", (err) => console.error("[process] Uncaught:", err));
process.on("unhandledRejection", (r) => console.error("[process] Unhandled rejection:", r));
