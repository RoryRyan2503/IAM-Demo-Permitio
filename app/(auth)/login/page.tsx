"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const PERSONAS = [
  {
    id: "admin",
    initials: "MP",
    name: "Miguel Patel",
    email: "admin@demo.com",
    role: "Admin · Partner",
    tools: ["TL001", "TL003", "TL004", "TL009"],
    description: "Full access — eCommerce, Orders, Quotes, Support. Two accounts.",
  },
  {
    id: "buyer",
    initials: "CJ",
    name: "Carlos Johnson",
    email: "buyer@demo.com",
    role: "Partner · Buyer",
    tools: ["TL003", "TL004"],
    description: "Order Status + Support only. Cannot browse catalog or add to cart.",
  },
  {
    id: "viewer",
    initials: "SC",
    name: "Sarah Chen",
    email: "viewer@demo.com",
    role: "Customer · Viewer",
    tools: ["TL009"],
    description: "My Quotes only. No products, orders, or cart.",
  },
] as const;

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#C8102E] border-t-transparent" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const reason = searchParams.get("reason");
  const [loading, setLoading] = useState<string | null>(null);

  const handleDemoLogin = (persona: string) => {
    setLoading(persona);
    window.location.href = `/api/auth/login?persona=${persona}`;
  };

  const handlePingLogin = () => {
    setLoading("ping");
    window.location.href = "/api/auth/login";
  };

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white flex">
      {/* ── Left panel (branding) ── */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 border-r border-white/8">
        {/* Background subtle grid */}
        <div className="absolute inset-0 hon-grid-bg opacity-100" />
        {/* Red radial glow */}
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#C8102E]/8 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#C8102E]">
              <HexIcon />
            </div>
            <span className="text-[15px] font-semibold">
              Honeywell <span className="text-[#C8102E]">B2B</span> Portal
            </span>
          </Link>
        </div>

        <div className="relative">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#C8102E]/30 bg-[#C8102E]/10 px-3 py-1 text-[11px] font-medium text-[#E87080]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#C8102E]" />
            Unified Authorization Fabric
          </div>
          <h2 className="text-4xl font-bold leading-tight mb-4">
            Secure, flexible<br />
            access for every<br />
            <span className="text-[#C8102E]">customer.</span>
          </h2>
          <p className="text-sm text-white/40 leading-relaxed max-w-xs">
            Tool-based entitlements, multi-account sold-to context,
            and sales organization scoping — all in one platform.
          </p>

          <div className="mt-10 grid grid-cols-3 gap-6">
            {[
              { label: "Auth Providers", value: "3" },
              { label: "Tool Grants", value: "4" },
              { label: "API Routes", value: "22" },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-white/35 mt-0.5 uppercase tracking-wide">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-white/20">
          © 2025 Honeywell International. IAM Demo Platform.
        </p>
      </div>

      {/* ── Right panel (sign-in form) ── */}
      <div className="flex flex-1 flex-col items-center justify-center p-6 lg:p-12">
        {/* Mobile logo */}
        <div className="mb-8 flex lg:hidden items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-[#C8102E]">
            <HexIcon size={16} />
          </div>
          <span className="text-sm font-semibold">Honeywell B2B Portal</span>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-2xl font-bold">Sign in</h1>
            <p className="text-sm text-white/40 mt-1">
              Choose your authentication method
            </p>
          </div>

          {/* Error */}
          {(error || reason) && (
            <div className="mb-5 flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              <svg className="h-4 w-4 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
              </svg>
              {reason === "session_expired"
                ? "Your session has expired. Please sign in again."
                : `Authentication error: ${error}`}
            </div>
          )}

          {/* Ping SSO */}
          <button
            onClick={handlePingLogin}
            disabled={!!loading}
            className="w-full flex items-center justify-center gap-3 rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/10 hover:border-white/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-2"
          >
            {loading === "ping" ? <Spinner /> : <PingIcon />}
            Sign in with Ping Identity
          </button>

          <button
            disabled
            className="w-full flex items-center justify-center gap-3 rounded-lg border border-white/8 bg-white/3 px-4 py-2.5 text-sm font-medium text-white/30 cursor-not-allowed mb-6"
          >
            <OktaIcon />
            Sign in with Okta
            <span className="ml-auto text-[10px] text-white/20 font-mono">coming soon</span>
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-white/8" />
            <span className="text-[11px] text-white/30 uppercase tracking-widest">Demo</span>
            <div className="flex-1 h-px bg-white/8" />
          </div>

          {/* Demo personas */}
          <div className="space-y-2.5">
            {PERSONAS.map((p) => (
              <button
                key={p.id}
                onClick={() => handleDemoLogin(p.id)}
                disabled={!!loading}
                className="w-full group flex items-center gap-3.5 rounded-xl border border-white/8 bg-white/3 p-3.5 text-left hover:border-[#C8102E]/40 hover:bg-white/6 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {/* Avatar */}
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#C8102E]/12 text-[13px] font-bold text-[#C8102E]">
                  {loading === p.id ? <Spinner size="sm" /> : p.initials}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium leading-none">{p.name}</span>
                    <span className="text-[10px] text-white/35">{p.role}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {p.tools.map((t) => (
                      <span key={t} className="rounded-full border border-white/10 bg-white/5 px-1.5 py-0.5 text-[9px] font-mono text-white/40">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                <svg className="h-4 w-4 shrink-0 text-white/20 group-hover:text-[#C8102E] transition-colors" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            ))}
          </div>

          <p className="mt-6 text-center text-[11px] text-white/20">
            Demo mode — no real credentials required
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Icons ──────────────────────────────────────────────────────────────────

function HexIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L21.5 7.5V16.5L12 22L2.5 16.5V7.5L12 2Z" />
    </svg>
  );
}

function PingIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="10" opacity=".2" />
      <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function OktaIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" opacity=".4" />
    </svg>
  );
}

function Spinner({ size = "base" }: { size?: "sm" | "base" }) {
  const cls = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  return (
    <div className={`${cls} animate-spin rounded-full border-2 border-current border-t-transparent`} />
  );
}

