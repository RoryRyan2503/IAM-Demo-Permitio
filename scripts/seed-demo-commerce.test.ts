import { describe, it, expect } from "vitest";
import { diffToTarget } from "../scripts/seed-demo-commerce.mjs";

describe("seed-demo-commerce idempotency", () => {
  it("returns the full target when nothing exists yet", () => {
    expect(diffToTarget(6, 0)).toBe(6);
    expect(diffToTarget(6, undefined)).toBe(6);
  });

  it("returns the remaining gap when some rows already exist", () => {
    expect(diffToTarget(6, 4)).toBe(2);
  });

  it("returns 0 (never negative) once the target has been reached or exceeded", () => {
    expect(diffToTarget(6, 6)).toBe(0);
    expect(diffToTarget(6, 9)).toBe(0);
  });

  it("re-running with the same current count converges to 0 — proves idempotency", () => {
    let current = 0;
    const target = 6;
    for (let run = 0; run < 5; run++) {
      const toCreate = diffToTarget(target, current);
      current += toCreate;
    }
    expect(current).toBe(target);
    expect(diffToTarget(target, current)).toBe(0);
  });
});
