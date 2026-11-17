import { afterEach, describe, expect, it, vi } from "vitest";
import { getDynamoCredentials, getSeedTableName } from "./dynamoClient";

afterEach(() => vi.unstubAllEnvs());

describe("CCEX DynamoDB configuration", () => {
  it("maps logical table names to the CCEX physical table names", () => {
    vi.stubEnv("DYNAMODB_TABLE_PREFIX", "");
    expect([
      getSeedTableName("accounts"),
      getSeedTableName("applications"),
      getSeedTableName("sold_to"),
      getSeedTableName("tools"),
      getSeedTableName("user_accounts"),
      getSeedTableName("user_applications"),
      getSeedTableName("user_sold_to"),
      getSeedTableName("user_tool_access"),
      getSeedTableName("users"),
    ]).toEqual([
      "ccex-poc-ping-accounts",
      "ccex-poc-ping-applications",
      "ccex-poc-ping-sold-to",
      "ccex-poc-ping-tools",
      "ccex-poc-ping-user-accounts",
      "ccex-poc-ping-user-applications",
      "ccex-poc-ping-user-sold-to",
      "ccex-poc-ping-user-tool-access",
      "ccex-poc-ping-users",
    ]);
  });

  it("includes a temporary session token in explicit AWS credentials", () => {
    vi.stubEnv("DYNAMODB_ACCESS_KEY_ID", "test-access-key");
    vi.stubEnv("DYNAMODB_SECRET_ACCESS_KEY", "test-secret-key");
    vi.stubEnv("aws_session_token", "test-session-token");

    expect(getDynamoCredentials()).toEqual({
      accessKeyId: "test-access-key",
      secretAccessKey: "test-secret-key",
      sessionToken: "test-session-token",
    });
  });
});