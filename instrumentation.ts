/**
 * Next.js Instrumentation — runs once when the server starts.
 *
 * Used here to disable TLS certificate verification in development
 * when behind a corporate HTTPS-intercepting proxy.
 */
export async function register() {
  if (process.env.NODE_ENV !== "production") {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  }
}
