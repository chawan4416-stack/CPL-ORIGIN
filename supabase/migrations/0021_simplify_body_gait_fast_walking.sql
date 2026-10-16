-- CPL 0021: simplified chest/hindquarter and gait, optional fast walking.
-- Pilot race reset explicitly approved; refuse if production data has grown.
DO $guard$
BEGIN
 IF (SELECT count(*) FROM public.races)>3
 OR (SELECT count(*) FROM public.race_results)>9
 OR (SELECT count(DISTINCT created_by) FROM public.races)>1
 THEN RAISE EXCEPTION 'Pilot reset guard failed'; END IF;
END $guard$;
DELETE FROM public.race_results;
DELETE FROM public.races;
ALTER TABLE public.race_results ADD COLUMN fast_walking text NULL
 CONSTRAINT race_results_fast_walking_check
 CHECK (fast_walking IS NULL OR fast_walking='早歩き');
DELETE FROM public.master_options
 WHERE category='BODY' AND field_key IN ('CHEST','HINDQUARTER','GAIT','FAST_WALKING');
INSERT INTO public.master_options(category,field_key,option_value,sort_order,active) VALUES
 ('BODY','CHEST','シャープ',10,true),
 ('BODY','CHEST','厚',20,true),
 ('BODY','CHEST','重厚',30,true),
 ('BODY','HINDQUARTER','シャープ',10,true),
 ('BODY','HINDQUARTER','厚',20,true),
 ('BODY','HINDQUARTER','重厚',30,true),
 ('BODY','GAIT','チャカつき',10,true),
 ('BODY','GAIT','ぎこちない',20,true),
 ('BODY','GAIT','普通',30,true),
 ('BODY','GAIT','スムーズ',40,true),
 ('BODY','FAST_WALKING','早歩き',10,true);
DO $patch$
DECLARE def text;
BEGIN
 def:=replace(pg_get_functiondef('public.save_race(jsonb,jsonb,uuid)'::regprocedure),chr(13),'');
 IF position($old$    if nullif(v_item->>'sweating','') is not null$old$ in def)=0
 THEN RAISE EXCEPTION 'Missing validation anchor'; END IF;
 def:=replace(def,$old$    if nullif(v_item->>'sweating','') is not null$old$,
 $new$    if nullif(v_item->>'fast_walking','') is not null
       and not exists (
         select 1 from public.master_options
         where category='BODY' and field_key='FAST_WALKING'
           and option_value=v_item->>'fast_walking' and active
       )
    then raise exception 'INVALID_BODY_MASTER:FAST_WALKING'; end if;

    if nullif(v_item->>'sweating','') is not null$new$);
 IF position($old$      chest,hindquarter,gait,balance,tone,agitation,sweating,paddock_evaluation$old$ in def)=0
 THEN RAISE EXCEPTION 'Missing insert columns anchor'; END IF;
 def:=replace(def,$old$      chest,hindquarter,gait,balance,tone,agitation,sweating,paddock_evaluation$old$,
 $new$      chest,hindquarter,gait,balance,tone,agitation,sweating,paddock_evaluation,fast_walking$new$);
 IF position($old$      v_item->>'paddock_evaluation'
    );$old$ in def)=0
 THEN RAISE EXCEPTION 'Missing insert values anchor'; END IF;
 def:=replace(def,$old$      v_item->>'paddock_evaluation'
    );$old$,
 $new$      v_item->>'paddock_evaluation',
      nullif(v_item->>'fast_walking','')
    );$new$);
 EXECUTE def;
END $patch$;