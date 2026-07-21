-- Datos semilla del Laboratorio Digital 310: 30 estaciones placeholder.
-- El informe preliminar estima ~30 equipos; se numeran PC-01..PC-30 en 3 filas.
-- Todo es demo: sin datos personales. Ajustar tras el inventario físico real.
--
-- Idempotente: on conflict do nothing por `codigo`.

insert into equipos (codigo, etiqueta, ubicacion, cpu, monitor, perifericos, estado)
select
  'PC-' || lpad(n::text, 2, '0')                                   as codigo,
  'Estación ' || lpad(n::text, 2, '0')                             as etiqueta,
  'Fila ' || chr(65 + (n - 1) / 10)                                as ubicacion, -- A / B / C
  'Por inventariar'                                                as cpu,
  'Por inventariar'                                                as monitor,
  array['teclado', 'mouse']                                        as perifericos,
  'OPERATIVO'::equipo_estado                                       as estado
from generate_series(1, 30) as n
on conflict (codigo) do nothing;

-- Un par de estados no-operativos para que la demo muestre los colores/estados
-- del tablero desde el primer despliegue (ajustar tras diagnóstico real).
update equipos set estado = 'CON_FALLAS'       where codigo = 'PC-07';
update equipos set estado = 'FUERA_DE_SERVICIO' where codigo = 'PC-13';
update equipos set estado = 'EN_MANTENIMIENTO'  where codigo = 'PC-22';

-- Incidencia de ejemplo asociada a un equipo con fallas.
insert into incidencias (equipo_id, tipo, severidad, descripcion, reporta_nombre, reporta_rol)
select id, 'HARDWARE', 'ALTA', 'El equipo enciende pero el monitor no recibe señal.', 'Demo', 'docente'
from equipos where codigo = 'PC-07'
on conflict do nothing;
