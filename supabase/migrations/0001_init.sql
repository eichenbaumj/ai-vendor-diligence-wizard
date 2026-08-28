-- AI Vendor Diligence Wizard — initial schema.
--
-- RLS posture: DENY ALL for anon/authenticated on every table. No policies
-- are created for client roles on purpose — every read and write goes through
-- edge functions running with the service role. The evaluation UUID is the
-- share capability; client_token is the mutation capability. This guarantees
-- there is no browsable directory of evaluated vendors (methodology rule:
-- on-demand reports only).

create type eval_status as enum (
  'queued', 'parsing', 'registry', 'research', 'synthesis',
  'complete', 'insufficient', 'error'
);

create table evaluations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  client_token uuid not null,
  status eval_status not null default 'queued',
  input_kind text not null check (input_kind in ('paste', 'pdf', 'url', 'name')),
  input_sha256 text not null,
  pitch_raw text,
  forensics jsonb,
  vendor_key text,
  user_state char(2),
  report jsonb,
  usage jsonb,
  error text,
  methodology_version text not null default '1.0',
  pack_release text not null default '0',
  expires_at timestamptz not null default now() + interval '90 days'
);
create index evaluations_vendor_cache
  on evaluations (vendor_key, status, created_at desc);

create table evaluation_events (
  id bigint generated always as identity primary key,
  evaluation_id uuid not null references evaluations (id) on delete cascade,
  ts timestamptz not null default now(),
  stage text not null,
  kind text not null,
  payload jsonb not null
);
create index evaluation_events_replay on evaluation_events (evaluation_id, id);

create table rate_limits (
  key text primary key,
  window_start timestamptz not null default now(),
  count int not null default 0
);

-- Atomic increment-and-check. Returns true when the caller is within cap
-- AFTER counting this request. Keys embed their window (e.g. the date), so
-- rows are naturally scoped; a nightly cleanup can prune old keys.
create or replace function increment_and_check(p_key text, p_cap int)
returns boolean
language plpgsql
security definer
as $$
declare
  new_count int;
begin
  insert into rate_limits (key, count)
  values (p_key, 1)
  on conflict (key) do update set count = rate_limits.count + 1
  returning count into new_count;
  return new_count <= p_cap;
end;
$$;

create table chat_sessions (
  id uuid primary key default gen_random_uuid(),
  evaluation_id uuid not null references evaluations (id) on delete cascade,
  created_at timestamptz not null default now(),
  turns_used int not null default 0,
  input_tokens bigint not null default 0,
  output_tokens bigint not null default 0,
  exhausted boolean not null default false
);

create table chat_messages (
  id bigint generated always as identity primary key,
  session_id uuid not null references chat_sessions (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create table vendor_disputes (
  id uuid primary key default gen_random_uuid(),
  vendor_key text not null,
  evaluation_id uuid references evaluations (id) on delete set null,
  contact_email text not null,
  disputed_item text not null,
  vendor_statement text not null,
  evidence_url text,
  status text not null default 'new'
    check (status in ('new', 'under_review', 'corrected', 'standing')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolution_note text
);
create index vendor_disputes_lookup on vendor_disputes (vendor_key, status);

create table registry_cache (
  source text not null,
  key text not null,
  fetched_at timestamptz not null default now(),
  payload jsonb not null,
  primary key (source, key)
);

-- Deny-all RLS: enable RLS everywhere, create no client policies.
alter table evaluations enable row level security;
alter table evaluation_events enable row level security;
alter table rate_limits enable row level security;
alter table chat_sessions enable row level security;
alter table chat_messages enable row level security;
alter table vendor_disputes enable row level security;
alter table registry_cache enable row level security;

revoke all on all tables in schema public from anon, authenticated;
