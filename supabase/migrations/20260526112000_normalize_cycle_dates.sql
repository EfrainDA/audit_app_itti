-- Keep every bimonthly cycle aligned to day 01 and the last day of its second month.

update public.cycles
set
  start_date = make_date(year, ((bimester - 1) * 2) + 1, 1),
  end_date = (
    make_date(year, ((bimester - 1) * 2) + 1, 1)
    + interval '2 months'
    - interval '1 day'
  )::date;

notify pgrst, 'reload schema';
