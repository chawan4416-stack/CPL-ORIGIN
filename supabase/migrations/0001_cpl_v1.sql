-- CPL Ver1.0 / Supabase PostgreSQL
-- Source of truth for persistent data. No horse names or prediction data.

create extension if not exists pgcrypto;

create table public.races (
  id uuid primary key default gen_random_uuid(),
  race_date date not null,
  racecourse text not null,
  race_number smallint not null check (race_number between 1 and 99),
  course text not null,
  surface text not null,
  distance integer not null check (distance > 0),
  track_condition text not null,
  field_size smallint not null check (field_size > 0),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.race_results (
  id uuid primary key default gen_random_uuid(),
  race_id uuid not null references public.races(id) on delete cascade,
  finish_position smallint not null check (finish_position in (1, 2, 3)),
  popularity smallint not null check (popularity > 0),
  win_odds numeric(8,2) not null check (win_odds >= 0),
  chest text not null,
  hindquarter text not null,
  gait text not null,
  balance text not null,
  tone text not null,
  abdomen text not null,
  created_at timestamptz not null default now(),
  unique (race_id, finish_position)
);

create table public.master_options (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  field_key text not null,
  option_value text not null,
  sort_order smallint not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (category, field_key, option_value)
);

create index races_created_by_date_idx on public.races(created_by, race_date desc);
create index race_results_race_id_idx on public.race_results(race_id);
create index master_options_lookup_idx on public.master_options(category, field_key, active, sort_order);

alter table public.races enable row level security;
alter table public.race_results enable row level security;
alter table public.master_options enable row level security;

create policy "authenticated users read own races"
on public.races for select to authenticated
using (created_by = auth.uid());

create policy "authenticated users insert own races"
on public.races for insert to authenticated
with check (created_by = auth.uid());

create policy "authenticated users update own races"
on public.races for update to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

create policy "authenticated users delete own races"
on public.races for delete to authenticated
using (created_by = auth.uid());

create policy "authenticated users read own results"
on public.race_results for select to authenticated
using (exists (
  select 1 from public.races r
  where r.id = race_results.race_id and r.created_by = auth.uid()
));

create policy "authenticated users insert own results"
on public.race_results for insert to authenticated
with check (exists (
  select 1 from public.races r
  where r.id = race_results.race_id and r.created_by = auth.uid()
));

create policy "authenticated users update own results"
on public.race_results for update to authenticated
using (exists (
  select 1 from public.races r
  where r.id = race_results.race_id and r.created_by = auth.uid()
))
with check (exists (
  select 1 from public.races r
  where r.id = race_results.race_id and r.created_by = auth.uid()
));

create policy "authenticated users delete own results"
on public.race_results for delete to authenticated
using (exists (
  select 1 from public.races r
  where r.id = race_results.race_id and r.created_by = auth.uid()
));

create policy "authenticated users read active masters"
on public.master_options for select to authenticated
using (active = true);

insert into public.master_options (category, field_key, option_value, sort_order) values
('RACE', 'RACECOURSE', '札幌', 10),
('RACE', 'RACECOURSE', '函館', 20),
('RACE', 'RACECOURSE', '福島', 30),
('RACE', 'RACECOURSE', '新潟', 40),
('RACE', 'RACECOURSE', '東京', 50),
('RACE', 'RACECOURSE', '中山', 60),
('RACE', 'RACECOURSE', '中京', 70),
('RACE', 'RACECOURSE', '京都', 80),
('RACE', 'RACECOURSE', '阪神', 90),
('RACE', 'RACECOURSE', '小倉', 100),
('RACE', 'RACECOURSE', '大井', 110),
('RACE', 'RACECOURSE', '船橋', 120),
('RACE', 'RACECOURSE', '川崎', 130),
('RACE', 'RACECOURSE', '浦和', 140),
('RACE', 'RACECOURSE', '園田', 150),
('RACE', 'RACECOURSE', '盛岡', 160),
('RACE', 'SURFACE', '芝', 10),
('RACE', 'SURFACE', 'ダート', 20),
('RACE', 'TRACK_CONDITION', '良', 10),
('RACE', 'TRACK_CONDITION', '稍重', 20),
('RACE', 'TRACK_CONDITION', '重', 30),
('RACE', 'TRACK_CONDITION', '不良', 40),
('BODY', 'CHEST', 'シャープ', 10),
('BODY', 'CHEST', '普通', 20),
('BODY', 'CHEST', '厚', 30),
('BODY', 'CHEST', '重厚', 40),
('BODY', 'HINDQUARTER', 'シャープ', 10),
('BODY', 'HINDQUARTER', '普通', 20),
('BODY', 'HINDQUARTER', '厚', 30),
('BODY', 'HINDQUARTER', '重厚', 40),
('BODY', 'GAIT', 'チャカ付き', 10),
('BODY', 'GAIT', '歩幅短い', 20),
('BODY', 'GAIT', '歩幅長い', 30),
('BODY', 'GAIT', '普通', 40),
('BODY', 'GAIT', 'スムーズ', 50),
('BODY', 'BALANCE', '良い', 10),
('BODY', 'BALANCE', '普通', 20),
('BODY', 'BALANCE', '悪い', 30),
('BODY', 'TONE', 'パンパン', 10),
('BODY', 'TONE', '普通', 20),
('BODY', 'TONE', 'ゴム感', 30),
('BODY', 'ABDOMEN', '普通', 10),
('BODY', 'ABDOMEN', '太い', 20)
on conflict (category, field_key, option_value) do nothing;

create or replace function public.save_race(
  p_race jsonb,
  p_results jsonb
) returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_race_id uuid;
  v_item jsonb;
  v_position integer;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if jsonb_typeof(p_results) <> 'array' or jsonb_array_length(p_results) <> 3 then
    raise exception 'THREE_RESULTS_REQUIRED';
  end if;

  insert into public.races (
    race_date, racecourse, race_number, course, surface,
    distance, track_condition, field_size, created_by
  ) values (
    (p_race->>'race_date')::date,
    p_race->>'racecourse',
    (p_race->>'race_number')::smallint,
    p_race->>'course',
    p_race->>'surface',
    (p_race->>'distance')::integer,
    p_race->>'track_condition',
    (p_race->>'field_size')::smallint,
    auth.uid()
  ) returning id into v_race_id;

  for v_item in select value from jsonb_array_elements(p_results)
  loop
    v_position := (v_item->>'finish_position')::integer;
    if v_position not in (1,2,3) then
      raise exception 'INVALID_FINISH_POSITION';
    end if;

    insert into public.race_results (
      race_id, finish_position, popularity, win_odds,
      chest, hindquarter, gait, balance, tone, abdomen
    ) values (
      v_race_id,
      v_position,
      (v_item->>'popularity')::smallint,
      (v_item->>'win_odds')::numeric,
      v_item->>'chest',
      v_item->>'hindquarter',
      v_item->>'gait',
      v_item->>'balance',
      v_item->>'tone',
      v_item->>'abdomen'
    );
  end loop;

  return v_race_id;
exception when others then
  raise;
end;
$$;

grant execute on function public.save_race(jsonb, jsonb) to authenticated;
