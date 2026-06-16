"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePermission } from "@/hooks/usePermission";
import { useAuth } from "@/context/AuthContext";
import { useAccountContext } from "@/context/AccountContext";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  action?: string;
  resource?: string;
  adminOnly?: boolean;
  toolId?: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/home",      label: "Home",              icon: <HomeIcon /> },
  { href: "/dashboard", label: "Account Dashboard",  icon: <DashIcon /> },
  { href: "/products",  label: "Products",           icon: <CubeIcon />,      action: "view", resource: "products", toolId: "TL001" },
  { href: "/orders",    label: "Orders",             icon: <ClipIcon />,      action: "view", resource: "orders",   toolId: "TL003" },
  { href: "/quotes",    label: "Invoices",           icon: <DocIcon />,       action: "view", resource: "quotes",   toolId: "TL009" },
  { href: "/cart",      label: "Cart",               icon: <CartIcon />,      action: "view", resource: "cart",     toolId: "TL001" },
  { href: "/admin",     label: "Admin",              icon: <ShieldIcon />,    adminOnly: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { selectedAccount, userContext } = useAccountContext();
  const activeSalesArea = userContext?.activeSalesArea;
  const approvedToolIds = userContext?.approvedToolIds ?? [];

  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col bg-[#111111] border-r border-white/8">
      {/* ── Logo ─────────────────────────────────────── */}
      <div className="flex h-16 items-center gap-3 px-5 border-b border-white/8">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#C8102E]">
          <HexIcon />
        </div>
        <div className="leading-none">
          <p className="text-[13px] font-semibold text-white">Honeywell</p>
          <p className="text-[10px] text-white/35 mt-0.5">B2B Portal</p>
        </div>
      </div>

      {/* ── Navigation ───────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        <p className="px-2 mb-2 text-[10px] font-medium text-white/25 uppercase tracking-widest">
          Navigation
        </p>
        {NAV_ITEMS.map((item) => (
          <SidebarItem
            key={item.href}
            item={item}
            isActive={pathname === item.href || pathname.startsWith(item.href + "/")}
            userRole={user?.role}
            approvedToolIds={approvedToolIds}
          />
        ))}
      </nav>

      {/* ── Account context ───────────────────────────── */}
      {selectedAccount && (
        <div className="border-t border-white/8 px-4 py-3">
          <p className="text-[10px] font-medium text-white/25 uppercase tracking-widest mb-2">
            Active Account
          </p>
          <div className="rounded-lg bg-white/4 border border-white/6 px-3 py-2.5">
            <p className="text-xs font-semibold text-white leading-none truncate">
              {selectedAccount.accountName}
            </p>
            <p className="text-[10px] text-white/35 mt-1 font-mono truncate">
              {selectedAccount.accountId}
            </p>

          </div>
        </div>
      )}

      {/* ── User strip ────────────────────────────────── */}
      {user && (
        <div className="border-t border-white/8 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#C8102E]/15 text-[11px] font-bold text-[#C8102E]">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-white truncate">{user.name}</p>
              <p className="text-[10px] text-white/35 capitalize mt-0.5">{user.role} · {(user as any).userType ?? user.persona}</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

// ── Sidebar Item ──────────────────────────────────────────────────────────

function SidebarItem({
  item,
  isActive,
  userRole,
  approvedToolIds,
}: {
  item: NavItem;
  isActive: boolean;
  userRole?: string;
  approvedToolIds: string[];
}) {
  const hasPermission = usePermission(item.action ?? "view", item.resource ?? "_any");

  if (item.adminOnly && userRole !== "admin") return null;
  if (item.action && item.resource && !hasPermission) return null;

  return (
    <Link
      href={item.href}
      className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150 ${
        isActive
          ? "bg-[#C8102E] text-white shadow-sm"
          : "text-white/50 hover:bg-white/6 hover:text-white/90"
      }`}
    >
      <span className={`shrink-0 ${isActive ? "text-white" : "text-white/35 group-hover:text-white/60"}`}>
        {item.icon}
      </span>
      <span className="flex-1 truncate">{item.label}</span>
      {item.toolId && !isActive && (
        <span className="text-[9px] font-mono text-white/20 group-hover:text-white/30">
          {item.toolId}
        </span>
      )}
    </Link>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────

function HexIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-white">
      <path d="M12 2L21.5 7.5V16.5L12 22L2.5 16.5V7.5L12 2Z" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
    </svg>
  );
}

function DashIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
      <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
    </svg>
  );
}

function CubeIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path d="M11 17a1 1 0 001.447.894l4-2A1 1 0 0017 15V9.236a1 1 0 00-1.447-.894l-4 2a1 1 0 00-.553.894V17zM15.211 6.276a1 1 0 000-1.788l-4.764-2.382a1 1 0 00-.894 0L4.789 4.488a1 1 0 000 1.788l4.764 2.382a1 1 0 00.894 0l4.764-2.382zM4.447 8.342A1 1 0 003 9.236V15a1 1 0 00.553.894l4 2A1 1 0 009 17v-5.764a1 1 0 00-.553-.894l-4-2z" />
    </svg>
  );
}

function ClipIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
      <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
    </svg>
  );
}

function DocIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3z" />
      <path d="M16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
  );
}

