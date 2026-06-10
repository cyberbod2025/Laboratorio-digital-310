# Laboratorio Digital 310 — MVP Local v1.0

Aplicación web progresiva (PWA-ready) para diagnóstico técnico en campo del laboratorio de cómputo de la **Secundaria 310**. Funcional sin conexión a Internet; todos los datos se guardan en el navegador del dispositivo mediante `localStorage`.

---

## Cómo usarla en campo

1. Abre `index.html` en Chrome, Edge o Safari desde cualquier celular, tableta o laptop.
2. La app carga una auditoría en blanco con 30 estaciones numeradas (E01 – E30).
3. Cada estación representa una computadora del laboratorio.

### Registrar una estación

1. Toca la tarjeta de la estación para abrir su ficha técnica.
2. Selecciona el **estado general**:
   - **Funcional** — equipo operativo.
   - **Con observaciones** — funciona con limitaciones.
   - **No funcional** — no enciende o falla crítica.
   - **Sin revisar** — pendiente.
3. Llena los campos: CPU, Monitor, Teclado, Mouse, Red/Internet, Revisó.
4. Agrega **observaciones** (opcional pero recomendado).
5. Toma o elige una **foto** del equipo (se comprime automáticamente).
6. Presiona **Guardar diagnóstico local**.

### Exportar respaldo JSON

- Presiona **Exportar JSON** en la barra de herramientas.
- Se descarga un archivo `lab-310-YYYY-MM-DD.json` con todos los datos y fotos.
- Guarda este archivo en un lugar seguro (nube, USB, correo).

### Restaurar respaldo JSON

1. Presiona **Restaurar JSON**.
2. Selecciona el archivo `.json` previamente exportado.
3. Confirma la restauración (reemplaza los datos actuales).

### Generar informe

- **Exportar HTML** — descarga un informe autónomo con resumen y fichas de todas las estaciones.
- **Imprimir / PDF** — abre el informe en otra ventana y lanza el cuadro de impresión del navegador. En iOS puede requerir usar "Exportar HTML" e imprimir desde ahí.

---

## Riesgos conocidos

- **Solo en un navegador** — los datos no se sincronizan entre dispositivos. Si se borra el caché del navegador, se pierde la auditoría. Mantén respaldos JSON frecuentes.
- **Límite de localStorage** — la mayoría de navegadores permiten 5–10 MB. Con 30 fotos comprimidas (~75 KB c/u) el total ronda ~2.5 MB. Si excede, la app muestra un error y pide descargar un respaldo.
- **`window.print()` en iOS** — Safari puede no mostrar el diálogo de impresión desde `window.open()`. Usa "Exportar HTML" como alternativa.
- **Sin autoguardado** — los cambios en la ficha abierta se pierden si la página se cierra antes de presionar "Guardar".
- **Sin bitácora ni multiusuario** — no hay historial de cambios ni roles de acceso.

---

## Arquitectura

```
index.html              → Aplicación principal (todo en un archivo)
informe-preliminar.html → Documento institucional estático (contexto del proyecto)
MIGRACION-SUPABASE.md   → Plan de migración futura a base de datos remota
```

Tecnologías usadas: HTML, CSS, JavaScript vanilla. Sin dependencias externas, sin frameworks, sin backend.

---

## Recomendación de migración futura

Cuando se requiera sincronización entre dispositivos, respaldo en la nube y control de acceso, migrar a:

- **Frontend**: React + Vite + Tailwind CSS (desplegado en Vercel)
- **Backend/Datos**: Supabase (PostgreSQL + Auth + Storage para fotos)
- **Autenticación**: Supabase Auth (Google / correo institucional)
- **Reportes**: generación server-side con plantillas HTML

Ver `MIGRACION-SUPABASE.md` para el plan detallado.
