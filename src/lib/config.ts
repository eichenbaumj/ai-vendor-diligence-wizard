/*
  Runtime configuration.

  The Supabase URL and anon key are committed by design (fleet pattern): the
  anon key only grants what Row-Level Security allows, and this schema is
  deny-all for anon — every data path goes through the edge functions. Vite
  env vars override the defaults for local/alternative deployments.

  Mock mode (VITE_MOCK=1) runs the app entirely in the browser against the
  sample fixtures in src/lib/mock.ts — no network calls, no backend needed.
*/

const DEFAULT_SUPABASE_URL = "https://eejzmwdjflltzthotean.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlanptd2RqZmxsdHp0aG90ZWFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5NDg1NTEsImV4cCI6MjEwMzUyNDU1MX0.e3o9xx4BjBg22Uq_xtEOpTrnMWpm1b_sngDf3Iaziis";

export const SUPABASE_URL: string =
  import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
export const SUPABASE_ANON_KEY: string =
  import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;
/* Turnstile site keys are public identifiers by design. */
const DEFAULT_TURNSTILE_SITE_KEY = "0x4AAAAAAEfwyRZ62q5OA8kA";

export const TURNSTILE_SITE_KEY: string =
  import.meta.env.VITE_TURNSTILE_SITE_KEY || DEFAULT_TURNSTILE_SITE_KEY;

export const IS_MOCK: boolean = import.meta.env.VITE_MOCK === "1";

export const FUNCTIONS_BASE = `${SUPABASE_URL}/functions/v1`;
