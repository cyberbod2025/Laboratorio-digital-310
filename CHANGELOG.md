# Changelog

## v1.1 — Guía de diagnóstico en campo + Cuestionario Dirección (2026-06-09)

### Novedades

- **Guía de revisión técnica** en el modal de cada estación: 10 secciones en acordeón (Encendido, BIOS, Windows, CPU/RAM/Disco, Red, Monitor, Teclado, Mouse, Audio, Energía) con opciones rápidas tipo pastilla, comandos CMD copiables y notas por sección.
- **Dos modos** de diagnóstico: "Rápido" (6 secciones esenciales) y "Completo" (las 10 secciones), seleccionables desde el modal.
- **Recomendaciones automáticas** que se actualizan en vivo según las opciones seleccionadas, con reglas condicionales combinadas.
- **Tipo de fotografía** seleccionable (vista general, panel frontal, evidencia de falla, etc.).
- **Datos de diagnóstico guardados** en nuevo campo `guiadx` dentro de cada estación, con autopoblado de campos legacy para compatibilidad hacia atrás.
- **Cuestionario para Dirección** en `informe-preliminar.html`: 24 preguntas agrupadas en 6 categorías (Proyecto original, Rack y cableado, Internet, Contraseñas, Operación, Tiempos), con controles rápidos Sí/No/No se sabe/Requiere revisión + Respuesta abierta.
- Botón "Guardar respuestas de Dirección" y "Exportar respuestas JSON" en el cuestionario.
- Datos del cuestionario guardados en localStorage con clave `lab310_direccion_respuestas_v1`.

## v1.0 — MVP local (2026-06-09)

Versión funcional para uso real en campo. Aplicación 100% offline, todo en un archivo HTML sin dependencias externas.

### Funcionalidades incluidas

- Persistencia local versionada (`localStorage`, schema v1→v2 con migración automática)
- 30 estaciones numeradas con ficha técnica individual
- Captura de foto por estación (cámara o galería, `capture="environment"`)
- Compresión de imagen vía Canvas (máx. 1100 px lado, calidad progresiva, ~75 KB por foto)
- Exportación de respaldo JSON completo (datos + fotos embebidas)
- Restauración de respaldo JSON con validación de esquema y versión
- Generación de informe HTML autónomo con resumen y fichas detalladas
- Impresión/PDF del informe vía `window.print()`
- Filtro de estaciones por estado (todas / sin revisar / funcionales / observaciones / fallas)
- Barra de progreso y resumen numérico en tiempo real
- Diseño responsivo (escritorio, tableta, celular)
- Compatibilidad con modo offline
- Mensajes de error en español orientados al usuario

### Bugs corregidos en QA

- **beforeunload ausente**: al recargar la página con el modal abierto se perdían los cambios sin aviso. Se agregó protección con flag `formModified`.
- **Timeout fijo en impresión**: `setTimeout(350ms)` no era confiable en dispositivos lentos. Reemplazado por `window.addEventListener("load", ...)` que espera a que el contenido renderice.
- **Foto sin marcar formulario como modificado**: al tomar o quitar una foto, `beforeunload` no advertía del cambio pendiente.

### Riesgos pendientes

- Sin advertencia preventiva de cuota `localStorage` antes de llegar al límite.
- `window.print()` puede no funcionar en iOS Safari; como alternativa usar "Exportar HTML".
- Fotos embebidas en base64 aumentan el tamaño del HTML exportado (~2-3 MB con 30 estaciones).
- Sin autoguardado del formulario durante la edición.
- Sin migración inversa v2→v1 para respaldos antiguos.
