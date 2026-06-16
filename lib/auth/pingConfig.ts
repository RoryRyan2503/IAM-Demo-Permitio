/**
 * Ping Identity OIDC Configuration
 *
 * Ping uses standard OpenID Connect with PKCE (S256).
 * Configure your PingOne environment in .env.local.
 *
 * Authorization flow:
 *   1. Frontend calls /api/auth/login
 *   2. Server generates PKCE pair + state, stores verifier in httpOnly cookie
 *   3. Server redirects browser to Ping authorization endpoint
 *   4. Ping authenticates user and redirects to /api/auth/callback
 *   5. Server exchanges code + verifier for tokens
 *   6. Server sets session cookie and redirects to /dashboard
 */

export const pingConfig = {
  /** OIDC Issuer — also the base URL for discovery document */
  issuer: process.env.PING_ISSUER ?? "",

  /** OAuth2 Client ID */
  clientId: process.env.PING_CLIENT_ID ?? "",

  /** OAuth2 Client Secret (for server-side token exchange) */
  clientSecret: process.env.PING_CLIENT_SECRET ?? "",

  /** Registered redirect URI — must match PingOne Application setting exactly */
  redirectUri:
    process.env.PING_REDIRECT_URI ??
    `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,

  /** Space-separated OIDC scopes */
  scopes: (process.env.PING_SCOPES ?? "openid profile email").split(" "),

  /** Derived: OIDC Authorization endpoint */
  get authorizationEndpoint() {
    return `${this.issuer}/authorize`;
  },

  /** Derived: OIDC Token endpoint */
  get tokenEndpoint() {
    return `${this.issuer}/token`;
  },

  /** Derived: OIDC End Session (logout) endpoint */
  get endSessionEndpoint() {
    return `${this.issuer}/signoff`;
  },

  /** Derived: OIDC JWKS endpoint (for token verification) */
  get jwksUri() {
    return `${this.issuer}/jwks`;
  },
} as const;

/** Force demo mode regardless of Ping credentials when DEMO_MODE=true */
if (process.env.DEMO_MODE === "true") {
  // ensure all Ping checks short-circuit
}

/** Placeholder values written into .env.local for demo mode */
const DEMO_PLACEHOLDERS = [
  "DEMO_ENV_ID",
  "demo-client-id",
  "demo-client-secret",
];

/**
 * Validate that required env vars are present AND contain real (non-demo) values.
 * Returns false → demo mode.
 * Returns true  → real Ping Identity OIDC flow.
 */
export function validatePingConfig(): boolean {
  // Explicit demo mode override — bypass Ping entirely
  if (process.env.DEMO_MODE === "true") return false;

  const required = ["PING_ISSUER", "PING_CLIENT_ID", "PING_REDIRECT_URI"];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[Ping] Missing environment variables: ${missing.join(", ")}. ` +
          "Authentication will use demo mode."
      );
    }
    return false;
  }

  // Check if any value still contains a demo placeholder
  const hasPlaceholder = DEMO_PLACEHOLDERS.some((placeholder) =>
    Object.values({
      issuer: process.env.PING_ISSUER,
      clientId: process.env.PING_CLIENT_ID,
      clientSecret: process.env.PING_CLIENT_SECRET,
    }).some((v) => v?.includes(placeholder))
  );

  if (hasPlaceholder) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[Ping] Demo placeholder values detected. Using demo mode.");
    }
    return false;
  }

  return true;
}
