-- Datos no sensibles para desarrollo local.
-- Los umbrales se insertan solo si las migraciones no crearon valores iniciales.
insert into public.thresholds (name, min_value, max_value, color)
select seed.name, seed.min_value, seed.max_value, seed.color::public.threshold_color
from (
  values
    ('Crítico', 0, 59, 'rojo'),
    ('Aceptable', 60, 84, 'amarillo'),
    ('Óptimo', 85, 100, 'verde')
) as seed(name, min_value, max_value, color)
where not exists (select 1 from public.thresholds);
