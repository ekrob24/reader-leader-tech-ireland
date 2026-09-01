import {
  createAdminClient,
  createContextClient,
} from "@supabase/server/core";
import type { SupabaseClient } from "@supabase/supabase-js";

export function getSupabaseAdminClient(): SupabaseClient {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
    throw new Error("Supabase server configuration is incomplete");
  }
  return createAdminClient({
    env: {
      url: process.env.SUPABASE_URL,
      secretKeys: { default: process.env.SUPABASE_SECRET_KEY },
    },
  });
}

export function getSupabaseUserClient(accessToken: string): SupabaseClient {
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!accessToken.trim()) throw new Error("Supabase access token is required");
  if (!process.env.SUPABASE_URL || !publishableKey) {
    throw new Error("Supabase user client configuration is incomplete");
  }
  return createContextClient({
    auth: { token: accessToken },
    env: {
      url: process.env.SUPABASE_URL,
      publishableKeys: { default: publishableKey },
      jwks: process.env.SUPABASE_JWKS_URL
        ? new URL(process.env.SUPABASE_JWKS_URL)
        : undefined,
    },
  });
}
