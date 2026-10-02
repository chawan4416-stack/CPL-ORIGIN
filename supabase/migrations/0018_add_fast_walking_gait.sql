-- Add 早歩き to the existing gait master without changing other gait options.
insert into public.master_options (category, field_key, option_value, sort_order, active)
values ('BODY', 'GAIT', '早歩き', 60, true)
on conflict (category, field_key, option_value) do update
set sort_order = excluded.sort_order,
    active = true;
