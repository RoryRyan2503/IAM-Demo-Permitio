import { describe, it, expect, vi, beforeEach } from "vitest";

const mockValidateRequest = vi.fn();
vi.mock("@/lib/api/validateRequest", () => ({
  validateRequest: (...args: any[]) => mockValidateRequest(...args),
  authErrorResponse: (error: any) => ({
    message: error?.message ?? "Authorization failed",
    status: error?.statusCode ?? 500,
  }),
}));

const mockOrder = vi.fn();
const mockSupabase = {
  from: vi.fn(() => ({
    select: () => ({ order: mockOrder }),
  })),
};
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: () => mockSupabase,
}));

function fakeRequest() {
  return {} as any;
}

describe("GET /api/admin/users — role-based authorization + Supabase data mapping", () => {
  beforeEach(() => {
    vi.resetModules();
    mockValidateRequest.mockReset();
    mockOrder.mockReset();
  });

  it("denies access to non-admin roles (role-based, not persona-based)", async () => {
    mockValidateRequest.mockResolvedValue({ userContext: { user: { role: "buyer" } } });
    const { GET } = await import("@/app/api/admin/users/route");
    const res = await GET(fakeRequest());
    expect(res.status).toBe(403);
  });

  it("maps nested user_accounts rows into a flat accounts array per user", async () => {
    mockValidateRequest.mockResolvedValue({ userContext: { user: { role: "admin" } } });
    mockOrder.mockResolvedValue({
      data: [
        {
          id: "user-buyer",
          email: "buyer@acme.com",
          name: "Carlos Rodriguez",
          role: "buyer",
          phone: null,
          department: "Procurement",
          hon_id: "h125002",
          user_type: "Partner",
          user_accounts: [
            { account_id: "001ACC002", accounts: { id: "001ACC002", account_name: "Whole Foods Market" } },
          ],
        },
      ],
      error: null,
    });

    const { GET } = await import("@/app/api/admin/users/route");
    const res = await GET(fakeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual([
      {
        id: "user-buyer",
        email: "buyer@acme.com",
        name: "Carlos Rodriguez",
        role: "buyer",
        phone: null,
        department: "Procurement",
        honId: "h125002",
        userType: "Partner",
        accounts: [{ id: "001ACC002", accountName: "Whole Foods Market" }],
      },
    ]);
  });
});
