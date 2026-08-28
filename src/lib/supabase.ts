/*
  Supabase client, guarded for mock mode. When IS_MOCK the export is null and
  every consumer must skip realtime/network features.
*/
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { IS_MOCK, SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/config";

export const supabase: SupabaseClient | null = IS_MOCK
  ? null
  : createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
