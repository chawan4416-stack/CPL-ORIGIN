-- CPL Ver1.0 / JRA turf course-layout master
-- Purpose:
--   Bind JRA racecourse + turf distance to the actual course layout.
--   This is master data only. Processing/UI must read this data and must not hard-code it.
--
-- Source basis:
--   Current JRA official course pages for all 10 JRA racecourses.
--
-- COURSE_DISTANCE option_value meanings:
--   通常   = no inner/outer turf distinction at this distance
--   内回り = inner turf course
--   外回り = outer turf course
--   直線   = straight turf course (Niigata 1000m)
--
-- When the same racecourse + turf distance has both 内回り and 外回り,
-- two rows are intentionally stored. The UI must ask the researcher to choose.

insert into public.master_options (category, field_key, option_value, sort_order) values
-- 札幌：内外回りなし
('COURSE_DISTANCE', '札幌:芝:1000', '通常', 10),
('COURSE_DISTANCE', '札幌:芝:1200', '通常', 20),
('COURSE_DISTANCE', '札幌:芝:1500', '通常', 30),
('COURSE_DISTANCE', '札幌:芝:1800', '通常', 40),
('COURSE_DISTANCE', '札幌:芝:2000', '通常', 50),
('COURSE_DISTANCE', '札幌:芝:2600', '通常', 60),

-- 函館：内外回りなし
('COURSE_DISTANCE', '函館:芝:1000', '通常', 10),
('COURSE_DISTANCE', '函館:芝:1200', '通常', 20),
('COURSE_DISTANCE', '函館:芝:1700', '通常', 30),
('COURSE_DISTANCE', '函館:芝:1800', '通常', 40),
('COURSE_DISTANCE', '函館:芝:2000', '通常', 50),
('COURSE_DISTANCE', '函館:芝:2600', '通常', 60),

-- 福島：内外回りなし
('COURSE_DISTANCE', '福島:芝:1000', '通常', 10),
('COURSE_DISTANCE', '福島:芝:1200', '通常', 20),
('COURSE_DISTANCE', '福島:芝:1700', '通常', 30),
('COURSE_DISTANCE', '福島:芝:1800', '通常', 40),
('COURSE_DISTANCE', '福島:芝:2000', '通常', 50),
('COURSE_DISTANCE', '福島:芝:2600', '通常', 60),

-- 新潟：内外回り + 直線1000m
('COURSE_DISTANCE', '新潟:芝:1000', '直線', 10),
('COURSE_DISTANCE', '新潟:芝:1200', '内回り', 20),
('COURSE_DISTANCE', '新潟:芝:1400', '内回り', 30),
('COURSE_DISTANCE', '新潟:芝:1400', '外回り', 31),
('COURSE_DISTANCE', '新潟:芝:1600', '外回り', 40),
('COURSE_DISTANCE', '新潟:芝:1800', '外回り', 50),
('COURSE_DISTANCE', '新潟:芝:2000', '内回り', 60),
('COURSE_DISTANCE', '新潟:芝:2000', '外回り', 61),
('COURSE_DISTANCE', '新潟:芝:2200', '内回り', 70),
('COURSE_DISTANCE', '新潟:芝:2400', '内回り', 80),
('COURSE_DISTANCE', '新潟:芝:3000', '外回り', 90),
('COURSE_DISTANCE', '新潟:芝:3200', '外回り', 100),

-- 東京：内外回りなし
('COURSE_DISTANCE', '東京:芝:1400', '通常', 10),
('COURSE_DISTANCE', '東京:芝:1600', '通常', 20),
('COURSE_DISTANCE', '東京:芝:1800', '通常', 30),
('COURSE_DISTANCE', '東京:芝:2000', '通常', 40),
('COURSE_DISTANCE', '東京:芝:2300', '通常', 50),
('COURSE_DISTANCE', '東京:芝:2400', '通常', 60),
('COURSE_DISTANCE', '東京:芝:2500', '通常', 70),
('COURSE_DISTANCE', '東京:芝:2600', '通常', 80),
('COURSE_DISTANCE', '東京:芝:3400', '通常', 90),

-- 中山：2コーナーで内外が分岐、3コーナーで合流
('COURSE_DISTANCE', '中山:芝:1200', '外回り', 10),
('COURSE_DISTANCE', '中山:芝:1600', '外回り', 20),
('COURSE_DISTANCE', '中山:芝:1800', '内回り', 30),
('COURSE_DISTANCE', '中山:芝:2000', '内回り', 40),
('COURSE_DISTANCE', '中山:芝:2200', '外回り', 50),
('COURSE_DISTANCE', '中山:芝:2500', '内回り', 60),
('COURSE_DISTANCE', '中山:芝:2600', '外回り', 70),
('COURSE_DISTANCE', '中山:芝:3200', '外回り', 80),
('COURSE_DISTANCE', '中山:芝:3200', '内回り', 81),
('COURSE_DISTANCE', '中山:芝:3600', '内回り', 90),
('COURSE_DISTANCE', '中山:芝:4000', '外回り', 100),

-- 中京：内外回りなし
('COURSE_DISTANCE', '中京:芝:1200', '通常', 10),
('COURSE_DISTANCE', '中京:芝:1300', '通常', 20),
('COURSE_DISTANCE', '中京:芝:1400', '通常', 30),
('COURSE_DISTANCE', '中京:芝:1600', '通常', 40),
('COURSE_DISTANCE', '中京:芝:2000', '通常', 50),
('COURSE_DISTANCE', '中京:芝:2200', '通常', 60),
('COURSE_DISTANCE', '中京:芝:3000', '通常', 70),

-- 京都：3コーナー付近で内外が分岐、内外併存距離あり
('COURSE_DISTANCE', '京都:芝:1100', '内回り', 10),
('COURSE_DISTANCE', '京都:芝:1200', '内回り', 20),
('COURSE_DISTANCE', '京都:芝:1400', '内回り', 30),
('COURSE_DISTANCE', '京都:芝:1400', '外回り', 31),
('COURSE_DISTANCE', '京都:芝:1600', '内回り', 40),
('COURSE_DISTANCE', '京都:芝:1600', '外回り', 41),
('COURSE_DISTANCE', '京都:芝:1800', '外回り', 50),
('COURSE_DISTANCE', '京都:芝:2000', '内回り', 60),
('COURSE_DISTANCE', '京都:芝:2000', '外回り', 61),
('COURSE_DISTANCE', '京都:芝:2200', '外回り', 70),
('COURSE_DISTANCE', '京都:芝:2400', '外回り', 80),
('COURSE_DISTANCE', '京都:芝:3000', '外回り', 90),
('COURSE_DISTANCE', '京都:芝:3200', '外回り', 100),

-- 阪神：内外併存距離あり
('COURSE_DISTANCE', '阪神:芝:1200', '内回り', 10),
('COURSE_DISTANCE', '阪神:芝:1400', '内回り', 20),
('COURSE_DISTANCE', '阪神:芝:1400', '外回り', 21),
('COURSE_DISTANCE', '阪神:芝:1600', '外回り', 30),
('COURSE_DISTANCE', '阪神:芝:1800', '外回り', 40),
('COURSE_DISTANCE', '阪神:芝:2000', '内回り', 50),
('COURSE_DISTANCE', '阪神:芝:2200', '内回り', 60),
('COURSE_DISTANCE', '阪神:芝:2400', '外回り', 70),
('COURSE_DISTANCE', '阪神:芝:2600', '外回り', 80),
('COURSE_DISTANCE', '阪神:芝:3000', '内回り', 90),
('COURSE_DISTANCE', '阪神:芝:3200', '外回り', 100),
('COURSE_DISTANCE', '阪神:芝:3200', '内回り', 101),

-- 小倉：内外回りなし
('COURSE_DISTANCE', '小倉:芝:1000', '通常', 10),
('COURSE_DISTANCE', '小倉:芝:1200', '通常', 20),
('COURSE_DISTANCE', '小倉:芝:1700', '通常', 30),
('COURSE_DISTANCE', '小倉:芝:1800', '通常', 40),
('COURSE_DISTANCE', '小倉:芝:2000', '通常', 50),
('COURSE_DISTANCE', '小倉:芝:2600', '通常', 60)
on conflict (category, field_key, option_value) do nothing;
