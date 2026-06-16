/**
 * OIDC Callback Loading Page
 *
 * Displayed briefly while /api/auth/callback processes the token exchange.
 * The actual redirect happens server-side in the route handler.
 */

export default function CallbackPage() {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-4">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      <p className="text-slate-400 text-sm">Completing sign in…</p>
    </div>
  );
}
