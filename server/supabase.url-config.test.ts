import { describe, expect, it } from "vitest";
import { parseSupabaseUrl } from "./supabase";

describe("Supabase URL configuration", () => {
  it("rejects malformed values and reaches Auth settings when runtime configuration is available", async () => {
    expect(parseSupabaseUrl("not-a-url")).toBeNull();
    expect(parseSupabaseUrl("postgresql://db.example.test")).toBeNull();
    expect(parseSupabaseUrl("https://qpvzzrgofxregccverfr.supabase.co")).toBe("https://qpvzzrgofxregccverfr.supabase.co");

    const projectUrl = parseSupabaseUrl(process.env.SUPABASE_URL) ?? parseSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
    const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!projectUrl || !publishableKey || publishableKey.length < 20) return;

    const response = await fetch(`${projectUrl}/auth/v1/settings`, {
      headers: { apikey: publishableKey },
    });
    expect(response.ok).toBe(true);
  }, 15_000);
});
