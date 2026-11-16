/**
 * Local Mock Identity Provider (IDP) — Authentication only
 *
 * Replaces the non-functional Ping Identity OIDC login for the "Enterprise
 * Login" (username/password) experience described in the IAM POC spec.
 *
 * IMPORTANT architectural boundary:
 *   - This module owns IDENTITY only: userId, username, password, firstName,
 *     lastName, email. It has NO knowledge of roles, tools, accounts, sales
 *     orgs, or any other authorization entitlement.
 *   - Entitlements continue to live exclusively in the CRM entitlement store
 *     (lib/crm/mockData.ts / Supabase `users` tables), keyed by the same
 *     `userId` — see lib/crm/crmService.ts.
 *   - PingAuthorize/Permit remain the only components that make authorization
 *     decisions; this file never returns a permit/deny.
 *
 * The 50 demo identities are the imported DynamoDB user extract
 * (lib/auth/dynamoUsers.ts, sourced from dynamouser.csv) — only their
 * identity fields (userId/email/firstName/lastName) are used here; the
 * same records' role/userType/sbg attributes are used separately by
 * lib/crm/mockData.ts to seed matching entitlement records.
 *
 * Passwords are demo-only. All 50 users share one demo password (documented
 * in .env.local.example / README) and are stored as a salted scrypt hash,
 * never in plaintext.
 */

import { scryptSync, randomBytes, timingSafeEqual } from "crypto";
import { DYNAMO_USERS } from "@/lib/auth/dynamoUsers";

export interface MockIdpUser {
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface MockIdpCredential extends MockIdpUser {
  passwordSalt: string;
  passwordHash: string;
}

/** Demo-only shared password for all 50 mock-IDP users (never a real credential). */
const DEMO_PASSWORD = process.env.MOCK_IDP_DEMO_PASSWORD ?? "demo-only-change-me";

function hashPassword(password: string, salt: string): string {
  return scryptSync(password, salt, 64).toString("hex");
}

function usernameFromName(firstName: string, lastName: string): string {
  return `${firstName}.${lastName}`.toLowerCase().replace(/[^a-z0-9.]/g, "");
}

function buildDirectory(): MockIdpCredential[] {
  return DYNAMO_USERS.map((u) => {
    const salt = randomBytes(16).toString("hex");
    return {
      userId: u.userId,
      username: usernameFromName(u.firstName, u.lastName),
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      passwordSalt: salt,
      passwordHash: hashPassword(DEMO_PASSWORD, salt),
    };
  });
}

// Built once per server process — a real IDP would load this from a user
// store; here it's derived in-memory from the identity fields of DYNAMO_USERS.
const MOCK_IDP_DIRECTORY: MockIdpCredential[] = buildDirectory();

const BY_USERNAME: Record<string, MockIdpCredential> = Object.fromEntries(
  MOCK_IDP_DIRECTORY.map((u) => [u.username, u])
);

const BY_USER_ID: Record<string, MockIdpCredential> = Object.fromEntries(
  MOCK_IDP_DIRECTORY.map((u) => [u.userId, u])
);

function toIdentity(u: MockIdpCredential): MockIdpUser {
  return { userId: u.userId, username: u.username, firstName: u.firstName, lastName: u.lastName, email: u.email };
}

/** Full identity-only directory (no credentials) — used for admin/debug listing. */
export function listMockIdpUsers(): MockIdpUser[] {
  return MOCK_IDP_DIRECTORY.map(toIdentity);
}

export function getMockIdpUserById(userId: string): MockIdpUser | null {
  const u = BY_USER_ID[userId];
  return u ? toIdentity(u) : null;
}

/**
 * Verify username/password against the mock IDP directory.
 * Returns the identity (never the password/hash) on success, or null.
 */
export function verifyMockIdpCredentials(username: string, password: string): MockIdpUser | null {
  const normalized = username.trim().toLowerCase();
  const record = BY_USERNAME[normalized];
  if (!record) return null;

  const candidateHash = hashPassword(password, record.passwordSalt);
  const a = Buffer.from(candidateHash, "hex");
  const b = Buffer.from(record.passwordHash, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  return toIdentity(record);
}
