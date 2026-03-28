import { randomUUID, randomBytes } from "crypto";
import type { Response } from "express";
import type { OAuthServerProvider } from "@modelcontextprotocol/sdk/server/auth/provider.js";
import type { OAuthRegisteredClientsStore } from "@modelcontextprotocol/sdk/server/auth/clients.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type { AuthorizationParams } from "@modelcontextprotocol/sdk/server/auth/provider.js";
import type {
  OAuthClientInformationFull,
  OAuthTokens,
} from "@modelcontextprotocol/sdk/shared/auth.js";

interface PendingAuth {
  codeChallenge: string;
  redirectUri: string;
  expiresAt: number;
}

export class SingleUserOAuthProvider implements OAuthServerProvider {
  private clients = new Map<string, OAuthClientInformationFull>();
  private pendingAuths = new Map<string, PendingAuth>();
  private tokenToClientId = new Map<string, string>();

  constructor(private accessToken: string) {}

  get clientsStore(): OAuthRegisteredClientsStore {
    return {
      getClient: (clientId) => this.clients.get(clientId),
      registerClient: (client) => {
        if (this.clients.size >= 50) throw new Error("Client registration limit reached");
        const full: OAuthClientInformationFull = {
          ...client,
          client_id: randomUUID(),
          client_id_issued_at: Math.floor(Date.now() / 1000),
        };
        this.clients.set(full.client_id, full);
        return full;
      },
    };
  }

  async authorize(client: OAuthClientInformationFull, params: AuthorizationParams, res: Response): Promise<void> {
    const registered = client.redirect_uris ?? [];
    if (!registered.includes(params.redirectUri)) {
      res.status(400).json({ error: "invalid_redirect_uri" });
      return;
    }
    const authCode = randomBytes(16).toString("hex");
    this.pendingAuths.set(authCode, {
      codeChallenge: params.codeChallenge,
      redirectUri: params.redirectUri,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });
    const redirectUrl = new URL(params.redirectUri);
    redirectUrl.searchParams.set("code", authCode);
    if (params.state) redirectUrl.searchParams.set("state", params.state);
    res.redirect(redirectUrl.toString());
  }

  async challengeForAuthorizationCode(_client: OAuthClientInformationFull, authorizationCode: string): Promise<string> {
    const pending = this.pendingAuths.get(authorizationCode);
    if (!pending || pending.expiresAt < Date.now()) throw new Error("Invalid or expired authorization code");
    return pending.codeChallenge;
  }

  async exchangeAuthorizationCode(client: OAuthClientInformationFull, authorizationCode: string): Promise<OAuthTokens> {
    const pending = this.pendingAuths.get(authorizationCode);
    if (!pending || pending.expiresAt < Date.now()) throw new Error("Invalid or expired authorization code");
    this.pendingAuths.delete(authorizationCode);
    this.tokenToClientId.set(this.accessToken, client.client_id);
    return { access_token: this.accessToken, token_type: "Bearer", expires_in: 31536000 };
  }

  async exchangeRefreshToken(): Promise<OAuthTokens> {
    throw new Error("Refresh tokens not supported");
  }

  async verifyAccessToken(token: string): Promise<AuthInfo> {
    if (token !== this.accessToken) throw new Error("Invalid access token");
    return {
      token,
      clientId: this.tokenToClientId.get(token) ?? "single-user",
      scopes: [],
      expiresAt: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60,
    };
  }
}
