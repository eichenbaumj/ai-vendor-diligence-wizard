-- Usage visibility without identity (2026-09-01).
--
-- 1. gov_enrollment_counters: how MANY government-email verifications
--    succeeded each month — never who. The verification flow stays
--    write-free about identity (success deletes the code row and stores
--    no address or domain), keeping the published promise that the
--    fingerprint cannot be turned back into an address. One row per
--    month, one integer.
--
-- 2. daily_uniques: a nightly snapshot of the per-IP rate-limit key
--    counts before the two-day prune erases them. Stores COUNTS ONLY
--    (distinct hashed actors and their total checks per day) — the hashed
--    keys themselves are never copied, so retention of the snapshot adds
--    no identity surface.

create table if not exists gov_enrollment_counters (
  month text primary key check (month ~ '^\d{4}-\d{2}$'),
  verified_count integer not null default 0
);
alter table gov_enrollment_counters enable row level security;
-- Deny-all RLS like every other table: edge functions (service role) are
-- the only data path.

create or replace function bump_gov_enrollment(p_month text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into gov_enrollment_counters (month, verified_count)
  values (p_month, 1)
  on conflict (month) do update
    set verified_count = gov_enrollment_counters.verified_count + 1;
$$;
revoke all on function bump_gov_enrollment(text) from public;

create table if not exists daily_uniques (
  day date primary key,
  anon_visitors integer not null,
  checks integer not null,
  deep_checks integer not null default 0
);
alter table daily_uniques enable row level security;

-- Snapshot yesterday's ip:* keys into daily_uniques, then let the existing
-- prune job clear them. Idempotent per day.
create or replace function snapshot_daily_uniques()
returns void
language sql
security definer
set search_path = public
as $$
  insert into daily_uniques (day, anon_visitors, checks, deep_checks)
  select
    (current_date - 1) as day,
    count(*) filter (where key like 'ip:%'),
    coalesce(sum(count) filter (where key like 'ip:%'), 0),
    coalesce(sum(count) filter (where key like 'deepip:%'), 0)
  from rate_limits
  where key like 'ip:%' || to_char(current_date - 1, 'YYYY-MM-DD')
     or key like 'deepip:%' || to_char(current_date - 1, 'YYYY-MM-DD')
  on conflict (day) do nothing;
$$;
revoke all on function snapshot_daily_uniques() from public;

-- Run the snapshot nightly at 00:20 UTC, well before the 03:17 prune
-- (0005) ages yesterday's keys out.
select cron.schedule(
  'snapshot-daily-uniques',
  '20 0 * * *',
  $$select snapshot_daily_uniques()$$
);
