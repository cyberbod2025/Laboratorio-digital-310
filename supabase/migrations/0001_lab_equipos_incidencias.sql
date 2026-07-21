-- Laboratorio Digital 310 — Esquema base del sistema de inventario e incidencias.
--
-- Objetivo: informar el estado de cada equipo de cómputo mediante el escaneo de
-- un QR y permitir reportar posibles fallos sin iniciar sesión.
--
-- Alcance de privacidad: este esquema NO almacena datos personales de alumnos ni
-- de familias. Solo equipos de cómputo, su estado e incidencias técnicas. El
-- nombre de quien reporta es opcional y de captura libre (docente/alumno), nunca
-- un dato sensible.

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------
create type equipo_estado as enum (
  'OPERATIVO',        -- enciende y funciona con normalidad
  'CON_FALLAS',       -- funciona parcialmente / tiene incidencias abiertas
  'EN_MANTENIMIENTO', -- en revisión o reparación
  'FUERA_DE_SERVICIO' -- no operativo
);

create type incidencia_tipo as enum (
  'HARDWARE',
  'RED',
  'SOFTWARE',
  'PERIFERICOS',
  'LIMPIEZA',
  'OTRO'
);

create type incidencia_severidad as enum ('BAJA', 'MEDIA', 'ALTA');

create type incidencia_estado as enum (
  'ABIERTA',
  'EN_PROCESO',
  'RESUELTA',
  'DESCARTADA'
);

-- ---------------------------------------------------------------------------
-- Utilidad: refresca updated_at en cada UPDATE
-- ---------------------------------------------------------------------------
create function touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- equipos — una fila por estación del laboratorio. `codigo` es lo que viaja
-- dentro del QR (p. ej. PC-01) y es la clave pública para abrir la ficha.
-- ---------------------------------------------------------------------------
create table equipos (
  id          uuid primary key default gen_random_uuid(),
  codigo      text          not null unique,
  etiqueta    text          not null,
  ubicacion   text,
  cpu         text,
  monitor     text,
  perifericos text[]        not null default '{}',
  estado      equipo_estado not null default 'OPERATIVO',
  notas       text,
  created_at  timestamptz   not null default now(),
  updated_at  timestamptz   not null default now(),
  constraint equipos_codigo_formato check (codigo ~ '^[A-Za-z0-9_-]{2,32}$'),
  constraint equipos_etiqueta_len   check (char_length(etiqueta) between 1 and 120)
);

create index equipos_estado_idx on equipos (estado);

create trigger equipos_touch_updated_at
  before update on equipos
  for each row execute function touch_updated_at();

-- ---------------------------------------------------------------------------
-- incidencias — reportes de falla contra un equipo. Cualquiera (anon) puede
-- crear una incidencia al escanear el QR; solo personal autenticado la resuelve.
-- ---------------------------------------------------------------------------
create table incidencias (
  id             uuid                 primary key default gen_random_uuid(),
  equipo_id      uuid                 not null references equipos (id) on delete cascade,
  tipo           incidencia_tipo      not null,
  severidad      incidencia_severidad not null default 'MEDIA',
  descripcion    text                 not null,
  reporta_nombre text,
  reporta_rol    text,
  estado         incidencia_estado    not null default 'ABIERTA',
  resolucion     text,
  created_at     timestamptz          not null default now(),
  updated_at     timestamptz          not null default now(),
  resolved_at    timestamptz,
  constraint incidencias_descripcion_len check (char_length(descripcion) between 3 and 2000),
  constraint incidencias_reporta_len     check (reporta_nombre is null or char_length(reporta_nombre) <= 120)
);

create index incidencias_equipo_idx on incidencias (equipo_id);
create index incidencias_abiertas_idx on incidencias (equipo_id) where estado in ('ABIERTA', 'EN_PROCESO');

create trigger incidencias_touch_updated_at
  before update on incidencias
  for each row execute function touch_updated_at();

-- Sella resolved_at cuando una incidencia pasa a RESUELTA/DESCARTADA.
create function stamp_incidencia_resolved()
returns trigger
language plpgsql
as $$
begin
  if new.estado in ('RESUELTA', 'DESCARTADA') and old.estado not in ('RESUELTA', 'DESCARTADA') then
    new.resolved_at = now();
  elsif new.estado in ('ABIERTA', 'EN_PROCESO') then
    new.resolved_at = null;
  end if;
  return new;
end;
$$;

create trigger incidencias_stamp_resolved
  before update on incidencias
  for each row execute function stamp_incidencia_resolved();

-- ---------------------------------------------------------------------------
-- Vista de resumen para el inventario: estado + conteo de incidencias abiertas.
-- ---------------------------------------------------------------------------
create view equipos_resumen as
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

-- ---------------------------------------------------------------------------
-- Seguridad a nivel de fila (RLS)
--
-- Modelo del MVP (escaneo anónimo):
--   * equipos      → lectura pública; escritura solo personal autenticado.
--   * incidencias  → lectura pública + ALTA pública (reportar falla);
--                    actualización/borrado solo personal autenticado.
-- Cuando exista login de personal (rol `authenticated`), estas políticas ya
-- dejan resolver y administrar sin cambios de esquema.
-- ---------------------------------------------------------------------------
alter table equipos     enable row level security;
alter table incidencias enable row level security;

-- equipos: cualquiera lee la ficha.
create policy equipos_read_public
  on equipos for select
  to anon, authenticated
  using (true);

-- equipos: solo personal autenticado modifica el inventario o el estado.
create policy equipos_write_staff
  on equipos for all
  to authenticated
  using (true)
  with check (true);

-- incidencias: cualquiera lee el historial del equipo.
create policy incidencias_read_public
  on incidencias for select
  to anon, authenticated
  using (true);

-- incidencias: cualquiera reporta una falla, pero solo puede nacer ABIERTA.
create policy incidencias_insert_public
  on incidencias for insert
  to anon, authenticated
  with check (estado = 'ABIERTA' and resolucion is null and resolved_at is null);

-- incidencias: solo personal autenticado da seguimiento / resuelve.
create policy incidencias_update_staff
  on incidencias for update
  to authenticated
  using (true)
  with check (true);

create policy incidencias_delete_staff
  on incidencias for delete
  to authenticated
  using (true);
