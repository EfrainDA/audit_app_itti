begin;

select plan(10);

select has_table(
  'public',
  'catalog_items',
  'catalog_items stores the planning inventory'
);

select has_column(
  'public',
  'controls',
  'catalog_item_id',
  'controls reference their selected catalog item'
);

select col_type_is(
  'public',
  'controls',
  'catalog_item_id',
  'uuid',
  'controls.catalog_item_id uses uuid'
);

select has_index(
  'public',
  'catalog_items',
  'uq_catalog_items_scope_normalized_name',
  'catalog names have a normalized unique index per unit'
);

select has_column(
  'public',
  'catalog_items',
  'business_unit_id',
  'catalog items can be scoped to a business unit'
);

select has_column(
  'public',
  'catalog_items',
  'linked_product_id',
  'processes can reference a catalog product'
);

select has_table(
  'public',
  'catalog_process_products',
  'processes can reference multiple products'
);

select has_function(
  'public',
  'save_catalog_item',
  array['jsonb'],
  'catalog items and their product links are saved atomically'
);

select is(
  public.normalize_catalog_name('  Gestión   de Créditos '),
  public.normalize_catalog_name('gestion de creditos'),
  'catalog normalization ignores accents, case and repeated spaces'
);

select lives_ok(
  $$with unit as (
      insert into public.business_units (name, ecosystem)
      values ('Unidad catálogo test', 'Test')
      returning id
    )
    insert into public.catalog_items (category, name, subprocesses, business_unit_id)
    select 'proceso', 'Gestión de créditos', array['Alta', 'Baja'], id
    from unit$$,
  'a process can store its subprocess inventory'
);

select * from finish();
rollback;
