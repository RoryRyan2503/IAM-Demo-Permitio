// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { UserManagementPanel } from "./UserManagementPanel";

afterEach(() => vi.unstubAllGlobals());

describe("User Management data sources", () => {
  it("keeps Supabase and DynamoDB users in separate views and edits DynamoDB through its own route", async () => {
    const fetchMock = vi.fn(async (url: string, options?: RequestInit) => {
      if (url === "/api/admin/users") return { ok: true, json: async () => ({ data: [{ id: "sup-1", name: "Supabase Person", email: "sup@example.com", role: "admin", accounts: [] }] }) };
      if (url === "/api/admin/dynamo-users" && !options?.method) return { ok: true, json: async () => ({ data: [{ id: "dyn-1", name: "Dynamo Person", email: "dyn@example.com", role: "Buyer", accounts: [], sbg: "BA", honId: "hon-1", userType: "Employee" }] }) };
      if (url === "/api/admin/dynamo-users/dyn-1" && options?.method === "PATCH") return { ok: true, json: async () => ({ data: {} }) };
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<UserManagementPanel />);
    expect(await screen.findByText("Supabase Person")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "DynamoDB Users" }));
    expect(await screen.findByText("Dynamo Person")).toBeInTheDocument();
    expect(screen.queryByText("Supabase Person")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Dynamo Person"));
    fireEvent.click(screen.getByRole("tab", { name: "role" }));
    fireEvent.change(screen.getByLabelText("User Role"), { target: { value: "Admin" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Role" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/admin/dynamo-users/dyn-1", expect.objectContaining({ method: "PATCH", body: JSON.stringify({ role: "Admin" }) })));
    expect(fetchMock.mock.calls.some(([url, options]) => url === "/api/admin/users/dyn-1" && options?.method === "PATCH")).toBe(false);
  });
});