import { createClient } from "@supabase/supabase-js";
import { env } from "@/env";

export async function createForumServiceClient() {
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
    global: {
      headers: { "x-application-name": "fountain" },
      fetch: ((url: any, options = {}) => fetch(url, { ...options, cache: "no-store" })) as typeof fetch,
    },
  });
}
