// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

vi.mock("@/context/AccountContext", () => ({
  useAccountContext: () => ({
    selectedAccount: { accountId: "001ACC001", accountName: "Honeywell International" },
  }),
}));
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ user: { persona: "general" } }),
}));
vi.mock("@/hooks/useRouteGuard", () => ({ useRouteGuard: () => {} }));
vi.mock("@/components/permissions/PermissionGate", () => ({
  PermissionGate: ({ fallback }: any) => <>{fallback}</>,
}));
vi.mock("@/components/permissions/AccessDenied", () => ({
  AccessDenied: ({ message }: any) => <div role="alert">{message}</div>,
}));

import QuotesPage from "@/app/(portal)/quotes/page";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Quotes page — Supabase-backed loading/empty/error states", () => {
  it("shows a loading state before data arrives", async () => {
    let resolveFetch: (v: unknown) => void;
    const pending = new Promise((resolve) => (resolveFetch = resolve));
    vi.stubGlobal("fetch", vi.fn(() => pending));

    render(<QuotesPage />);
    expect(document.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);

    resolveFetch!({ ok: true, json: async () => ({ data: [] }) });
  });

  it("shows an empty state when Supabase returns zero quotes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [] }) })
    );

    render(<QuotesPage />);
    await waitFor(() => expect(screen.getByText(/no quotes found/i)).toBeInTheDocument());
  });

  it("shows an error state when the API call fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: "Failed to fetch quotes" }) })
    );

    render(<QuotesPage />);
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Failed to fetch quotes"));
  });
});
