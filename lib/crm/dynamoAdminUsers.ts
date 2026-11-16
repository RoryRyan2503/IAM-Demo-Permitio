import { randomUUID } from "node:crypto";
import { DeleteCommand, PutCommand, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { getDynamoDocClient, getSeedTableName } from "@/lib/db/dynamoClient";

export interface DynamoAdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  honId: string;
  userType: string;
  sbg: string;
  accounts: { id: string; accountName: string }[];
}

interface UserRow {
  _id: string;
  user_id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  honeywell_id?: string;
  user_type?: string;
  user_role?: string;
  sbg?: string;
}

interface AssociationRow {
  _id: string;
  user_id: string;
  sold_to_id: string;
  status?: string;
  is_default?: boolean;
}

interface SoldToRow {
  sold_to_id: string;
}

async function scanAll<T>(table: "users" | "user_sold_to" | "sold_to", filter?: { name: string; value: string }): Promise<T[]> {
  const rows: T[] = [];
  let ExclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const response = await getDynamoDocClient().send(new ScanCommand({
      TableName: getSeedTableName(table),
      ...(filter ? { FilterExpression: "#field = :value", ExpressionAttributeNames: { "#field": filter.name }, ExpressionAttributeValues: { ":value": filter.value } } : {}),
      ExclusiveStartKey,
    }));
    rows.push(...(response.Items ?? []) as T[]);
    ExclusiveStartKey = response.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return rows;
}

export async function listDynamoAdminUsers(): Promise<DynamoAdminUser[]> {
  const [users, associations] = await Promise.all([
    scanAll<UserRow>("users"),
    scanAll<AssociationRow>("user_sold_to"),
  ]);
  return users.filter((user) => user.user_id).map((user) => ({
    id: user.user_id,
    name: [user.first_name, user.last_name].filter(Boolean).join(" ") || user.user_id,
    email: user.email ?? "",
    role: user.user_role ?? "",
    honId: user.honeywell_id ?? "",
    userType: user.user_type ?? "",
    sbg: user.sbg ?? "",
    accounts: associations.filter((row) => row.user_id === user.user_id && (row.status ?? "ACTIVE") === "ACTIVE")
      .map((row) => ({ id: row.sold_to_id, accountName: `Sold-To ${row.sold_to_id}` })),
  }));
}

export async function listDynamoSoldTos() {
  const rows = await scanAll<SoldToRow>("sold_to");
  return rows.filter((row) => row.sold_to_id).map((row) => ({ id: row.sold_to_id, accountName: `Sold-To ${row.sold_to_id}` }));
}

export async function updateDynamoUserRole(userId: string, role: string): Promise<boolean> {
  const rows = await scanAll<UserRow>("users", { name: "user_id", value: userId });
  if (rows.length !== 1 || !rows[0]._id) return false;
  await getDynamoDocClient().send(new UpdateCommand({
    TableName: getSeedTableName("users"),
    Key: { _id: rows[0]._id },
    UpdateExpression: "SET user_role = :role",
    ConditionExpression: "user_id = :userId",
    ExpressionAttributeValues: { ":role": role, ":userId": userId },
  }));
  return true;
}

export async function addDynamoSoldTo(userId: string, soldToId: string): Promise<"added" | "exists" | "missing"> {
  const [users, soldTos, associations] = await Promise.all([
    scanAll<UserRow>("users", { name: "user_id", value: userId }),
    scanAll<SoldToRow>("sold_to", { name: "sold_to_id", value: soldToId }),
    scanAll<AssociationRow>("user_sold_to", { name: "user_id", value: userId }),
  ]);
  if (users.length !== 1 || soldTos.length !== 1) return "missing";
  const existing = associations.find((row) => row.sold_to_id === soldToId && (row.status ?? "ACTIVE") === "ACTIVE")
    ?? associations.find((row) => row.sold_to_id === soldToId);
  if (existing) {
    if ((existing.status ?? "ACTIVE") === "ACTIVE") return "exists";
    await getDynamoDocClient().send(new UpdateCommand({
      TableName: getSeedTableName("user_sold_to"),
      Key: { _id: existing._id },
      UpdateExpression: "SET #status = :active",
      ConditionExpression: "user_id = :userId AND sold_to_id = :soldToId",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: { ":active": "ACTIVE", ":userId": userId, ":soldToId": soldToId },
    }));
    return "added";
  }
  await getDynamoDocClient().send(new PutCommand({
    TableName: getSeedTableName("user_sold_to"),
    Item: { _id: randomUUID(), user_id: userId, sold_to_id: soldToId, status: "ACTIVE", is_default: !associations.some((row) => (row.status ?? "ACTIVE") === "ACTIVE") },
    ConditionExpression: "attribute_not_exists(#pk)",
    ExpressionAttributeNames: { "#pk": "_id" },
  }));
  return "added";
}

export async function removeDynamoSoldTo(userId: string, soldToId: string): Promise<boolean> {
  const rows = await scanAll<AssociationRow>("user_sold_to", { name: "user_id", value: userId });
  const matches = rows.filter((row) => row.sold_to_id === soldToId && row._id && (row.status ?? "ACTIVE") === "ACTIVE");
  if (!matches.length) return false;
  for (const row of matches) {
    await getDynamoDocClient().send(new DeleteCommand({
      TableName: getSeedTableName("user_sold_to"),
      Key: { _id: row._id },
      ConditionExpression: "user_id = :userId AND sold_to_id = :soldToId",
      ExpressionAttributeValues: { ":userId": userId, ":soldToId": soldToId },
    }));
  }
  return true;
}