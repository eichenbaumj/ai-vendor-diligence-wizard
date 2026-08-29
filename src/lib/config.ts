/*
  Central configuration. Values here are PUBLIC by design.

  The Supabase URL and publishable API key are committed on purpose (fleet
  pattern): a publishable key is Supabase's browser-safe key class, it only
  grants what Row-Level Security allows, and this schema is deny-all for
  client roles — every data path goes through the edge functions. Vite env
  vars override the defaults for local setups.
*/

const DEFAULT_SUPABASE_URL = "https://eejzmwdjflltzthotean.supabase.co";
const DEFAULT_SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_L5kB5mL8UXrvfYfz4Io3Yw_RW5-Ofbb";

export const SUPABASE_URL: string =
  import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
export const SUPABASE_ANON_KEY: string =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  DEFAULT_SUPABASE_PUBLISHABLE_KEY;
/* Turnstile site keys are public identifiers by design. */
const DEFAULT_TURNSTILE_SITE_KEY = "0x4AAAAAAEfwyRZ62q5OA8kA";

export const TURNSTILE_SITE_KEY: string =
  import.meta.env.VITE_TURNSTILE_SITE_KEY || DEFAULT_TURNSTILE_SITE_KEY;

export const IS_MOCK: boolean = import.meta.env.VITE_MOCK === "1";

/* Temporary pre-launch access gate (shared password via Supabase Auth).
   Flip to false at launch and delete PasswordGate + the GATE_ENABLED check
   in the evaluate function. Mock builds skip the gate. */
export const GATE_ENABLED: boolean = !IS_MOCK;

export const FUNCTIONS_BASE = `${SUPABASE_URL}/functions/v1`;
