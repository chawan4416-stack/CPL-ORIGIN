-- CPL Ver1.0 / grant API roles the table privileges required by RLS policies.
-- RLS remains the row-level security boundary.

grant select on table public.master_options to authenticated;

grant select, insert, update, delete on table public.races to authenticated;

grant select, insert, update, delete on table public.race_results to authenticated;
