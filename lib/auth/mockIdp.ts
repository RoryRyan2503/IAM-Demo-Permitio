/**
 * DynamoDB-backed mock identity provider.
 *
 * This module authenticates identity only. Account and tool entitlements are
 * resolved separately by the DynamoDB entitlement service, and authorization
 * decisions remain with PingAuthorize.
 */

import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { getDynamoDocClient, getSeedTableName, isDynamoConfigured } from "@/lib/db/dynamoClient";

export interface MockIdpUser {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  honId: string;
  contactId: string;
}

interface DynamoUserRecord {
  user_id?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  honeywell_id?: string;
  contact_id?: string;
}

const DEMO_PASSWORD = process.env.MOCK_IDP_DEMO_PASSWORD ?? "demo-only-change-me";
const PASSWORD_SALT = randomBytes(16);
const PASSWORD_HASH = scryptSync(DEMO_PASSWORD, PASSWORD_SALT, 64);
const USER_TABLE_FIELDS = {
  "#userId": "user_id",
  "#firstName": "first_name",
  "#lastName": "last_name",
  "#email": "email",
  "#honId": "honeywell_id",
  "#contactId": "contact_id",
};

function mapUser(record: DynamoUserRecord): MockIdpUser | null {
  if (!record.user_id) return null;
  return {
    userId: record.user_id,
    firstName: record.first_name ?? "",
    lastName: record.last_name ?? "",
    email: record.email ?? "",
    honId: record.honeywell_id ?? "",
    contactId: record.contact_id ?? "",
  };
}

async function scanUsers(userId?: string): Promise<MockIdpUser[]> {
  if (!isDynamoConfigured()) {
    throw Object.assign(new Error("DynamoDB is not configured."), { statusCode: 503 });
  }

  const users: MockIdpUser[] = [];
  let ExclusiveStartKey: Record<string, unknown> | undefined;

  do {
    const response = await getDynamoDocClient().send(
      new ScanCommand({
        TableName: getSeedTableName("users"),
        ProjectionExpression: Object.keys(USER_TABLE_FIELDS).join(", "),
        ExpressionAttributeNames: USER_TABLE_FIELDS,
        ...(userId
          ? {
              FilterExpression: "#userId = :userId",
              ExpressionAttributeValues: { ":userId": userId },
            }
          : {}),
        ExclusiveStartKey,
      })
    );
    for (const item of (response.Items ?? []) as DynamoUserRecord[]) {
      const user = mapUser(item);
      if (user) users.push(user);
    }
    ExclusiveStartKey = response.LastEvaluatedKey;
  } while (ExclusiveStartKey);

  return users;
}

/** Returns the current identity directory directly from the DynamoDB users table. */
export async function listMockIdpUsers(): Promise<MockIdpUser[]> {
  return (await scanUsers()).sort((a, b) =>
    `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`)
  );
}

/**
 * Validates the shared demo password and returns identity attributes from the
 * current DynamoDB record. Passwords and password hashes are never persisted.
 */
export async function verifyMockIdpCredentials(
  userId: string,
  password: string
): Promise<MockIdpUser | null> {
  const [user] = await scanUsers(userId);
  const candidateHash = scryptSync(password, PASSWORD_SALT, PASSWORD_HASH.length);
  if (!user || !timingSafeEqual(candidateHash, PASSWORD_HASH)) return null;
  return user;
}
