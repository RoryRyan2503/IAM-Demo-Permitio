import { afterEach, beforeEach, expect, it, vi } from "vitest";

const { sendMock, configuredMock } = vi.hoisted(() => ({
  sendMock: vi.fn(),
  configuredMock: vi.fn(),
}));

vi.mock("@/lib/db/dynamoClient", () => ({
  getDynamoDocClient: () => ({ send: sendMock }),
  getSeedTableName: (table: string) => `users-${table}`,
  isDynamoConfigured: configuredMock,
}));

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("MOCK_IDP_DEMO_PASSWORD", "test-shared-password");
  configuredMock.mockReturnValue(true);
  sendMock.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

it("loads and maps directory users from paginated DynamoDB scans", async () => {
  sendMock
    .mockResolvedValueOnce({
      Items: [{
        user_id: "user-2",
        first_name: "Zoe",
        last_name: "Chen",
        email: "zoe@example.test",
        honeywell_id: "hon-2",
      }],
      LastEvaluatedKey: { _id: "next" },
    })
    .mockResolvedValueOnce({
      Items: [{
        user_id: "user-1",
        first_name: "Alex",
        last_name: "Brown",
        email: "alex@example.test",
        honeywell_id: "hon-1",
        contact_id: "contact-1",
        user_role: "Buyer",
        user_type: "Employee",
        is_super_user: true,
        sbg: "HBT",
      }],
    });

  const { listMockIdpUsers } = await import("./mockIdp");
  const users = await listMockIdpUsers();

  expect(sendMock).toHaveBeenCalledTimes(2);
  expect(users).toEqual([
    expect.objectContaining({ userId: "user-1", honId: "hon-1", email: "alex@example.test" }),
    expect.objectContaining({ userId: "user-2", honId: "hon-2", email: "zoe@example.test" }),
  ]);
  expect(users[0]).not.toHaveProperty("password");
});

it("authenticates against the shared password while returning DynamoDB identity", async () => {
  sendMock.mockResolvedValue({
    Items: [{
      user_id: "user-1",
      first_name: "Alex",
      last_name: "Brown",
      email: "alex@example.test",
      honeywell_id: "hon-1",
    }],
  });
  const { verifyMockIdpCredentials } = await import("./mockIdp");

  await expect(verifyMockIdpCredentials("user-1", "test-shared-password"))
    .resolves.toMatchObject({ userId: "user-1", honId: "hon-1" });
  await expect(verifyMockIdpCredentials("user-1", "wrong-password")).resolves.toBeNull();
});
