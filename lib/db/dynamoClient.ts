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

/** True once the minimum required DynamoDB env vars are present. */
export function isDynamoConfigured(): boolean {
  return Boolean(process.env.DYNAMODB_REGION && getTablePrefix());
}

function getTablePrefix(): string {
  return process.env.DYNAMODB_TABLE_PREFIX ?? "seed-20260918-";
}

/** Table name for a given logical suffix, e.g. getSeedTableName("sold_to") → "seed-20260918-sold_to". */
export function getSeedTableName(suffix: "users" | "sold_to" | "user_sold_to" | "user_tool_access" | "tools"): string {
  return `${getTablePrefix()}${suffix}`;
}

export function getDynamoDocClient(): DynamoDBDocumentClient {
  if (_docClient) return _docClient;

  const region = process.env.DYNAMODB_REGION ?? "us-east-1";
  const endpoint = process.env.DYNAMODB_ENDPOINT; // optional — local DynamoDB / DynamoDB Local
  const accessKeyId = process.env.DYNAMODB_ACCESS_KEY_ID;
  const secretAccessKey = process.env.DYNAMODB_SECRET_ACCESS_KEY;

  const base = new DynamoDBClient({
    region,
    ...(endpoint ? { endpoint } : {}),
    ...(accessKeyId && secretAccessKey
      ? { credentials: { accessKeyId, secretAccessKey } }
      : {}),
  });

  _docClient = DynamoDBDocumentClient.from(base, {
    marshallOptions: { removeUndefinedValues: true },
  });
  return _docClient;
}
