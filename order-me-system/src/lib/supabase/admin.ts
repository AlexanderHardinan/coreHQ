import "server-only";

import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

let adminClient:
  | SupabaseClient
  | null = null;

function getSupabaseUrl(): string {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL environment variable."
    );
  }

  return supabaseUrl;
}

function getSupabaseSecretKey(): string {
  const secretKey =
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secretKey) {
    throw new Error(
      "Missing SUPABASE_SECRET_KEY environment variable."
    );
  }

  return secretKey;
}

export function createAdminClient(): SupabaseClient {
  if (adminClient) {
    return adminClient;
  }

  const supabaseUrl =
    getSupabaseUrl();

  const secretKey =
    getSupabaseSecretKey();

  adminClient = createClient(
    supabaseUrl,
    secretKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    }
  );

  return adminClient;
}