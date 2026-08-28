-- Rate-limit counters are daily windows keyed by date; nothing reads a key
-- after its day ends, so prune anything older than two days. This is the
-- nightly cleanup the 0001 migration anticipated.
create extension if not exists pg_cron;

select cron.schedule(
  'prune_rate_limits',
  '17 3 * * *',
  $$delete from rate_limits where window_start < now() - interval '2 days'$$
);
