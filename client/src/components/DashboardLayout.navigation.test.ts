import { describe, expect, it } from "vitest";
import { dashboardMenuItems } from "./DashboardLayout";

describe("dashboard navigation identity", () => {
  it("keeps every rendered navigation key unique", () => {
    const keys = dashboardMenuItems.map(item => item.id);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.every(Boolean)).toBe(true);
  });
});
