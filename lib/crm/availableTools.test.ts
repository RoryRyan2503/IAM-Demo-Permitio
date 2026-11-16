import { describe, expect, it } from "vitest";
import { selectAvailableTools } from "./availableTools";

describe("selectAvailableTools", () => {
  const tools = [
    { tool_id: "one", tool_name: "First", sbg: "division-a", url: "https://example.com/tool" },
    { tool_id: "two", tool_name: "Second", sbg: "division-a" },
    { tool_id: "three", tool_name: "Third", sold_to_id: "account-b" },
    { tool_id: "four", tool_name: "Unscoped" },
    { tool_id: "five", tool_name: "Fifth", sbg: "division-b" },
    { tool_id: "six", tool_name: "Sixth", sbg: "division-a", url: "javascript:alert(1)" },
  ];
  const grants = [
    { tool_id: "one", access_status: "APPROVED", sbg: "division-a" },
    { tool_id: "two", access_status: "PENDING", sbg: "division-a" },
    { tool_id: "five", access_status: "APPROVED", sbg: "division-b" },
    { tool_id: "six", access_status: "NOT_REQUESTED" },
  ];

  it("returns only selected SBG tools and distinguishes approved, pending, and requestable", () => {
    expect(selectAvailableTools(tools, grants, "account-a", ["division-a"])).toEqual([
      { id: "one", name: "First", description: "", url: "https://example.com/tool", status: "Approved" },
      { id: "two", name: "Second", description: "", url: null, status: "Pending" },
      { id: "six", name: "Sixth", description: "", url: null, status: "Requestable" },
    ]);
  });

  it("refreshes grants for a different account and never exposes unscoped tools", () => {
    expect(selectAvailableTools(tools, grants, "account-b", ["division-b"]).map((tool) => [tool.id, tool.status])).toEqual([
      ["three", "Requestable"], ["five", "Approved"],
    ]);
  });

  it("does not promote an unscoped grant for an ID reused across SBGs", () => {
    const catalog = [
      { tool_id: "shared", sbg: "division-a" },
      { tool_id: "shared", sbg: "division-b" },
    ];
    expect(selectAvailableTools(catalog, [{ tool_id: "shared", access_status: "APPROVED" }], "account-a", ["division-a"])[0].status).toBe("Requestable");
  });
});