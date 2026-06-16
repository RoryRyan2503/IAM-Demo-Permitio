import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a price in cents to a display string.
 * e.g. formatCurrency(589900) → "$5,899.00"
 */
export function formatCurrency(
  amountInCents: number,
  currency = "USD"
): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amountInCents / 100);
}

// ---------------------------------------------------------------------------
// Sales Org Utilities
// ---------------------------------------------------------------------------

/** Sales org division → color mapping */
const SALES_ORG_COLORS: Record<string, { hex: string; label: string; bg: string; text: string; border: string }> = {
  BA: { hex: "#dc2626", label: "Building Automation", bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  PT: { hex: "#16a34a", label: "Process Technology", bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
  PA: { hex: "#2563eb", label: "Process Automation", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  IA: { hex: "#ca8a04", label: "Industrial Automation", bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200" },
};

/** Get sales org color config by ID (e.g. "BA01" → BA colors) */
export function getSalesOrgStyle(salesOrgId: string) {
  const prefix = salesOrgId.replace(/[0-9]/g, "");
  return SALES_ORG_COLORS[prefix] ?? { hex: "#6b7280", label: salesOrgId, bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200" };
}

/** Get the hex color for a sales org */
export function getSalesOrgColor(salesOrgId: string): string {
  return getSalesOrgStyle(salesOrgId).hex;
}

/** Get readable division name from sales org ID */
export function getSalesOrgDivision(salesOrgId: string): string {
  return getSalesOrgStyle(salesOrgId).label;
}

// ---------------------------------------------------------------------------
// Product Utilities
// ---------------------------------------------------------------------------

/** Category → accent color mapping for product cards */
const CATEGORY_COLORS: Record<string, string> = {
  "Fire Panels": "#ef4444",
  "Fire Detection": "#f97316",
  "Fire Suppression": "#dc2626",
  Controllers: "#3b82f6",
  Sensors: "#10b981",
  "Gas Detection": "#8b5cf6",
  Software: "#6366f1",
  Valves: "#0ea5e9",
  Transmitters: "#14b8a6",
  Actuators: "#f59e0b",
  DCS: "#6366f1",
  Analytics: "#8b5cf6",
};

export function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? "#6b7280";
}

/** Map a product type from its category */
export function getProductType(
  category: string
): "Hardware" | "Software" | "Service" | "Standard" {
  if (category.toLowerCase().includes("software")) return "Software";
  if (category.toLowerCase().includes("analytics")) return "Software";
  if (category.toLowerCase().includes("service")) return "Service";
  return "Hardware";
}
