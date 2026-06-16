/**
 * PKCE (Proof Key for Code Exchange) — RFC 7636
 *
 * PKCE prevents authorization code interception attacks in public clients.
 * This implementation uses the S256 code challenge method (SHA-256).
 *
 * Flow:
 *   1. Generate a random code_verifier (43-128 chars, URL-safe)
 *   2. Compute code_challenge = BASE64URL(SHA256(code_verifier))
 *   3. Send code_challenge + code_challenge_method=S256 in the authorization request
 *   4. Store code_verifier securely (httpOnly cookie, server-side session)
 *   5. Send code_verifier with the token exchange request
 *   6. Authorization server verifies: SHA256(code_verifier) === code_challenge
 *
 * Uses the Web Crypto API (available in Node.js 18+ and all modern browsers).
 */

/** Character set for code verifier per RFC 7636 §4.1 */
const PKCE_CHARSET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";

/**
 * Generate a cryptographically random code verifier.
 * Length: 64 characters (well within RFC 7636's 43-128 range).
 */
export function generateCodeVerifier(): string {
  const array = new Uint8Array(64);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((byte) => PKCE_CHARSET[byte % PKCE_CHARSET.length])
    .join("");
}

/**
 * Compute the S256 code challenge from a code verifier.
 * code_challenge = BASE64URL(SHA-256(ASCII(code_verifier)))
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(new Uint8Array(digest));
}

/**
 * Generate a cryptographically random state parameter.
 * Used to prevent CSRF attacks in the OAuth flow.
 */
export function generateState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

/**
 * Generate a cryptographically random nonce for the OIDC request.
 */
export function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

// ---------------------------------------------------------------------------
// Helper: Base64URL encoding (RFC 4648 §5, no padding)
// ---------------------------------------------------------------------------

function base64UrlEncode(input: Uint8Array): string {
  const bytes = Array.from(input);
  const base64 = btoa(String.fromCharCode(...bytes));
  // Convert Base64 to Base64URL: replace +→-, /→_, strip =
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
