-- Deep-mode checkpoint + the stranded-evaluation watchdog.

-- Checkpoint for the chained deep-research invocation: the typed pipeline
-- state persisted between the evaluate function (head) and deep-research
-- (tail). Never exposed by get-evaluation (its column list is explicit).
alter table public.evaluations add column if not exists checkpoint jsonb;

-- Watchdog: a hard platform kill mid-pipeline used to strand an evaluation
-- in 'research'/'synthesis' forever with no report and no error. Sweep
-- anything stuck past 15 minutes (deep runs finish in ~9) into an honest
-- error the frontend can render.
select cron.schedule(
  'sweep-stranded-evaluations',
  '*/5 * * * *',
  $$
    update public.evaluations
       set status = 'error',
           error = 'The check ran out of time partway through. Please run it again.',
           checkpoint = null
     where status in ('parsing', 'registry', 'research', 'synthesis')
       and created_at < now() - interval '15 minutes'
  $$
);
