import { describe, expect, it } from "vitest";

describe("Supabase configuration", () => {
  it("accepts the configured project URL and publishable key", async () => {
    const url = "https://qpvzzrgofxregccverfr.supabase.co";
    const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    const secretKey = process.env.SUPABASE_SECRET_KEY;

    expect(publishableKey).toBeTruthy();
    expect(secretKey).toBeTruthy();

    for (const key of [publishableKey, secretKey]) {
      const response = await fetch(`${url}/auth/v1/settings`, {
        headers: {
          apikey: key as string,
          Authorization: `Bearer ${key as string}`,
        },
      });

      expect(response.ok).toBe(true);
      expect(response.headers.get("content-type")).toContain("application/json");
    }
  });
});
