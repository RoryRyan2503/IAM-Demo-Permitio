import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await getSession();
  if (session) {
    redirect("/home");
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white">
      {/* ─── Top Nav ──────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-[#0D0D0D]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-[#C8102E]">
              <HoneywellHexIcon />
            </div>
            <span className="text-[15px] font-semibold tracking-tight">
              Honeywell <span className="text-[#C8102E]">B2B</span> Portal
            </span>
          </div>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-8 text-sm text-white/60">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How it Works</a>
            <a href="#personas" className="hover:text-white transition-colors">Demo Roles</a>
          </nav>

          {/* CTA */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-md px-4 py-2 text-sm font-medium text-white/70 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/api/auth/login?persona=admin"
              className="rounded-md bg-[#C8102E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#a00e24] transition-colors"
            >
              Try Demo
            </Link>
          </div>
        </div>
      </header>

      {/* ─── Hero ─────────────────────────────────────────────────── */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden pt-16">
        {/* Background grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
        {/* Red glow */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-[#C8102E]/5 blur-[120px] pointer-events-none" />

        <div className="relative mx-auto max-w-5xl px-6 text-center">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#C8102E]/30 bg-[#C8102E]/10 px-4 py-1.5 text-xs font-medium text-[#E87080]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#C8102E] animate-pulse" />
            Unified Authorization Fabric — Demo Platform
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
            Enterprise IAM
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#C8102E] via-[#e84060] to-[#C8102E]">
              made visible.
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-lg text-white/50 mb-10 leading-relaxed">
            A production-grade demonstration of fine-grained authorization for Honeywell&apos;s
            B2B commerce portal — RBAC, ABAC, ReBAC, tool-based entitlements,
            multi-account sold-to management, and sales organization context.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/api/auth/login?persona=admin"
              className="group inline-flex items-center gap-2 rounded-lg bg-[#C8102E] px-6 py-3 text-sm font-semibold text-white hover:bg-[#a00e24] transition-all hover:shadow-[0_0_30px_rgba(200,16,46,0.4)]"
            >
              Launch Demo
              <ArrowRightIcon className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-6 py-3 text-sm font-medium text-white/70 hover:border-white/40 hover:text-white transition-colors"
            >
              Sign In
            </Link>
          </div>

          {/* Stats row */}
          <div className="mt-16 grid grid-cols-3 gap-8 max-w-xl mx-auto">
            {[
              { value: "3", label: "Auth Providers" },
              { value: "4", label: "Tool Entitlements" },
              { value: "22", label: "API Routes" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-3xl font-bold text-white">{s.value}</p>
                <p className="text-xs text-white/40 mt-1 uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features ─────────────────────────────────────────────── */}
      <section id="features" className="py-24 border-t border-white/5">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Platform Capabilities</h2>
            <p className="text-white/40 max-w-xl mx-auto">
              Every layer of the Honeywell Unified Authorization Fabric, fully demonstrable.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group relative rounded-xl border border-white/8 bg-white/3 p-6 hover:border-[#C8102E]/40 hover:bg-white/5 transition-all duration-300"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[#C8102E]/10 text-[#C8102E] group-hover:bg-[#C8102E]/20 transition-colors">
                  {f.icon}
                </div>
                <h3 className="text-sm font-semibold mb-2">{f.title}</h3>
                <p className="text-xs text-white/40 leading-relaxed">{f.description}</p>
                {f.badge && (
                  <span className="mt-3 inline-block rounded-full bg-[#C8102E]/10 px-2 py-0.5 text-[10px] font-mono text-[#E87080]">
                    {f.badge}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How it works ─────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 border-t border-white/5 bg-white/[0.015]">
        <div className="mx-auto max-w-5xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Authorization Flow</h2>
            <p className="text-white/40 max-w-lg mx-auto">
              Three-layer pipeline: identity → CRM business context → policy decision.
            </p>
          </div>

          <div className="relative">
            {/* Connector line */}
            <div className="absolute top-10 left-0 right-0 hidden md:block">
              <div className="mx-auto max-w-3xl h-px bg-gradient-to-r from-transparent via-[#C8102E]/40 to-transparent" />
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {FLOW_STEPS.map((step, i) => (
                <div key={step.title} className="relative text-center">
                  <div className="mx-auto mb-4 flex h-20 w-20 flex-col items-center justify-center rounded-2xl border border-[#C8102E]/30 bg-[#C8102E]/5">
                    <span className="text-[10px] text-[#C8102E]/60 font-mono mb-1">0{i + 1}</span>
                    {step.icon}
                  </div>
                  <h3 className="text-sm font-semibold mb-2">{step.title}</h3>
                  <p className="text-xs text-white/35 leading-relaxed">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Demo Personas ────────────────────────────────────────── */}
      <section id="personas" className="py-24 border-t border-white/5">
        <div className="mx-auto max-w-5xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Try a Demo Role</h2>
            <p className="text-white/40 max-w-lg mx-auto">
              Each persona has different tool entitlements — proving authorization works at every layer.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {PERSONAS.map((p) => (
              <a
                key={p.id}
                href={`/api/auth/login?persona=${p.id}`}
                className="group relative rounded-xl border border-white/8 bg-white/3 p-6 hover:border-[#C8102E]/50 hover:bg-white/5 transition-all duration-300 block cursor-pointer"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#C8102E]/10 text-sm font-bold text-[#C8102E]">
                    {p.initials}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">{p.name}</h3>
                    <p className="text-xs text-white/40 mt-0.5">{p.role}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {p.tools.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] font-mono text-white/50"
                    >
                      {t}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-white/30 leading-relaxed">{p.description}</p>
                <div className="mt-4 flex items-center gap-1 text-xs text-[#C8102E]/60 group-hover:text-[#C8102E] transition-colors">
                  Sign in as {p.name.split(" ")[0]}
                  <ArrowRightIcon className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Footer ───────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-10">
        <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-[#C8102E]">
              <HoneywellHexIcon size={14} />
            </div>
            <span className="text-sm text-white/40">
              Honeywell B2B Portal — IAM Demo Platform
            </span>
          </div>
          <p className="text-xs text-white/25">
            Built with Next.js 14 · Ping Identity · Permit.io · Tailwind CSS
          </p>
        </div>
      </footer>
    </div>
  );
}

// ─── Data ──────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    title: "Multi-Provider Authentication",
    description: "Ping Identity OIDC/PKCE, Okta, or demo sessions. JWT-based identity with session cookies.",
    badge: "TL: Identity",
    icon: <KeyIcon />,
  },
  {
    title: "Tool-Based ReBAC",
    description: "TL001/TL003/TL004/TL009 — access follows tool grants from CRM, not flat roles.",
    badge: "TL001 → eCommerce",
    icon: <ToolIcon />,
  },
  {
    title: "Customer & Sold-To Management",
    description: "Switch between multiple sold-to entities. Permissions re-evaluate per account.",
    badge: "Multi-Account",
    icon: <BuildingIcon />,
  },
  {
    title: "Sales Organization Context",
    description: "Each account has sales areas with currency, division, and distribution channel.",
    badge: "ABAC",
    icon: <GlobeIcon />,
  },
  {
    title: "Dynamic Permission Map",
    description: "Live permission map refreshes on account switch. Every API route enforces independently.",
    badge: "FAIL CLOSED",
    icon: <ShieldIcon />,
  },
  {
    title: "Data Filtering by Sales Org",
    description: "Products, orders, and quotes are scoped to allowed sales organizations per session.",
    badge: "Fine-Grained",
    icon: <FilterIcon />,
  },
];

const FLOW_STEPS = [
  {
    title: "Identity (Ping Identity)",
    description: "JWT validated on every request. Sub claim maps to CRM user record.",
    icon: <UserIcon />,
  },
  {
    title: "CRM Context",
    description: "Tool grants, sold-to accounts, and sales areas fetched from CRM after auth.",
    icon: <DatabaseIcon />,
  },
  {
    title: "Policy Decision",
    description: "canAccess() evaluates tool IDs + context. Permit.io or local ReBAC fallback.",
    icon: <CheckShieldIcon />,
  },
];

const PERSONAS = [
  {
    id: "admin",
    initials: "MP",
    name: "Miguel Patel",
    role: "Admin · Partner",
    tools: ["TL001", "TL003", "TL004", "TL009"],
    description: "Full access — all tools, two accounts (BlueRock + Prime), eCommerce + invoices.",
  },
  {
    id: "buyer",
    initials: "CJ",
    name: "Carlos Johnson",
    role: "Partner · Buyer",
    tools: ["TL003", "TL004"],
    description: "Order Status and Customer Support only. Cannot access eCommerce or cart.",
  },
  {
    id: "viewer",
    initials: "SC",
    name: "Sarah Chen",
    role: "Customer · Viewer",
    tools: ["TL009"],
    description: "Invoices only. No products, no orders, no cart — limited read-only access.",
  },
];

// ─── Icons ─────────────────────────────────────────────────────────────────

function HoneywellHexIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L21.5 7.5V16.5L12 22L2.5 16.5V7.5L12 2Z" fillRule="evenodd" />
    </svg>
  );
}

function ArrowRightIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function KeyIcon() {
  return <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

function ToolIcon() {
  return <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

function BuildingIcon() {
  return <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M3 21h18M3 7v14M21 7v14M6 3h12l3 4H3l3-4zM9 21V11h6v10" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

function GlobeIcon() {
  return <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

function ShieldIcon() {
  return <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

function FilterIcon() {
  return <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

function UserIcon() {
  return <svg className="h-6 w-6 text-[#C8102E]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

function DatabaseIcon() {
  return <svg className="h-6 w-6 text-[#C8102E]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

function CheckShieldIcon() {
  return <svg className="h-6 w-6 text-[#C8102E]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round"/><path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

