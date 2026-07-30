begin;

select plan(3);

select has_column(
  'public',
  'answers',
  'audited_areas',
  'answers exposes the audited_areas column'
);

select col_type_is(
  'public',
  'answers',
  'audited_areas',
  'text[]',
  'answers.audited_areas uses text[]'
);

select col_not_null(
  'public',
  'answers',
  'audited_areas',
  'answers.audited_areas is required'
);

select * from finish();
rollback;
