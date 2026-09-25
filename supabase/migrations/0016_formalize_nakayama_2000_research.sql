-- CPL Course Research / formal Nakayama 2000m template
-- Keep physical-course research independent from accumulated race-result analysis.

alter table public.course_research
  add column if not exists course_structure jsonb not null default '{}'::jsonb,
  add column if not exists analysis jsonb not null default '{"status":"collecting","label":"データ蓄積中","message":"1〜3着馬の馬体データが蓄積されるまで、分析結果は確定しません。"}'::jsonb;

insert into public.course_research (
  racecourse,
  surface,
  distance,
  course,
  title,
  official_source_url,
  facts,
  flow,
  points,
  requirements,
  course_structure,
  ideal_body_hypothesis,
  analysis,
  summary,
  status,
  researched_at
) values (
  '中山',
  '芝',
  2000,
  '内回り',
  '中山｜芝｜2000m｜内回り',
  'https://www.jra.go.jp/facilities/race/nakayama/course/',
  '[
    "芝2000mは内回りを使用",
    "直線は310m",
    "芝コース全体の高低差は5.3m",
    "スタートは直線入口付近。Aコース使用時は1コーナーまで404.9m",
    "スタート直後に急坂を上る",
    "1コーナーから向正面にかけて下りが続く",
    "残り600m標識は3コーナー",
    "ゴール前の急坂は残り180mから70mにかけて高低差2.2m"
  ]'::jsonb,
  '["上り負荷","下り加速","高速小回り","短い直線"]'::jsonb,
  '[
    "スタート直後から坂を上りながら最初のコーナーへ向かう",
    "向正面へ下り、自然に速度が上がりやすい",
    "速度を保った状態でタイトな3〜4コーナーを処理する",
    "310mの短い直線内にゴール前急坂がある"
  ]'::jsonb,
  '[
    "上りで出力する力",
    "下りで得た速度を維持する力",
    "速度を保ちながら小回りを処理する旋回力",
    "短い直線から急坂へ連続して対応する再出力"
  ]'::jsonb,
  '{
    "version": 1,
    "phases": [
      {
        "id": "climb",
        "label": "上り負荷",
        "range": {"from": "START", "to": "残1600m前後"},
        "description": "スタート直後に急坂を上り、最初のコーナーへ向かう。"
      },
      {
        "id": "descent",
        "label": "下り加速",
        "range": {"from": "残1600m前後", "to": "残600m前後"},
        "description": "1コーナーから向正面にかけて下り、自然に速度が上がる。"
      },
      {
        "id": "tight_turns",
        "label": "高速小回り",
        "range": {"from": "残600m前後", "to": "残310m前後"},
        "description": "下りで得た速度を保ちながら、タイトな3〜4コーナーを処理する。"
      },
      {
        "id": "short_straight",
        "label": "短い直線",
        "range": {"from": "残310m前後", "to": "GOAL"},
        "description": "最後の直線は約310m。短い直線で速度を維持しながらゴールへ向かう。",
        "subevents": [
          {
            "id": "final_slope",
            "label": "急坂",
            "range": {"from": "残180m前後", "to": "残70m前後"}
          }
        ]
      }
    ]
  }'::jsonb,
  '{
    "source": "course_research",
    "note": "コース構造から導いた並列仮説。実際の1〜3着馬データから導いた答えではない。",
    "variants": [
      {"label": "A案", "chest": "厚", "hindquarter": "シャープ", "tone": "ゴム感"},
      {"label": "B案", "chest": "厚", "hindquarter": "普通", "tone": "ゴム感〜普通"}
    ]
  }'::jsonb,
  '{
    "status": "collecting",
    "label": "データ蓄積中",
    "source": "race_results",
    "message": "1〜3着馬の馬体データが蓄積されるまで、分析結果は確定しません。",
    "comparison": null
  }'::jsonb,
  '下りで速度を上げ、その速度を持ったままタイトな3〜4角を処理し、310mの短い直線内にある急坂へ連続して移行するコース。',
  '仮説',
  date '2026-09-20'
)
on conflict (racecourse, surface, distance, course) do update set
  title = excluded.title,
  official_source_url = excluded.official_source_url,
  facts = excluded.facts,
  flow = excluded.flow,
  points = excluded.points,
  requirements = excluded.requirements,
  course_structure = excluded.course_structure,
  ideal_body_hypothesis = excluded.ideal_body_hypothesis,
  analysis = excluded.analysis,
  summary = excluded.summary,
  status = excluded.status,
  researched_at = excluded.researched_at,
  updated_at = now();
