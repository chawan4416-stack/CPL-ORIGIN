-- Fix ambiguous PL/pgSQL variable v_item in duplicate-popularity validation.
-- Preserve the existing save_race implementation, security attributes, and all other behavior.
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
  select pg_get_functiondef('public.save_race(jsonb,jsonb,uuid)'::regprocedure)
    into original_definition;
  if original_definition is null then
    raise exception 'save_race function not found';
  end if;
  if strpos(original_definition, old_fragment) = 0 then
    raise exception 'Expected ambiguous query fragment not found; inspect save_race before changing';
  end if;
  corrected_definition := replace(original_definition, old_fragment, new_fragment);
  execute corrected_definition;
end
$fix$;
