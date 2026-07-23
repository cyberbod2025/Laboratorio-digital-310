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

## Estado de la puesta en marcha

- [x] **Proyecto Supabase activo** (`Laboratorio-digital-310`, región us-east-1).
- [x] **Migraciones aplicadas** (`0001` esquema+RLS, `0002` semilla de 30
      estaciones, `0003` endurecimiento tras advisories). La BD tiene 30 equipos.
- [x] **Key conectada** en `config.js` (publishable key; la seguridad la dan las
      políticas RLS, verificadas end-to-end: lectura y alta de incidencias
      públicas, escritura de equipos bloqueada).
- [ ] **Desplegar en Vercel** (sitio estático). El informe queda en `/` y la app
      en `/app/`. Al servir con dominio real, los QR apuntarán a ese dominio.
- [ ] **Imprimir los QR** desde el inventario (botón "Generar códigos QR" →
      "Imprimir etiquetas") y pegarlos en cada estación.
- [ ] **Login de personal** (pendiente de diseño) para resolver/administrar
      incidencias desde la app; hoy esa gestión se hace desde el panel de Supabase.

## Archivos

| Archivo | Rol |
|---|---|
| `index.html` | Entrada de la app; carga scripts y estilos. |
| `config.js` | URL + anon key de Supabase (anon key pendiente). |
| `app.js` | Router, inventario, ficha, reporte, generación de QR, modo demo. |
| `styles.css` | Estética "Liquid Glass" heredada del informe. |
| `vendor/qrcode.js` | Generador de QR (MIT, Kazuhiko Arase). |
