import { beforeEach, describe, expect, it, vi } from "vitest";

const { send } = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("@/lib/db/dynamoClient", () => ({
  getDynamoDocClient: () => ({ send }),
  getSeedTableName: (table: string) => `ccex-poc-ping-${table.replaceAll("_", "-")}`,
  isDynamoConfigured: () => true,
}));

import { getUserContextFromDynamo } from "./dynamoEntitlementService";

beforeEach(() => send.mockReset());

describe("DynamoDB profile failures", () => {
  it("reports expired credentials instead of returning an empty profile", async () => {
    send.mockRejectedValue(Object.assign(new Error("The security token included in the request is expired"), { name: "ExpiredTokenException" }));
    const failure = await getUserContextFromDynamo("user-1").catch((error: unknown) => error);
    expect(failure).toHaveProperty("statusCode", 503);
    expect((failure as Error).message).toContain("AWS session credentials have expired");
  });

  it("reports a missing user instead of displaying the identifier as a name", async () => {
    send.mockResolvedValue({ Items: [] });
    await expect(getUserContextFromDynamo("user-1")).rejects.toMatchObject({ statusCode: 404 });
  });
});