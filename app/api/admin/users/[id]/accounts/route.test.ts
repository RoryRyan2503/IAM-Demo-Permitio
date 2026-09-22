import { describe, it, expect, vi, beforeEach } from "vitest";

const mockValidateRequest = vi.fn();
vi.mock("@/lib/api/validateRequest", () => ({
  validateRequest: (...args: any[]) => mockValidateRequest(...args),
  authErrorResponse: (error: any) => ({
    message: error?.message ?? "Authorization failed",
    status: error?.statusCode ?? 500,
  }),
}));

const mockMaybeSingle = vi.fn();
const mockInsert = vi.fn();
const mockDelete = vi.fn();
const mockSupabase = {
  from: vi.fn((table: string) => {
    if (table === "accounts") {
      return { select: () => ({ eq: () => ({ maybeSingle: mockMaybeSingle }) }) };
    }
    if (table === "user_accounts") {
      return { insert: mockInsert, delete: mockDelete };
    }
    throw new Error(`unexpected table ${table}`);
  }),
};
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: () => mockSupabase,
}));

function adminContext() {
  return { userContext: { user: { role: "admin" } } };
}
function viewerContext() {
  return { userContext: { user: { role: "viewer" } } };
}

function fakeRequest(body: unknown, searchParams: Record<string, string> = {}) {
  const params = new URLSearchParams(searchParams);
  return {
    json: async () => body,
    nextUrl: { searchParams: { get: (key: string) => params.get(key) } },
  } as any;
}

describe("/api/admin/users/[id]/accounts — sold-to account associations", () => {
  beforeEach(() => {
    vi.resetModules();
    mockValidateRequest.mockReset();
    mockMaybeSingle.mockReset();
    mockInsert.mockReset();
    mockDelete.mockReset();
  });

  it("rejects non-admin callers on POST", async () => {
    mockValidateRequest.mockResolvedValue(viewerContext());
    const { POST } = await import("@/app/api/admin/users/[id]/accounts/route");
    const res = await POST(fakeRequest({ accountId: "001ACC001" }), { params: { id: "user-1" } });
    expect(res.status).toBe(403);
  });

  it("adds a new association and returns 201", async () => {
    mockValidateRequest.mockResolvedValue(adminContext());
    mockMaybeSingle.mockResolvedValue({ data: { id: "001ACC001", account_name: "Honeywell International" }, error: null });
    mockInsert.mockResolvedValue({ error: null });

    const { POST } = await import("@/app/api/admin/users/[id]/accounts/route");
    const res = await POST(fakeRequest({ accountId: "001ACC001" }), { params: { id: "user-1" } });
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.accountId).toBe("001ACC001");
    expect(mockInsert).toHaveBeenCalledWith({ user_id: "user-1", account_id: "001ACC001" });
  });

  it("prevents duplicate associations — maps a unique-violation (23505) to 409", async () => {
    mockValidateRequest.mockResolvedValue(adminContext());
    mockMaybeSingle.mockResolvedValue({ data: { id: "001ACC001", account_name: "Honeywell International" }, error: null });
    mockInsert.mockResolvedValue({ error: { code: "23505", message: "duplicate key" } });

    const { POST } = await import("@/app/api/admin/users/[id]/accounts/route");
    const res = await POST(fakeRequest({ accountId: "001ACC001" }), { params: { id: "user-1" } });

    expect(res.status).toBe(409);
  });

  it("removes an association on DELETE", async () => {
    mockValidateRequest.mockResolvedValue(adminContext());
    const eqSecond = vi.fn().mockResolvedValue({ error: null });
    const eqFirst = vi.fn(() => ({ eq: eqSecond }));
    mockDelete.mockReturnValue({ eq: eqFirst });

    const { DELETE } = await import("@/app/api/admin/users/[id]/accounts/route");
    const res = await DELETE(fakeRequest(undefined, { accountId: "001ACC001" }), { params: { id: "user-1" } });

    expect(res.status).toBe(200);
    expect(eqFirst).toHaveBeenCalledWith("user_id", "user-1");
    expect(eqSecond).toHaveBeenCalledWith("account_id", "001ACC001");
  });
});
