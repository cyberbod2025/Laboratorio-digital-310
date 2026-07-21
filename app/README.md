# App — Laboratorio Digital 310

App web para **informar el estado de los equipos de cómputo** del laboratorio y
**reportar fallas escaneando un QR**. Materializa la visión del informe
preliminar (`../informe-preliminar.html`): inventario por estación, incidencias,
historial y reportes para Dirección, sin depender de bitácoras en papel.

## Cómo funciona

- **Estática + Supabase.** Es HTML/CSS/JS sin framework (desplegable en Vercel).
  Los datos viven en Supabase; el navegador habla con él usando la anon key y las
  políticas **RLS** definidas en `../supabase/migrations/`.
- **Una página, dos vistas** (`app.js`):
  - Sin parámetro → **Inventario**: tablero de estados + rejilla de equipos +
    generador de **etiquetas QR** para imprimir.
  - `?e=PC-07` → **Ficha** del equipo: datos, estado, historial de incidencias y
    formulario para **reportar una falla** (sin iniciar sesión).
- **El QR de cada estación** codifica la URL de su ficha
  (`https://<dominio>/app/?e=PC-07`). Al escanearlo, quien esté frente al equipo
  ve su estado y puede reportar el problema.
- **Modo demo.** Mientras `config.js` no tenga una anon key válida, la app corre
  con datos de ejemplo en memoria (no guarda nada). Sirve para previsualizar el
  diseño antes de conectar la base.

## Modelo de datos (ver `../supabase/migrations/0001_lab_equipos_incidencias.sql`)

- `equipos` — una fila por estación. `codigo` (p. ej. `PC-07`) es lo que viaja en
  el QR. Estados: `OPERATIVO`, `CON_FALLAS`, `EN_MANTENIMIENTO`, `FUERA_DE_SERVICIO`.
- `incidencias` — reportes de falla contra un equipo (tipo, severidad,
  descripción, quién reporta, estado de seguimiento).
- `equipos_resumen` — vista con el estado + conteo de incidencias abiertas por
  equipo (la usa el inventario).

### Seguridad (RLS)

- **Cualquiera** (anónimo) puede: leer la ficha de un equipo, leer su historial y
  **crear** una incidencia (reportar). Las incidencias solo pueden nacer `ABIERTA`.
- **Solo personal autenticado** (rol `authenticated`, para un login futuro) puede
  modificar el inventario/estado de equipos y **dar seguimiento o resolver**
  incidencias. No hace falta cambiar el esquema cuando se agregue ese login.
- **Privacidad:** el sistema no guarda datos personales de alumnos ni familias,
  solo equipos e incidencias técnicas.

## Puesta en marcha (lo que falta)

1. **Reactivar el proyecto Supabase** `Laboratorio-digital-310` (está pausado; el
   plan gratuito permite 2 proyectos activos a la vez).
2. **Aplicar las migraciones** de `../supabase/migrations/` (en orden `0001`, `0002`).
   Se pueden aplicar con el MCP de Supabase (`apply_migration`), el CLI de Supabase
   o pegándolas en el SQL Editor.
3. **Pegar la anon key** en `config.js` (`SUPABASE_ANON_KEY`). La URL del proyecto
   ya está puesta. La anon key es pública por diseño: la seguridad la dan las RLS.
4. **Desplegar** el repo en Vercel (sitio estático). El informe queda en `/` y la
   app en `/app/`.
5. **Imprimir los QR** desde el inventario (botón "Generar códigos QR" →
   "Imprimir etiquetas") y pegarlos en cada estación.

## Archivos

| Archivo | Rol |
|---|---|
| `index.html` | Entrada de la app; carga scripts y estilos. |
| `config.js` | URL + anon key de Supabase (anon key pendiente). |
| `app.js` | Router, inventario, ficha, reporte, generación de QR, modo demo. |
| `styles.css` | Estética "Liquid Glass" heredada del informe. |
| `vendor/qrcode.js` | Generador de QR (MIT, Kazuhiko Arase). |
