import {
  createAdminClient,
  createContextClient,
} from "@supabase/server/core";
import type { SupabaseClient } from "@supabase/supabase-js";

export function parseSupabaseUrl(value: string | undefined): string | null {
  if (!value?.trim()) return null;
  try {
    const parsed = new URL(value.trim());
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.hostname ? parsed.origin : null;
  } catch {
    return null;
  }
}

function getSupabaseUrl(): string {
  const url = parseSupabaseUrl(process.env.SUPABASE_URL) ?? parseSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (!url) throw new Error("Supabase project URL is missing or invalid. Set SUPABASE_URL to an HTTP or HTTPS Supabase project URL.");
  return url;
}

export function getSupabaseAdminClient(): SupabaseClient {
  const url = getSupabaseUrl();
  if (!process.env.SUPABASE_SECRET_KEY) {
    throw new Error("Supabase server configuration is incomplete");
  }
  return createAdminClient({
    env: {
      url,
      secretKeys: { default: process.env.SUPABASE_SECRET_KEY },
    },
  });
}

export function getSupabaseUserClient(accessToken: string): SupabaseClient {
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const url = getSupabaseUrl();
  if (!accessToken.trim()) throw new Error("Supabase access token is required");
  if (!publishableKey) {
    throw new Error("Supabase user client configuration is incomplete");
  }
  const jwksUrl = process.env.SUPABASE_JWKS_URL ? parseSupabaseUrl(process.env.SUPABASE_JWKS_URL) : null;
  if (process.env.SUPABASE_JWKS_URL && !jwksUrl) {
    throw new Error("Supabase JWKS URL is invalid. Set SUPABASE_JWKS_URL to an HTTP or HTTPS endpoint.");
  }
  return createContextClient({
    auth: { token: accessToken },
    env: {
      url,
      publishableKeys: { default: publishableKey },
      jwks: jwksUrl ? new URL(jwksUrl) : undefined,
    },
  });
}
