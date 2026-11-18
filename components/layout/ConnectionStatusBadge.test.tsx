// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ConnectionStatusBadge } from "./ConnectionStatusBadge";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it.each([
  [false, "Provider Unavailable"],
  [true, "Local Authorization"],
])("distinguishes an unavailable configured PDP from local demo mode (%s)", async (demoMode, label) => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ provider: "ping", connected: false, demoMode }),
  }));
  render(<ConnectionStatusBadge />);

  expect(await screen.findByText(label)).toBeInTheDocument();
});
