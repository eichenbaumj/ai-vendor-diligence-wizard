-- Verified-government-email quota tier.
--
-- A .gov/.mil address holder proves control of the address with an emailed
-- 6-digit code (gov-request-code / gov-verify-code functions) and receives a
-- stateless HMAC credential. Verified callers draw from a monthly pool in
-- rate_limits keyed govmail:<emailHash24>:<YYYY-MM> instead of the per-IP
-- daily cap. Only hashes are stored — never the address itself.

-- Same atomic upsert as increment_and_check (0001), but returning the count
-- so callers can report how many checks remain in the window. p_cap rides
-- along to keep the call shape parallel with increment_and_check; the
-- allowed/remaining arithmetic happens in the caller (_shared/ratelimit.ts).
create or replace function increment_and_check_count(p_key text, p_cap int)
returns int
language plpgsql
security definer
as $fn$
declare
  new_count int;
begin
  insert into rate_limits (key, count)
  values (p_key, 1)
  on conflict (key) do update set count = rate_limits.count + 1
  returning count into new_count;
  return new_count;
end;
$fn$;

-- Postgres grants EXECUTE to PUBLIC by default and PostgREST exposes
-- public-schema functions at /rest/v1/rpc/*; the edge functions (service
-- role) are the only intended caller (same lockdown as 0004).
revoke execute on function public.increment_and_check_count(text, int)
  from public, anon, authenticated;

grant execute on function public.increment_and_check_count(text, int)
  to service_role;

-- Pending verification codes. One row per email hash: requesting a new code
-- replaces the old one. code_hash is a peppered sha256 (the pepper is the
-- GOV_TOKEN_SECRET edge-function secret), so a database leak alone cannot be
-- brute-forced over the 6-digit space.
create table gov_email_codes (
  email_hash text primary key,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  created_at timestamptz not null default now()
);

alter table gov_email_codes enable row level security;
revoke all on gov_email_codes from anon, authenticated;

-- Atomic attempt counter for code verification. PostgREST cannot express a
-- relative UPDATE (set attempts = attempts + 1), and the increment must be
-- atomic and happen BEFORE the code comparison so parallel requests cannot
-- share the attempt budget. Returns the row post-increment; zero rows means
-- no pending code.
create or replace function gov_code_attempt(p_email_hash text)
returns table (code_hash text, expires_at timestamptz, attempts int)
language sql
security definer
as $fn$
  update gov_email_codes
     set attempts = gov_email_codes.attempts + 1
   where email_hash = p_email_hash
   returning gov_email_codes.code_hash,
             gov_email_codes.expires_at,
             gov_email_codes.attempts;
$fn$;

revoke execute on function public.gov_code_attempt(text)
  from public, anon, authenticated;

grant execute on function public.gov_code_attempt(text)
  to service_role;

-- Reschedule the nightly rate-limit prune (0002) with a carve-out for the
-- monthly quota keys. CRITICAL: window_start never updates on conflict, so
-- without the carve-out the two-day prune would delete a verified user's
-- monthly counter mid-month, silently resetting their quota. 45 days covers
-- the longest month plus the reporting read on a cache hit.
select cron.unschedule('prune_rate_limits');

select cron.schedule(
  'prune_rate_limits',
  '17 3 * * *',
  $$delete from rate_limits
     where (key not like 'govmail:%' and window_start < now() - interval '2 days')
        or (key like 'govmail:%' and window_start < now() - interval '45 days')$$
);

-- Verification codes live 10 minutes; sweep spent and abandoned rows hourly.
select cron.schedule(
  'prune_gov_codes',
  '0 * * * *',
  $$delete from gov_email_codes where expires_at < now() - interval '1 hour'$$
);
