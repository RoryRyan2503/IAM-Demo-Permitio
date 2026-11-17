/**
 * DynamoDB client — entitlement source for the local-mock-IDP users.
 *
 * Configuration is entirely via environment variables (see
 * .env.local.example) — never hard-code credentials. When
 * DYNAMODB_ACCESS_KEY_ID/SECRET are omitted, the AWS SDK's default
 * credential provider chain is used instead (e.g. an IAM role).
 *
 * Real tables live as a family sharing one prefix, e.g.
 * "seed-20260918-users", "seed-20260918-sold_to", "seed-20260918-user_sold_to",
 * "seed-20260918-user_tool_access" (older un-prefixed tables of the same
 * names also exist in this account and must NOT be used).
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

let _docClient: DynamoDBDocumentClient | null = null;

export type DynamoTable =
  | "accounts"
  | "applications"
  | "sold_to"
  | "tools"
  | "user_accounts"
  | "user_applications"
  | "user_sold_to"
  | "user_tool_access"
  | "users";

const TABLE_SUFFIXES: Record<DynamoTable, string> = {
  accounts: "accounts",
  applications: "applications",
  sold_to: "sold-to",
  tools: "tools",
  user_accounts: "user-accounts",
  user_applications: "user-applications",
  user_sold_to: "user-sold-to",
  user_tool_access: "user-tool-access",
  users: "users",
};

/** True once the minimum required DynamoDB env vars are present. */
export function isDynamoConfigured(): boolean {
  return Boolean(process.env.DYNAMODB_REGION && getTablePrefix());
}

function getTablePrefix(): string {
  return process.env.DYNAMODB_TABLE_PREFIX?.trim() || "ccex-poc-ping-";
}

/** Resolve a logical table key to its CCEX physical table name. */
export function getSeedTableName(table: DynamoTable): string {
  return `${getTablePrefix()}${TABLE_SUFFIXES[table]}`;
}

export function getDynamoCredentials() {
  const accessKeyId = process.env.DYNAMODB_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.DYNAMODB_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
  const sessionToken =
    process.env.DYNAMODB_SESSION_TOKEN ||
    process.env.AWS_SESSION_TOKEN ||
    process.env.aws_session_token;

  if (!accessKeyId || !secretAccessKey) return undefined;
  return {
    accessKeyId,
    secretAccessKey,
    ...(sessionToken ? { sessionToken } : {}),
  };
}

export function getDynamoDocClient(): DynamoDBDocumentClient {
  if (_docClient) return _docClient;

  const region = process.env.DYNAMODB_REGION ?? "us-east-1";
  const endpoint = process.env.DYNAMODB_ENDPOINT; // optional — local DynamoDB / DynamoDB Local
  const credentials = getDynamoCredentials();

  const base = new DynamoDBClient({
    region,
    ...(endpoint ? { endpoint } : {}),
    ...(credentials ? { credentials } : {}),
  });

  _docClient = DynamoDBDocumentClient.from(base, {
    marshallOptions: { removeUndefinedValues: true },
  });
  return _docClient;
}
