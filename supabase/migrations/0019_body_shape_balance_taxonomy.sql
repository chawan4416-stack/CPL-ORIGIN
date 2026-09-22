DO $$ BEGIN IF EXISTS (SELECT 1 FROM public.races) OR EXISTS (SELECT 1 FROM public.race_results) THEN RAISE EXCEPTION 'Race data exists'; END IF; END $$;
DELETE FROM public.master_options WHERE category='BODY' AND field_key IN ('CHEST','HINDQUARTER','BALANCE');
INSERT INTO public.master_options(category,field_key,option_value,sort_order,active) VALUES
('BODY','CHEST','シャープ',10,true),('BODY','CHEST','複合型（シャープ×厚）',20,true),('BODY','CHEST','厚',30,true),('BODY','CHEST','重厚',40,true),
('BODY','HINDQUARTER','シャープ',10,true),('BODY','HINDQUARTER','複合型（シャープ×厚）',20,true),('BODY','HINDQUARTER','厚',30,true),('BODY','HINDQUARTER','重厚',40,true),
('BODY','BALANCE','前傾',10,true),('BODY','BALANCE','後傾',20,true),('BODY','BALANCE','均整',30,true),('BODY','BALANCE','不均整',40,true);
