# Migración a Supabase — Laboratorio Digital 310

## Estado actual

La aplicación ya incluye integración híbrida con Supabase desde `index.html`.
El modo local con `localStorage` sigue siendo la fuente principal. Supabase actúa
como respaldo y sincronización institucional.

Para activar la sincronización necesitas:

1. Un proyecto Supabase (gratuito tier basta).
2. Ejecutar el SQL siguiente para crear tablas, bucket y políticas RLS.
3. Configurar SUPABASE_URL y SUPABASE_ANON_KEY en la app (botón ⚙ Supabase).
4. Insertar un `pilot_token` en la tabla `pilot_tokens` para autorizar escrituras.

---

## SQL completo

Ejecuta esto en **SQL Editor** de tu proyecto Supabase:

```sql
-- ============================================================
-- Laboratorio Digital 310 — Esquema Supabase
-- Versión: 1.0
-- ============================================================

-- 1. Tabla de tokens piloto (autoriza escritura sin login)
CREATE TABLE IF NOT EXISTS public.pilot_tokens (
  token text PRIMARY KEY,
  description text,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz
);

-- 2. Tabla de auditorías
CREATE TABLE IF NOT EXISTS public.lab_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT 'Auditoría Laboratorio Digital 310',
  school text DEFAULT 'Secundaria Diurna No. 310',
  client_id text,
  pilot_token text,
  created_by text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  status text DEFAULT 'draft',
  summary jsonb
);

-- 3. Tabla de estaciones
CREATE TABLE IF NOT EXISTS public.lab_stations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id uuid REFERENCES lab_audits(id) ON DELETE CASCADE,
  station_number int NOT NULL,
  status text NOT NULL,
  cpu_status text,
  monitor_status text,
  keyboard_status text,
  mouse_status text,
  network_status text,
  observations text,
  photo_path text,
  raw_data jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. Índices
CREATE INDEX IF NOT EXISTS idx_stations_audit_id ON lab_stations(audit_id);
CREATE INDEX IF NOT EXISTS idx_stations_number ON lab_stations(station_number);
CREATE UNIQUE INDEX IF NOT EXISTS idx_stations_audit_station ON lab_stations(audit_id, station_number);
CREATE INDEX IF NOT EXISTS idx_audits_client_id ON lab_audits(client_id);

-- 5. Bucket de fotos (ejecutar una vez)
INSERT INTO storage.buckets (id, name, public) VALUES ('station-photos', 'station-photos', false)
ON CONFLICT (id) DO NOTHING;

-- 6. Habilitar RLS
ALTER TABLE public.pilot_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_stations ENABLE ROW LEVEL SECURITY;

-- 7. Políticas RLS — Opción B (piloto con token)
-- Cualquiera puede leer tokens (necesario para la validación RLS)
CREATE POLICY "Leer pilot_tokens" ON public.pilot_tokens
  FOR SELECT USING (true);

-- lab_audits: insert/update permitido si pilot_token existe en tabla
CREATE POLICY "Insertar lab_audits con token" ON public.lab_audits
  FOR INSERT WITH CHECK (
    pilot_token IN (SELECT token FROM public.pilot_tokens WHERE expires_at IS NULL OR expires_at > now())
  );

CREATE POLICY "Actualizar lab_audits con token" ON public.lab_audits
  FOR UPDATE USING (
    pilot_token IN (SELECT token FROM public.pilot_tokens WHERE expires_at IS NULL OR expires_at > now())
  );

CREATE POLICY "Leer lab_audits con token" ON public.lab_audits
  FOR SELECT USING (
    pilot_token IN (SELECT token FROM public.pilot_tokens WHERE expires_at IS NULL OR expires_at > now())
  );

-- lab_stations: acceso a través del audit_id vinculado
CREATE POLICY "Insertar lab_stations con token" ON public.lab_stations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.lab_audits
      WHERE id = audit_id
      AND pilot_token IN (SELECT token FROM public.pilot_tokens WHERE expires_at IS NULL OR expires_at > now())
    )
  );

CREATE POLICY "Actualizar lab_stations con token" ON public.lab_stations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.lab_audits
      WHERE id = audit_id
      AND pilot_token IN (SELECT token FROM public.pilot_tokens WHERE expires_at IS NULL OR expires_at > now())
    )
  );

CREATE POLICY "Leer lab_stations con token" ON public.lab_stations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.lab_audits
      WHERE id = audit_id
      AND pilot_token IN (SELECT token FROM public.pilot_tokens WHERE expires_at IS NULL OR expires_at > now())
    )
  );

-- 8. Política para storage (bucket station-photos)
CREATE POLICY "Subir fotos con token" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'station-photos'
    AND EXISTS (
      SELECT 1 FROM public.pilot_tokens WHERE expires_at IS NULL OR expires_at > now()
    )
  );

CREATE POLICY "Leer fotos con token" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'station-photos'
    AND EXISTS (
      SELECT 1 FROM public.pilot_tokens WHERE expires_at IS NULL OR expires_at > now()
    )
  );
```

---

## Checklist de configuración en Supabase

- [ ] Crear proyecto en [supabase.com](https://supabase.com)
- [ ] Ejecutar el SQL completo en **SQL Editor**
- [ ] Ir a **Storage** y verificar que el bucket `station-photos` existe (no público)
- [ ] Ir a **Authentication > Settings** y desactivar "Enable email confirmations" si no se usa login (opcional)
- [ ] Generar un UUID como token piloto: `SELECT gen_random_uuid();`
- [ ] Insertar el token en `pilot_tokens`:
      ```sql
      INSERT INTO pilot_tokens (token, description)
      VALUES ('el-uuid-generado', 'Token piloto equipo auditor 2026');
      ```
- [ ] Copiar **Project URL** (Settings > API > Project URL) como `SUPABASE_URL`
- [ ] Copiar **anon public key** (Settings > API > anon public) como `SUPABASE_ANON_KEY`
- [ ] En la app, presionar ⚙ Supabase, pegar URL, anon key y token
- [ ] Presionar **Probar conexión** para verificar
- [ ] Presionar **Sincronizar con Supabase** para enviar datos

---

## Políticas RLS — Dos opciones

### Opción A: Modo privado con login futuro (recomendado para producción)

Requiere Supabase Auth. Las políticas usan `auth.uid()`:

```sql
CREATE POLICY "Propietario puede insertar" ON lab_audits
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Propietario puede ver sus datos" ON lab_audits
  FOR SELECT USING (created_by = auth.email());
```

No implementado en esta versión. Requiere flujo de login en el frontend.

### Opción B: Modo piloto con token (implementado actualmente)

Usa la tabla `pilot_tokens` como autorización. No requiere login.
Adecuado para el piloto institucional mientras se define el modelo de
usuarios definitivo. **Migrar a Opción A antes de producción.**

---

## Flujo de sincronización

```
Usuario guarda localmente (localStorage)
       │
       ▼
   ⚙ Configura Supabase (URL + anon key + token)
       │
       ▼
   Botón "Sincronizar con Supabase"
       │
       ├── upsert lab_audits (conflict: client_id)
       ├── por cada estación:
       │     ├── upload photo → station-photos bucket → photo_path
       │     └── upsert lab_stations (conflict: audit_id, station_number)
       │
       ▼
   Sync status: synced ✓
   (Si falla → error, se puede reintentar)
```

---

## Seguridad

- `SUPABASE_ANON_KEY` es pública (va en el frontend). Las políticas RLS
  controlan el acceso real.
- `service_role` **nunca** se usa en el frontend.
- El bucket `station-photos` es privado; solo se accede vía RLS.
- El token piloto debe mantenerse confidencial entre el equipo auditor.
- **Fase 2**: reemplazar token piloto por autenticación con correo institucional.

---

## Compatibilidad hacia atrás

La importación de respaldos JSON sigue funcionando independientemente de Supabase.
El flujo local (exportar JSON, restaurar JSON, informe HTML/PDF) no requiere
conexión ni configuración.

---

## Contrato de almacenamiento local

La interfaz `localAuditRepository` sigue siendo la fuente de verdad inmediata:

- `loadCurrent()` — obtiene la auditoría desde localStorage
- `saveCurrent(audit)` — persiste localmente
- `clearCurrent()` — elimina datos locales
- `serializedSize(audit)` — peso aproximado del respaldo

Supabase es una capa adicional de respaldo institucional, no un reemplazo
de localStorage en esta versión.
