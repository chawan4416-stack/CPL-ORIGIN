-- Fix ambiguous v_item in save_race; normalize existing CRLF function source.
do $fix$
declare
  original_definition text;
  corrected_definition text;
  old_fragment text := 'select v_item->>''popularity''
    from jsonb_array_elements(p_results) v_item
    group by v_item->>''popularity''';
  new_fragment text := 'select result_row.value->>''popularity''
    from jsonb_array_elements(p_results) as result_row(value)
    group by result_row.value->>''popularity''';
begin
  select replace(pg_get_functiondef('public.save_race(jsonb,jsonb,uuid)'::regprocedure), chr(13), '')
    into original_definition;
  if original_definition is null then raise exception 'save_race function not found'; end if;
  if strpos(original_definition, old_fragment) = 0 then
    raise exception 'Expected query fragment not found';
  end if;
  corrected_definition := replace(original_definition, old_fragment, new_fragment);
  execute corrected_definition;
end $fix$;
