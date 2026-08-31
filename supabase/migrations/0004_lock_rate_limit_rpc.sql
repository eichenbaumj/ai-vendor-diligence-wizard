-- Restrict rate-limit RPC execution to the service role.
--
-- Postgres grants EXECUTE on new functions to PUBLIC by default, and
-- PostgREST exposes public-schema functions at /rest/v1/rpc/*. The edge
-- functions are the only intended caller of increment_and_check (through
-- the service-role client in _shared/ratelimit.ts), so client roles have
-- no business executing it directly.

revoke execute on function public.increment_and_check(text, int)
  from public, anon, authenticated;

grant execute on function public.increment_and_check(text, int)
  to service_role;
