-- Run ONCE in the Supabase SQL editor (Dashboard -> SQL Editor).
--
-- Why: since the adviser's latest recommendation, the browser also saves the ML result
-- at the moment a citizen submits a report. Without this policy RLS rejects that insert,
-- so the admin would not see the result until someone clicks Run Detection manually.
--
-- Scope: INSERT only, only for a detection row whose report belongs to the signed-in
-- citizen. No table, column, data, or existing policy is changed. Re-running this file
-- replaces just this one policy.

drop policy if exists "Citizens can save their own report's AI detection"
on public.hazard_detection_results;

create policy "Citizens can save their own report's AI detection"
on public.hazard_detection_results
for insert to authenticated
with check (
  exists (
    select 1
    from public.hazard_reports as report
    where report.report_id = hazard_detection_results.report_id
      and report.user_id = auth.uid()
  )
);
