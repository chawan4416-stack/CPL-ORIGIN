-- CPL Ver1.0 input master expansion.
-- Adds course/distance masters and per-result paddock evaluation.

alter table public.race_results
  add column if not exists paddock_evaluation text;

update public.race_results
set paddock_evaluation = '普通'
where paddock_evaluation is null;

alter table public.race_results
  alter column paddock_evaluation set not null;

alter table public.race_results
  drop constraint if exists race_results_paddock_evaluation_check;

alter table public.race_results
  add constraint race_results_paddock_evaluation_check
  check (paddock_evaluation in ('悪い', '普通', '良い'));

insert into public.master_options (category, field_key, option_value, sort_order) values
('BODY', 'PADDOCK_EVALUATION', '悪い', 10),
('BODY', 'PADDOCK_EVALUATION', '普通', 20),
('BODY', 'PADDOCK_EVALUATION', '良い', 30)
on conflict (category, field_key, option_value) do nothing;

insert into public.master_options (category, field_key, option_value, sort_order) values
('COURSE', '札幌', '通常', 10),
('COURSE', '函館', '通常', 10),
('COURSE', '福島', '通常', 10),
('COURSE', '新潟', '内回り', 10),
('COURSE', '新潟', '外回り', 20),
('COURSE', '新潟', '直線', 30),
('COURSE', '東京', '通常', 10),
('COURSE', '中山', '内回り', 10),
('COURSE', '中山', '外回り', 20),
('COURSE', '中京', '通常', 10),
('COURSE', '京都', '内回り', 10),
('COURSE', '京都', '外回り', 20),
('COURSE', '阪神', '内回り', 10),
('COURSE', '阪神', '外回り', 20),
('COURSE', '小倉', '通常', 10),
('COURSE', '大井', '通常', 10),
('COURSE', '船橋', '通常', 10),
('COURSE', '川崎', '通常', 10),
('COURSE', '浦和', '通常', 10),
('COURSE', '園田', '通常', 10),
('COURSE', '盛岡', '通常', 10)
on conflict (category, field_key, option_value) do nothing;

insert into public.master_options (category, field_key, option_value, sort_order) values
('DISTANCE', '札幌', '1000', 10),('DISTANCE', '札幌', '1200', 20),('DISTANCE', '札幌', '1500', 30),('DISTANCE', '札幌', '1700', 40),('DISTANCE', '札幌', '1800', 50),('DISTANCE', '札幌', '2000', 60),('DISTANCE', '札幌', '2400', 70),('DISTANCE', '札幌', '2600', 80),
('DISTANCE', '函館', '1000', 10),('DISTANCE', '函館', '1200', 20),('DISTANCE', '函館', '1700', 30),('DISTANCE', '函館', '1800', 40),('DISTANCE', '函館', '2000', 50),('DISTANCE', '函館', '2400', 60),('DISTANCE', '函館', '2600', 70),
('DISTANCE', '福島', '1000', 10),('DISTANCE', '福島', '1150', 20),('DISTANCE', '福島', '1200', 30),('DISTANCE', '福島', '1700', 40),('DISTANCE', '福島', '1800', 50),('DISTANCE', '福島', '2000', 60),('DISTANCE', '福島', '2400', 70),('DISTANCE', '福島', '2600', 80),
('DISTANCE', '新潟', '1000', 10),('DISTANCE', '新潟', '1200', 20),('DISTANCE', '新潟', '1400', 30),('DISTANCE', '新潟', '1600', 40),('DISTANCE', '新潟', '1700', 50),('DISTANCE', '新潟', '1800', 60),('DISTANCE', '新潟', '2000', 70),('DISTANCE', '新潟', '2200', 80),('DISTANCE', '新潟', '2400', 90),('DISTANCE', '新潟', '2500', 100),('DISTANCE', '新潟', '3000', 110),('DISTANCE', '新潟', '3200', 120),
('DISTANCE', '東京', '1200', 10),('DISTANCE', '東京', '1300', 20),('DISTANCE', '東京', '1400', 30),('DISTANCE', '東京', '1600', 40),('DISTANCE', '東京', '1800', 50),('DISTANCE', '東京', '2000', 60),('DISTANCE', '東京', '2100', 70),('DISTANCE', '東京', '2300', 80),('DISTANCE', '東京', '2400', 90),('DISTANCE', '東京', '2500', 100),('DISTANCE', '東京', '2600', 110),('DISTANCE', '東京', '3400', 120),
('DISTANCE', '中山', '1000', 10),('DISTANCE', '中山', '1200', 20),('DISTANCE', '中山', '1600', 30),('DISTANCE', '中山', '1700', 40),('DISTANCE', '中山', '1800', 50),('DISTANCE', '中山', '2000', 60),('DISTANCE', '中山', '2200', 70),('DISTANCE', '中山', '2400', 80),('DISTANCE', '中山', '2500', 90),('DISTANCE', '中山', '2600', 100),('DISTANCE', '中山', '3200', 110),('DISTANCE', '中山', '3600', 120),('DISTANCE', '中山', '4000', 130),
('DISTANCE', '中京', '1200', 10),('DISTANCE', '中京', '1300', 20),('DISTANCE', '中京', '1400', 30),('DISTANCE', '中京', '1600', 40),('DISTANCE', '中京', '1800', 50),('DISTANCE', '中京', '1900', 60),('DISTANCE', '中京', '2000', 70),('DISTANCE', '中京', '2200', 80),('DISTANCE', '中京', '2500', 90),('DISTANCE', '中京', '3000', 100),
('DISTANCE', '京都', '1000', 10),('DISTANCE', '京都', '1100', 20),('DISTANCE', '京都', '1200', 30),('DISTANCE', '京都', '1400', 40),('DISTANCE', '京都', '1600', 50),('DISTANCE', '京都', '1800', 60),('DISTANCE', '京都', '1900', 70),('DISTANCE', '京都', '2000', 80),('DISTANCE', '京都', '2200', 90),('DISTANCE', '京都', '2400', 100),('DISTANCE', '京都', '2600', 110),('DISTANCE', '京都', '3000', 120),('DISTANCE', '京都', '3200', 130),
('DISTANCE', '阪神', '1200', 10),('DISTANCE', '阪神', '1400', 20),('DISTANCE', '阪神', '1600', 30),('DISTANCE', '阪神', '1800', 40),('DISTANCE', '阪神', '2000', 50),('DISTANCE', '阪神', '2200', 60),('DISTANCE', '阪神', '2400', 70),('DISTANCE', '阪神', '2600', 80),('DISTANCE', '阪神', '3000', 90),('DISTANCE', '阪神', '3200', 100),
('DISTANCE', '小倉', '1000', 10),('DISTANCE', '小倉', '1200', 20),('DISTANCE', '小倉', '1700', 30),('DISTANCE', '小倉', '1800', 40),('DISTANCE', '小倉', '2000', 50),('DISTANCE', '小倉', '2400', 60),('DISTANCE', '小倉', '2600', 70),
('DISTANCE', '大井', '1000', 10),('DISTANCE', '大井', '1200', 20),('DISTANCE', '大井', '1400', 30),('DISTANCE', '大井', '1500', 40),('DISTANCE', '大井', '1600', 50),('DISTANCE', '大井', '1700', 60),('DISTANCE', '大井', '1800', 70),('DISTANCE', '大井', '2000', 80),('DISTANCE', '大井', '2400', 90),('DISTANCE', '大井', '2600', 100),
('DISTANCE', '船橋', '1000', 10),('DISTANCE', '船橋', '1200', 20),('DISTANCE', '船橋', '1400', 30),('DISTANCE', '船橋', '1500', 40),('DISTANCE', '船橋', '1600', 50),('DISTANCE', '船橋', '1700', 60),('DISTANCE', '船橋', '1800', 70),('DISTANCE', '船橋', '2200', 80),('DISTANCE', '船橋', '2400', 90),
('DISTANCE', '川崎', '900', 10),('DISTANCE', '川崎', '1000', 20),('DISTANCE', '川崎', '1200', 30),('DISTANCE', '川崎', '1300', 40),('DISTANCE', '川崎', '1400', 50),('DISTANCE', '川崎', '1500', 60),('DISTANCE', '川崎', '1600', 70),('DISTANCE', '川崎', '1700', 80),('DISTANCE', '川崎', '1800', 90),('DISTANCE', '川崎', '2000', 100),('DISTANCE', '川崎', '2100', 110),('DISTANCE', '川崎', '2400', 120),('DISTANCE', '川崎', '2500', 130),
('DISTANCE', '浦和', '800', 10),('DISTANCE', '浦和', '1300', 20),('DISTANCE', '浦和', '1400', 30),('DISTANCE', '浦和', '1500', 40),('DISTANCE', '浦和', '1600', 50),('DISTANCE', '浦和', '1900', 60),('DISTANCE', '浦和', '2000', 70),
('DISTANCE', '園田', '820', 10),('DISTANCE', '園田', '1230', 20),('DISTANCE', '園田', '1400', 30),('DISTANCE', '園田', '1700', 40),('DISTANCE', '園田', '1870', 50),('DISTANCE', '園田', '2400', 60),
('DISTANCE', '盛岡', '1000', 10),('DISTANCE', '盛岡', '1200', 20),('DISTANCE', '盛岡', '1400', 30),('DISTANCE', '盛岡', '1600', 40),('DISTANCE', '盛岡', '1700', 50),('DISTANCE', '盛岡', '1800', 60),('DISTANCE', '盛岡', '2000', 70),('DISTANCE', '盛岡', '2400', 80)
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
      chest, hindquarter, gait, balance, tone, abdomen, paddock_evaluation
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
      v_item->>'abdomen',
      v_item->>'paddock_evaluation'
    );
  end loop;

  return v_race_id;
end;
$$;

grant execute on function public.save_race(jsonb, jsonb) to authenticated;
