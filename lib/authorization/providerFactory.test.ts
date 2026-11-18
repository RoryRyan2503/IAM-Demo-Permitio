import { expect, it, vi } from "vitest";

it("reuses the provider within the current module", async () => {
  const factory = await import("./providerFactory");

  expect(factory.getAuthorizationProvider()).toBe(factory.getAuthorizationProvider());
  expect(factory.getProviderByName("ping")).toBe(factory.getAuthorizationProvider());
});

it("replaces the provider after module reload instead of retaining old executable code", async () => {
  const before = await import("./providerFactory");
  const oldProvider = before.getAuthorizationProvider();

  vi.resetModules();

  const after = await import("./providerFactory");
  expect(after.getAuthorizationProvider()).not.toBe(oldProvider);
});
