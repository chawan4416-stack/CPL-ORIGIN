-- CPL Ver1.0: remove distances incorrectly seeded by 0010.
-- Restrict deletion to the COURSE_DISTANCE master rows listed below.

delete from public.master_options
where category = 'COURSE_DISTANCE'
  and (field_key, option_value) in (
    ('東京:芝:1200', '通常'),
    ('東京:芝:1300', '通常'),
    ('東京:芝:2100', '通常'),
    ('中京:芝:1800', '通常'),
    ('中京:芝:2500', '通常'),
    ('京都:芝:1000', '内回り')
  );
