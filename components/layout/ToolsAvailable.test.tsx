// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ToolsAvailable } from "./ToolsAvailable";

let accountId = "account-a";
vi.mock("@/context/AccountContext", () => ({
  useAccountContext: () => ({ selectedAccount: { accountId } }),
}));
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-a" } }),
}));

afterEach(() => {
  vi.unstubAllGlobals();
  accountId = "account-a";
});

describe("ToolsAvailable", () => {
  it("requests multiple tools locally, then refreshes for a different Sold-To", async () => {
    let resolveSecond: (value: unknown) => void = () => {};
    const secondResponse = new Promise((resolve) => { resolveSecond = resolve; });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ tools: [
        { id: "a", name: "Approved A", description: "", url: "https://example.com", status: "Approved" },
        { id: "b", name: "Request B", description: "", url: null, status: "Requestable" },
        { id: "c", name: "Request C", description: "", url: null, status: "Requestable" },
      ] }) })
      .mockImplementationOnce(() => secondResponse);
    vi.stubGlobal("fetch", fetchMock);

    const view = render(<ToolsAvailable />);
    expect(await screen.findByText("Approved A")).toBeInTheDocument();
    expect(screen.queryByText("Request B")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Request Access" }));
    fireEvent.click(screen.getByLabelText("Request B"));
    fireEvent.click(screen.getByLabelText("Request C"));
    fireEvent.click(screen.getByRole("button", { name: "Request Access (2)" }));
    expect(screen.getByText("Request B")).toBeInTheDocument();
    expect(screen.getAllByText("Pending Approval")).toHaveLength(2);
    expect(screen.getByRole("status")).toHaveTextContent("Access request submitted");

    accountId = "account-b";
    view.rerender(<ToolsAvailable />);
    expect(screen.queryByText("Approved A")).not.toBeInTheDocument();
    resolveSecond({ ok: true, json: async () => ({ tools: [
      { id: "d", name: "Pending D", description: "", url: null, status: "Pending" },
    ] }) });
    expect(await screen.findByText("Pending D")).toBeInTheDocument();
    expect(screen.queryByText("Request B")).not.toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/tools-available?accountId=account-b", expect.any(Object)));
  });
});