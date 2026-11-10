-- ---------------------------------------------------------------------------
-- Real-time "new hazard report" notifications for admins
-- ---------------------------------------------------------------------------
-- The app can only create notifications for the signed-in user, so an
-- administrator has to be notified by the database itself. Run this once in the
-- Supabase dashboard (SQL Editor) if admins are not getting a pop-up when a
-- citizen submits a report.
--
-- STEP 1 - check whether a trigger already does this:
--
--   select tgname, pg_get_triggerdef(oid)
--   from pg_trigger
--   where tgrelid = 'public.hazard_reports'::regclass and not tgisinternal;
--
-- If a trigger that notifies admins already exists, stop here - do not run
-- STEP 2, or admins will receive two notifications per report.
--
-- STEP 2 - create the trigger (safe to run more than once):
-- ---------------------------------------------------------------------------

create or replace function public.notify_admins_new_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, report_id, title, message)
  select
    u.user_id,
    new.report_id,
    'New Hazard Report',
    format(
      'A new hazard report "%s" was submitted and is waiting for review.',
      coalesce(nullif(new.title, ''), 'Untitled hazard report')
    )
  from public.users u
  where u.user_type = 'admin'
    -- Guard against duplicates if another trigger already created this row.
    and not exists (
      select 1
      from public.notifications n
      where n.user_id = u.user_id
        and n.report_id = new.report_id
        and n.title = 'New Hazard Report'
    );

  return new;
end;
$$;

drop trigger if exists trg_notify_admins_new_report on public.hazard_reports;

create trigger trg_notify_admins_new_report
after insert on public.hazard_reports
for each row
execute function public.notify_admins_new_report();
