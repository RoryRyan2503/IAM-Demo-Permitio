import { afterEach, expect, it, vi } from "vitest";
import { pingRequest } from "./client";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it("retries a transient PDP 500 when decision calls opt in", async () => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  const fetchMock = vi.fn()
    .mockResolvedValueOnce(new Response("server error", { status: 500 }))
    .mockResolvedValueOnce(new Response('{"decision":"PERMIT"}'));
  vi.stubGlobal("fetch", fetchMock);

  await expect(pingRequest("https://pdp.example.test", "", {
    method: "POST", retries: 1, retryableStatuses: [500, 502, 503, 504],
  })).resolves.toEqual({ decision: "PERMIT" });
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it("still reports persistent PDP failures after the retry is exhausted", async () => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  const fetchMock = vi.fn().mockImplementation(async () => new Response("server error", { status: 500 }));
  vi.stubGlobal("fetch", fetchMock);

  await expect(pingRequest("https://pdp.example.test", "", {
    method: "POST", retries: 1, retryableStatuses: [500],
  })).rejects.toMatchObject({ status: 500 });
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it("does not extend HTTP 500 retries to Policy Manager mutations", async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response("server error", { status: 500 }));
  vi.stubGlobal("fetch", fetchMock);

  await expect(pingRequest("https://pap.example.test", "/policies", {
    method: "POST", retries: 1,
  })).rejects.toMatchObject({ status: 500 });
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it.each([
  "https://pdp.example.test",
  "https://pdp.example.test/custom/decision/",
  "https://pdp.example.test/custom/decision?environment=test",
])("preserves the complete configured endpoint %s when no path is supplied", async (url) => {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ decision: "DENY" })));
  vi.stubGlobal("fetch", fetchMock);

  await pingRequest(url, "", { method: "POST", body: { attributes: {} }, retries: 0 });

  expect(fetchMock).toHaveBeenCalledWith(url, expect.objectContaining({ method: "POST" }));
});

it("continues appending paths for Policy Manager requests", async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response("{}"));
  vi.stubGlobal("fetch", fetchMock);

  await pingRequest("https://pap.example.test/", "/v2/policy-manager/policies", { retries: 0 });

  expect(fetchMock).toHaveBeenCalledWith(
    "https://pap.example.test/v2/policy-manager/policies",
    expect.objectContaining({ method: "GET" })
  );
});
