-- Corrige etiquetas visibles sin modificar los rangos configurados por el equipo.
update public.thresholds
set name = case color
  when 'rojo'::public.threshold_color then 'Crítico'
  when 'verde'::public.threshold_color then 'Óptimo'
  else name
end
where color in (
  'rojo'::public.threshold_color,
  'verde'::public.threshold_color
);

notify pgrst, 'reload schema';
