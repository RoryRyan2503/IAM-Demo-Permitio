// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "./AuthContext";
import { AccountProvider, useAccountContext } from "./AccountContext";

const fetchMock = vi.fn<typeof fetch>();
const profile = { id: "test-user", name: "Test User", role: "buyer" };

function permissions(allowed: boolean, accountId = "account-a") {
  return new Response(JSON.stringify({
    user: profile,
    permissions: { "view:products": allowed },
    authEngine: "pingauthorize",
    selectedAccount: { accountId },
  }));
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

function Probe() {
  const auth = useAuth();
  return (
    <>
      <output data-testid="products">{String(auth.hasPermission("view", "products"))}</output>
      <output data-testid="loading">{String(auth.isLoading)}</output>
      <output data-testid="user">{auth.user?.id}</output>
      <output data-testid="error">{auth.permissionError}</output>
      <button onClick={() => void auth.refreshPermissions()}>Refresh</button>
      <button onClick={() => void auth.refreshPermissions("account-b")}>Switch account</button>
    </>
  );
}

function AccountProbe() {
  const account = useAccountContext();
  return <output data-testid="account">{account.selectedAccount?.accountId}</output>;
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("keeps the selected account and deduplicates simultaneous focus/visibility refreshes", async () => {
  const refresh = deferred<Response>();
  fetchMock.mockResolvedValueOnce(permissions(true, "account-b")).mockReturnValueOnce(refresh.promise);
  render(<AuthProvider><Probe /></AuthProvider>);
  await waitFor(() => expect(screen.getByTestId("products")).toHaveTextContent("true"));

  act(() => {
    window.dispatchEvent(new Event("focus"));
    document.dispatchEvent(new Event("visibilitychange"));
  });

  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(fetchMock.mock.calls[1][1]?.headers).toEqual({ "x-account-id": "account-b" });
  await act(async () => { refresh.resolve(permissions(true, "account-b")); });
});

it("keeps last verified permissions on a transient failure but applies a genuine subsequent denial", async () => {
  fetchMock
    .mockResolvedValueOnce(permissions(true))
    .mockResolvedValueOnce(new Response(JSON.stringify({ error: "Authorization unavailable" }), { status: 503 }))
    .mockResolvedValueOnce(permissions(false));
  render(<AuthProvider><Probe /></AuthProvider>);
  await waitFor(() => expect(screen.getByTestId("products")).toHaveTextContent("true"));

  fireEvent.click(screen.getByText("Refresh"));
  await waitFor(() => expect(screen.getByTestId("error")).toHaveTextContent("Authorization unavailable"));
  expect(screen.getByTestId("products")).toHaveTextContent("true");

  fireEvent.click(screen.getByText("Refresh"));
  await waitFor(() => expect(screen.getByTestId("products")).toHaveTextContent("false"));
  expect(screen.getByTestId("error")).toBeEmptyDOMElement();
});

it("does not replace verified grants with a malformed successful response", async () => {
  fetchMock.mockResolvedValueOnce(permissions(true))
    .mockResolvedValueOnce(new Response(JSON.stringify({ user: profile, permissions: {} })));
  render(<AuthProvider><Probe /></AuthProvider>);
  await waitFor(() => expect(screen.getByTestId("products")).toHaveTextContent("true"));

  fireEvent.click(screen.getByText("Refresh"));

  await waitFor(() => expect(screen.getByTestId("error")).toHaveTextContent("invalid response"));
  expect(screen.getByTestId("products")).toHaveTextContent("true");
});

it.each([200, 401])("ignores an old account's late HTTP %s response after switching accounts", async (status) => {
  const oldRefresh = deferred<Response>();
  const newRefresh = deferred<Response>();
  fetchMock.mockResolvedValueOnce(permissions(true))
    .mockReturnValueOnce(oldRefresh.promise)
    .mockReturnValueOnce(newRefresh.promise);
  render(<AuthProvider><Probe /></AuthProvider>);
  await waitFor(() => expect(screen.getByTestId("products")).toHaveTextContent("true"));

  fireEvent.click(screen.getByText("Refresh"));
  fireEvent.click(screen.getByText("Switch account"));
  expect(fetchMock.mock.calls[1][1]?.signal?.aborted).toBe(true);
  expect(screen.getByTestId("products")).toHaveTextContent("false");
  expect(screen.getByTestId("loading")).toHaveTextContent("true");

  await act(async () => { newRefresh.resolve(permissions(false, "account-b")); });
  await act(async () => { oldRefresh.resolve(status === 401 ? new Response(null, { status }) : permissions(true)); });

  expect(screen.getByTestId("products")).toHaveTextContent("false");
  expect(screen.getByTestId("user")).toHaveTextContent("test-user");
  expect(screen.getByTestId("loading")).toHaveTextContent("false");
});

it("does not retain another account's grants when the new account cannot be evaluated", async () => {
  fetchMock.mockResolvedValueOnce(permissions(true))
    .mockResolvedValueOnce(new Response(JSON.stringify({ error: "Authorization unavailable" }), { status: 503 }));
  render(<AuthProvider><Probe /></AuthProvider>);
  await waitFor(() => expect(screen.getByTestId("products")).toHaveTextContent("true"));

  fireEvent.click(screen.getByText("Switch account"));

  await waitFor(() => expect(screen.getByTestId("error")).toHaveTextContent("Authorization unavailable"));
  expect(screen.getByTestId("products")).toHaveTextContent("false");
});

it("refreshes permissions for the restored Sold-To rather than the server's default account", async () => {
  localStorage.setItem("iam_selected_account", "account-b");
  fetchMock.mockImplementation(async (url, init) => {
    if (url === "/api/auth/permissions") {
      const accountId = new Headers(init?.headers).get("x-account-id");
      return permissions(accountId !== "account-b", accountId ?? "account-a");
    }
    if (url === "/api/crm/user-context/me?accountId=account-b") {
      return new Response(JSON.stringify({
        selectedAccount: { accountId: "account-b" },
        user: { accounts: [] },
        selectedSalesOrgs: [],
      }));
    }
    throw new Error("Unexpected request");
  });
  render(<AuthProvider><AccountProvider><Probe /><AccountProbe /></AccountProvider></AuthProvider>);

  await waitFor(() => expect(screen.getByTestId("account")).toHaveTextContent("account-b"));
  await waitFor(() => expect(screen.getByTestId("products")).toHaveTextContent("false"));
  expect(fetchMock).toHaveBeenCalledWith("/api/auth/permissions", expect.objectContaining({
    headers: { "x-account-id": "account-b" },
  }));
});
