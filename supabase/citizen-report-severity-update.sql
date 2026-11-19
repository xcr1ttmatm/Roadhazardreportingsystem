-- ---------------------------------------------------------------------------
-- Persist the citizen-side AI severity at submission
-- ---------------------------------------------------------------------------
-- The citizen submit flow saves its detection result but historically never
-- wrote the severity back to the report, so My Reports showed a blank
-- "Unspecified" severity until an admin re-ran detection.
--
-- Run this once in the Supabase SQL Editor.
--
-- A narrow SECURITY DEFINER function is used instead of a general UPDATE
-- policy: a citizen can only change `severity`, only on their own report,
-- and only while it is still pending or under review.
-- ---------------------------------------------------------------------------

create or replace function public.set_own_report_severity(p_report_id text, p_severity text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_severity not in ('low', 'moderate', 'severe') then
    raise exception 'Invalid severity value';
  end if;

  update public.hazard_reports
     set severity = p_severity
   where report_id::text = p_report_id
     and user_id::text = auth.uid()::text
     and status in ('pending', 'under_review');
end;
$$;

revoke all on function public.set_own_report_severity(text, text) from public;
grant execute on function public.set_own_report_severity(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Let the reporter see the assignment status for their own report.
-- This powers the display-only "For Inspection" state without adding a new
-- status value to hazard_reports.
-- ---------------------------------------------------------------------------
drop policy if exists "Citizens can view own report assignments" on public.inspector_assignments;

create policy "Citizens can view own report assignments"
on public.inspector_assignments
for select
to authenticated
using (
  exists (
    select 1
    from public.hazard_reports r
    where r.report_id = inspector_assignments.report_id
      and r.user_id::text = auth.uid()::text
  )
);

-- ---------------------------------------------------------------------------
-- Let the reporter read the saved AI detection for their own report. The
-- submission policy above is INSERT-only, so without this the UI fallback
-- cannot recover a severity that was never copied onto the report row.
-- ---------------------------------------------------------------------------
drop policy if exists "Citizens can view their own report's AI detection"
on public.hazard_detection_results;

create policy "Citizens can view their own report's AI detection"
on public.hazard_detection_results
for select
to authenticated
using (
  exists (
    select 1
    from public.hazard_reports r
    where r.report_id = hazard_detection_results.report_id
      and r.user_id::text = auth.uid()::text
  )
);

-- ---------------------------------------------------------------------------
-- One-time backfill: reports saved before the severity write was added keep
-- their saved detection result. Copy its level into the report column so every
-- role reads the same value. Safe to run more than once.
-- ---------------------------------------------------------------------------
update public.hazard_reports r
   set severity = d.severity_level
  from (
    select distinct on (report_id) report_id, severity_level
    from public.hazard_detection_results
    where severity_level in ('low', 'moderate', 'severe')
    order by report_id, detected_at desc
  ) d
 where r.report_id = d.report_id
   and (r.severity is null or btrim(r.severity) = '');
