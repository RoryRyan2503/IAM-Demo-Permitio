// @vitest-environment jsdom
import type { ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import CartPage from "./page";

const context = vi.hoisted(() => ({
  selectedAccount: { accountId: "account-a", accountName: "Account A" },
  selectedCurrency: "USD",
}));
vi.mock("@/context/AccountContext", () => ({ useAccountContext: () => context }));
vi.mock("@/context/AuthContext", () => ({ useAuth: () => ({ hasPermission: () => true }) }));
vi.mock("@/hooks/useRouteGuard", () => ({ useRouteGuard: vi.fn() }));
vi.mock("@/components/permissions/PermissionGate", () => ({
  PermissionGate: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const fetchMock = vi.fn<typeof fetch>();
function cart(name = "Demo switch") {
  return new Response(JSON.stringify({
    data: [{
      id: "SKU-1", product_id: "SKU-1", quantity: 2,
      products: { id: "SKU-1", name, price: null, currency: "USD", sku: "SKU-1", sales_org_id: "1265", category: "Switches" },
    }],
    meta: { total: null, itemCount: 1 },
  }));
}

beforeEach(() => {
  vi.clearAllMocks();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  context.selectedAccount = { accountId: "account-a", accountName: "Account A" };
  fetchMock.mockImplementation(async () => cart());
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("keeps unavailable prices explicit and updates quantity with account/currency context", async () => {
  render(<CartPage />);
  await screen.findByText("Demo switch");
  expect(screen.getAllByText("Price unavailable").length).toBeGreaterThan(0);
  expect(screen.queryByText("$0.00")).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Increase quantity for SKU-1" }));

  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/cart", expect.objectContaining({
    method: "POST",
    headers: expect.objectContaining({ "x-account-id": "account-a", "x-selected-currency": "USD" }),
    body: JSON.stringify({ productId: "SKU-1", quantity: 3 }),
  })));
});

it("does not report a successful clear when the server rejects it", async () => {
  fetchMock.mockImplementation(async (_url, init) => init?.method === "DELETE"
    ? new Response(JSON.stringify({ error: "Clear failed" }), { status: 503 })
    : cart());
  render(<CartPage />);
  await screen.findByText("Demo switch");

  fireEvent.click(screen.getByRole("button", { name: "Clear all" }));

  await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Clear failed"));
  expect(toast.success).not.toHaveBeenCalled();
});

it("ignores an old account's cart response after the selected account changes", async () => {
  let resolve!: (response: Response) => void;
  const pending = new Promise<Response>((done) => { resolve = done; });
  fetchMock.mockReturnValueOnce(pending).mockImplementation(async () => cart("Account B item"));
  const { rerender } = render(<CartPage />);
  context.selectedAccount = { accountId: "account-b", accountName: "Account B" };
  rerender(<CartPage />);
  await screen.findByText("Account B item");

  await act(async () => { resolve(cart("Old account A item")); });

  expect(screen.queryByText("Old account A item")).not.toBeInTheDocument();
  expect(screen.getByText("Account B item")).toBeInTheDocument();
});
