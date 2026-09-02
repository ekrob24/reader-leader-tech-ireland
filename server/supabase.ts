import {
  createAdminClient,
  createContextClient,
} from "@supabase/server/core";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./reader-leader/supabase.generated";

export type ReaderLeaderSupabaseClient = SupabaseClient<Database>;

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

export const READER_LEADER_SUPABASE_URL = "https://qpvzzrgofxregccverfr.supabase.co";

export function resolveSupabaseUrl(): string {
  return parseSupabaseUrl(process.env.SUPABASE_URL)
    ?? parseSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)
    ?? READER_LEADER_SUPABASE_URL;
}

export function getSupabaseAdminClient(): ReaderLeaderSupabaseClient {
  const url = resolveSupabaseUrl();
  if (!process.env.SUPABASE_SECRET_KEY) {
    throw new Error("Supabase server configuration is incomplete");
  }
  return createAdminClient<Database>({
    env: {
      url,
      secretKeys: { default: process.env.SUPABASE_SECRET_KEY },
    },
  });
}

export function getSupabaseUserClient(accessToken: string): ReaderLeaderSupabaseClient {
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const url = resolveSupabaseUrl();
  if (!accessToken.trim()) throw new Error("Supabase access token is required");
  if (!publishableKey) {
    throw new Error("Supabase user client configuration is incomplete");
  }
  const jwksUrl = process.env.SUPABASE_JWKS_URL ? parseSupabaseUrl(process.env.SUPABASE_JWKS_URL) : null;
  if (process.env.SUPABASE_JWKS_URL && !jwksUrl) {
    throw new Error("Supabase JWKS URL is invalid. Set SUPABASE_JWKS_URL to an HTTP or HTTPS endpoint.");
  }
  return createContextClient<Database>({
    auth: { token: accessToken },
    env: {
      url,
      publishableKeys: { default: publishableKey },
      jwks: jwksUrl ? new URL(jwksUrl) : undefined,
    },
  });
}
