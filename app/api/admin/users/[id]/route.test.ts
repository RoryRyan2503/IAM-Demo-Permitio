import { describe, it, expect, vi, beforeEach } from "vitest";

const mockValidateRequest = vi.fn();
vi.mock("@/lib/api/validateRequest", () => ({
  validateRequest: (...args: any[]) => mockValidateRequest(...args),
  authErrorResponse: (error: any) => ({
    message: error?.message ?? "Authorization failed",
    status: error?.statusCode ?? 500,
  }),
}));

const mockUpdate = vi.fn();
const mockSupabase = {
  from: vi.fn(() => ({
    update: mockUpdate,
  })),
};
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: () => mockSupabase,
}));

function adminContext() {
  return { userContext: { user: { role: "admin" } } };
}
function buyerContext() {
  return { userContext: { user: { role: "buyer" } } };
}

function fakeRequest(body: unknown) {
  return { json: async () => body } as any;
}

describe("PATCH /api/admin/users/[id] — role updates", () => {
  beforeEach(() => {
    vi.resetModules();
    mockValidateRequest.mockReset();
    mockUpdate.mockReset();
    mockSupabase.from.mockClear();
  });

  it("rejects non-admin callers with 403 (role-based only, no persona check)", async () => {
    mockValidateRequest.mockResolvedValue(buyerContext());
    const { PATCH } = await import("@/app/api/admin/users/[id]/route");

    const res = await PATCH(fakeRequest({ role: "admin" }), { params: { id: "user-buyer" } });
    expect(res.status).toBe(403);
  });

  it("rejects an invalid role value with 400", async () => {
    mockValidateRequest.mockResolvedValue(adminContext());
    const { PATCH } = await import("@/app/api/admin/users/[id]/route");

    const res = await PATCH(fakeRequest({ role: "superadmin" }), { params: { id: "user-1" } });
    expect(res.status).toBe(400);
  });

  it("persists a valid role change to Supabase and returns the updated role", async () => {
    mockValidateRequest.mockResolvedValue(adminContext());
    mockUpdate.mockReturnValue({
      eq: () => ({
        select: () => ({
          single: async () => ({ data: { id: "user-1", role: "admin" }, error: null }),
        }),
      }),
    });
    const { PATCH } = await import("@/app/api/admin/users/[id]/route");

    const res = await PATCH(fakeRequest({ role: "admin" }), { params: { id: "user-1" } });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toEqual({ id: "user-1", role: "admin" });
    expect(mockSupabase.from).toHaveBeenCalledWith("users");
    expect(mockUpdate).toHaveBeenCalledWith({ role: "admin" });
  });
});
