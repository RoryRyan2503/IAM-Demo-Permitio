import { beforeEach, describe, expect, it, vi } from "vitest";
import { DeleteCommand, PutCommand, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const send = vi.fn();
vi.mock("@/lib/db/dynamoClient", () => ({
  getDynamoDocClient: () => ({ send }),
  getSeedTableName: (suffix: string) => `seed-20260918-${suffix}`,
}));

import { addDynamoSoldTo, listDynamoAdminUsers, removeDynamoSoldTo, updateDynamoUserRole } from "./dynamoAdminUsers";

beforeEach(() => send.mockReset());

describe("DynamoDB user management", () => {
  it("lists DynamoDB users with only active Sold-To assignments", async () => {
    send.mockResolvedValueOnce({ Items: [{ _id: "row-1", user_id: "user-1", first_name: "Test", last_name: "User", user_role: "Buyer" }] })
      .mockResolvedValueOnce({ Items: [{ _id: "association-1", user_id: "user-1", sold_to_id: "sold-1", status: "ACTIVE" }, { _id: "association-2", user_id: "user-1", sold_to_id: "sold-2", status: "INACTIVE" }] });
    expect(await listDynamoAdminUsers()).toEqual([expect.objectContaining({ id: "user-1", role: "Buyer", accounts: [{ id: "sold-1", accountName: "Sold-To sold-1" }] })]);
  });

  it("updates user_role by its DynamoDB partition key, conditional on user_id", async () => {
    send.mockResolvedValueOnce({ Items: [{ _id: "row-1", user_id: "user-1" }] }).mockResolvedValueOnce({});
    expect(await updateDynamoUserRole("user-1", "Admin")).toBe(true);
    expect(send.mock.calls[0][0]).toBeInstanceOf(ScanCommand);
    const update = send.mock.calls[1][0];
    expect(update).toBeInstanceOf(UpdateCommand);
    expect(update.input).toEqual(expect.objectContaining({ TableName: "seed-20260918-users", Key: { _id: "row-1" }, UpdateExpression: "SET user_role = :role", ConditionExpression: "user_id = :userId" }));
  });

  it("creates a junction record for a new Sold-To and removes only active records", async () => {
    send.mockImplementation(async (command) => {
      if (command instanceof ScanCommand) {
        const table = command.input.TableName;
        return { Items: table?.endsWith("user_sold_to") ? [] : table?.endsWith("sold_to") ? [{ sold_to_id: "sold-1" }] : [{ user_id: "user-1" }] };
      }
      return {};
    });
    expect(await addDynamoSoldTo("user-1", "sold-1")).toBe("added");
    const put = send.mock.calls.map(([command]) => command).find((command) => command instanceof PutCommand);
    expect(put.input).toEqual(expect.objectContaining({ TableName: "seed-20260918-user_sold_to", Item: expect.objectContaining({ user_id: "user-1", sold_to_id: "sold-1", status: "ACTIVE", is_default: true }) }));

    send.mockReset();
    send.mockResolvedValueOnce({ Items: [{ _id: "active", user_id: "user-1", sold_to_id: "sold-1", status: "ACTIVE" }, { _id: "inactive", user_id: "user-1", sold_to_id: "sold-1", status: "INACTIVE" }] }).mockResolvedValueOnce({});
    expect(await removeDynamoSoldTo("user-1", "sold-1")).toBe(true);
    const deletion = send.mock.calls[1][0];
    expect(deletion).toBeInstanceOf(DeleteCommand);
    expect(deletion.input.Key).toEqual({ _id: "active" });
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("reactivates an inactive association instead of creating a duplicate", async () => {
    send.mockImplementation(async (command) => {
      if (command instanceof ScanCommand) return { Items: command.input.TableName?.endsWith("user_sold_to")
        ? [{ _id: "old", user_id: "user-1", sold_to_id: "sold-1", status: "INACTIVE" }]
        : command.input.TableName?.endsWith("sold_to") ? [{ sold_to_id: "sold-1" }] : [{ user_id: "user-1" }] };
      return {};
    });
    expect(await addDynamoSoldTo("user-1", "sold-1")).toBe("added");
    const updates = send.mock.calls.map(([command]) => command).filter((command) => command instanceof UpdateCommand);
    expect(updates).toHaveLength(1);
    expect(updates[0].input).toEqual(expect.objectContaining({ Key: { _id: "old" }, UpdateExpression: "SET #status = :active" }));
  });
});