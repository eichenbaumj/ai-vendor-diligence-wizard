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

/* Deep-mode toggle visibility. The server independently refuses deep runs
   unless its DEEP_MODE_ENABLED secret is set, so hiding this is cosmetic. */
export const DEEP_MODE_UI: boolean = !IS_MOCK;

/* Verified-government-email tier card visibility. Dark by default: the
   server independently refuses everything unless its GOV_VERIFY_ENABLED
   secret is set, so showing this is never enough by itself. */
export const GOV_VERIFY_UI: boolean = import.meta.env.VITE_GOV_VERIFY === "1";

/* Work-in-progress notice: the corner ribbon in the header (md and up) and
   the band under it below md, the pill in the verdict row, the clause in
   the report's date band, the footer stamp, the About status block, and the
   gate title and intro (the "(field test)" page title reads the same
   variable in vite.config.ts). Default on, so a forgotten env var can never
   hide it during field testing. At general release build with VITE_WIP=0,
   then delete src/lib/wip-notice.ts, WipNotice.tsx, the ribbon styles in
   brand.css, and the reads in those surfaces. */
export const WIP_NOTICE: boolean = import.meta.env.VITE_WIP !== "0";

export const FUNCTIONS_BASE = `${SUPABASE_URL}/functions/v1`;
