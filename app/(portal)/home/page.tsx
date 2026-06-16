"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useAccountContext } from "@/context/AccountContext";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Package,
  ShoppingCart,
  ClipboardList,
  FileText,
  ArrowRight,
  TrendingUp,
  Shield,
  Zap,
} from "lucide-react";

export default function HomePage() {
  const { user } = useAuth();
  const { selectedAccount } = useAccountContext();
  const firstName = user?.name?.split(" ")[0] ?? "there";

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* ── Hero Banner ─────────────────────────────── */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] p-8 md:p-12 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDE4YzMuMzE0IDAgNi0yLjY4NiA2LTZzLTIuNjg2LTYtNi02LTYgMi42ODYtNiA2IDIuNjg2IDYgNiA2em0wIDM2YzMuMzE0IDAgNi0yLjY4NiA2LTZzLTIuNjg2LTYtNi02LTYgMi42ODYtNiA2IDIuNjg2IDYgNiA2eiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <div className="relative z-10">
          <Badge className="bg-[#C8102E] text-white border-0 mb-4">
            B2B Commerce Portal
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            Welcome back, {firstName}
          </h1>
          <p className="text-white/70 text-lg max-w-xl mb-6">
            Manage your procurement, explore products, and track orders — all from
            one unified platform.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/products">
              <Button size="lg" className="bg-[#C8102E] hover:bg-[#a00e24] text-white border-0">
                <Package className="mr-2 h-4 w-4" />
                Browse Catalog
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button size="lg" variant="outline" className="border-white/20 text-black hover:bg-white/10 hover:text-white">
                View Account Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
        {/* Decorative shapes */}
        <div className="absolute -right-8 -top-8 h-48 w-48 rounded-full bg-[#C8102E]/10 blur-3xl" />
        <div className="absolute -left-12 -bottom-12 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl" />
      </div>

      {/* ── Quick Stats ─────────────────────────────── */}
      {selectedAccount && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Active Account"
            value={selectedAccount.accountName}
            sub={selectedAccount.accountId}
            icon={<Shield className="h-5 w-5" />}
            color="red"
          />
          <StatCard
            label="Account Type"
            value={selectedAccount.accountType ?? "Standard"}
            sub="Classification"
            icon={<Zap className="h-5 w-5" />}
            color="blue"
          />
          <StatCard
            label="Sales Organizations"
            value={String(selectedAccount.salesOrgList?.length ?? 0)}
            sub="Assigned orgs"
            icon={<TrendingUp className="h-5 w-5" />}
            color="green"
          />
          <StatCard
            label="Role"
            value={user?.role ?? "—"}
            sub={user?.persona ?? ""}
            icon={<Shield className="h-5 w-5" />}
            color="amber"
          />
        </div>
      )}

      {/* ── Quick Actions Grid ──────────────────────── */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <PermissionGate action="view" resource="products">
            <QuickAction
              href="/products"
              icon={<Package className="h-6 w-6" />}
              label="Product Catalog"
              description="Browse and search Honeywell products across all divisions"
              color="blue"
            />
          </PermissionGate>

          <PermissionGate action="view" resource="cart">
            <QuickAction
              href="/cart"
              icon={<ShoppingCart className="h-6 w-6" />}
              label="Shopping Cart"
              description="Review items in your cart and proceed to checkout"
              color="amber"
            />
          </PermissionGate>

          <PermissionGate action="view" resource="orders">
            <QuickAction
              href="/orders"
              icon={<ClipboardList className="h-6 w-6" />}
              label="Order History"
              description="Track existing orders and view delivery status"
              color="green"
            />
          </PermissionGate>

          <PermissionGate action="view" resource="quotes">
            <QuickAction
              href="/quotes"
              icon={<FileText className="h-6 w-6" />}
              label="Invoices & Quotes"
              description="Access invoices, quotes, and financial documents"
              color="purple"
            />
          </PermissionGate>
        </div>
      </div>

      {/* ── Division Overview ───────────────────────── */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Honeywell Divisions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <DivisionCard
            prefix="BA"
            name="Building Automation"
            description="HVAC controls, fire safety, and building management systems"
            color="#dc2626"
            productCount="BA01, BA02"
          />
          <DivisionCard
            prefix="PT"
            name="Process Technology"
            description="Transmitters, DCS, safety systems, and process analytics"
            color="#16a34a"
            productCount="PT01, PT02, PT03"
          />
          <DivisionCard
            prefix="PA"
            name="Process Automation"
            description="PLCs, control valves, burners, and gauging solutions"
            color="#2563eb"
            productCount="PA01, PA02"
          />
          <DivisionCard
            prefix="IA"
            name="Industrial Automation"
            description="Mobile computing, scanning, warehousing, and cybersecurity"
            color="#ca8a04"
            productCount="IA01, IA02"
          />
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────────────── */

function StatCard({
  label,
  value,
  sub,
  icon,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  color: "red" | "blue" | "green" | "amber";
}) {
  const styles = {
    red: "bg-red-50 text-red-600 border-red-100",
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    green: "bg-green-50 text-green-600 border-green-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
  };
  const iconStyles = {
    red: "bg-red-100 text-red-600",
    blue: "bg-blue-100 text-blue-600",
    green: "bg-green-100 text-green-600",
    amber: "bg-amber-100 text-amber-600",
  };

  return (
    <div className={`rounded-xl border p-4 ${styles[color]}`}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest opacity-60">{label}</p>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconStyles[color]}`}>
          {icon}
        </div>
      </div>
      <p className="text-lg font-bold text-gray-900 truncate capitalize">{value}</p>
      <p className="text-[11px] text-gray-500 mt-0.5 font-mono truncate">{sub}</p>
    </div>
  );
}

function QuickAction({
  href,
  icon,
  label,
  description,
  color,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  color: "blue" | "green" | "amber" | "purple";
}) {
  const bgColors = {
    blue: "bg-blue-50 group-hover:bg-blue-100",
    green: "bg-green-50 group-hover:bg-green-100",
    amber: "bg-amber-50 group-hover:bg-amber-100",
    purple: "bg-purple-50 group-hover:bg-purple-100",
  };
  const iconColors = {
    blue: "text-blue-600",
    green: "text-green-600",
    amber: "text-amber-600",
    purple: "text-purple-600",
  };

  return (
    <Link
      href={href}
      className="group block rounded-xl border border-gray-200 bg-white p-5 hover:border-gray-300 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
    >
      <div
        className={`inline-flex items-center justify-center h-12 w-12 rounded-xl mb-4 transition-colors ${bgColors[color]}`}
      >
        <span className={iconColors[color]}>{icon}</span>
      </div>
      <h3 className="text-sm font-semibold text-gray-900 mb-1">{label}</h3>
      <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
      <div className="mt-3 flex items-center text-xs font-medium text-gray-400 group-hover:text-gray-600 transition-colors">
        Go to {label.toLowerCase()}
        <ArrowRight className="ml-1 h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
      </div>
    </Link>
  );
}

function DivisionCard({
  prefix,
  name,
  description,
  color,
  productCount,
}: {
  prefix: string;
  name: string;
  description: string;
  color: string;
  productCount: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-3 mb-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg text-white font-bold text-sm"
          style={{ backgroundColor: color }}
        >
          {prefix}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{name}</h3>
          <p className="text-[10px] font-mono text-gray-400">{productCount}</p>
        </div>
      </div>
      <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
    </div>
  );
}
