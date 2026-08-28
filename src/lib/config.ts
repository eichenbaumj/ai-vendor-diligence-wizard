/*
  Runtime configuration. All values come from Vite env vars; every one has a
  safe empty default so the app runs in mock mode with zero setup.
*/

export const SUPABASE_URL: string = import.meta.env.VITE_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY: string =
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";
export const TURNSTILE_SITE_KEY: string =
  import.meta.env.VITE_TURNSTILE_SITE_KEY ?? "";

/*
  Mock mode: no Supabase URL configured, or explicitly forced. In mock mode
  the app runs entirely in the browser against the sample fixtures in
  src/lib/mock.ts — no network calls.
*/
export const IS_MOCK: boolean =
  !import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_MOCK === "1";

export const FUNCTIONS_BASE = `${SUPABASE_URL}/functions/v1`;
