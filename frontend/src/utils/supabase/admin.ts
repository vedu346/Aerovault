import { createClient } from "@supabase/supabase-js";

const SUPABASE_PROJECT_URL = "https://gdiyntvehjivqttzngaj.supabase.co";

export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return null;
  }

  return createClient(SUPABASE_PROJECT_URL, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
