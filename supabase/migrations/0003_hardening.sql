-- Endurecimiento tras los advisories de seguridad de Supabase.
-- (Migración append-only: complementa 0001, no la reescribe.)

-- 1) La vista de resumen debe respetar la RLS del usuario que consulta, no la
--    del dueño de la vista (evita el lint ERROR "security_definer_view").
create or replace view equipos_resumen with (security_invoker = true) as
  select
    e.id,
    e.codigo,
    e.etiqueta,
    e.ubicacion,
    e.estado,
    e.updated_at,
    count(i.id) filter (where i.estado in ('ABIERTA', 'EN_PROCESO')) as incidencias_abiertas
  from equipos e
  left join incidencias i on i.equipo_id = e.id
  group by e.id;

-- 2) Fijar search_path en las funciones trigger (lint "function_search_path_mutable").
alter function public.touch_updated_at() set search_path = '';
alter function public.stamp_incidencia_resolved() set search_path = '';

-- 3) Retirar las políticas de escritura "always true" para `authenticated`.
--    Todavía no existe login de personal y los signups podrían estar habilitados,
--    por lo que ningún usuario firmado debe poder escribir aún. Mientras tanto, la
--    gestión del inventario e incidencias se hace desde el panel de Supabase
--    (service_role, que omite RLS). Cuando exista login de staff con roles se
--    agregarán políticas acotadas (equivalente a StaffPermissions del proyecto SASE).
drop policy if exists equipos_write_staff      on equipos;
drop policy if exists incidencias_update_staff on incidencias;
drop policy if exists incidencias_delete_staff on incidencias;
