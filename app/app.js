/* Laboratorio Digital 310 — lógica de la app.
 *
 * Dos vistas sobre una sola página (sin router externo):
 *   ?e=CODIGO ausente  → INVENTARIO (tablero + generación de etiquetas QR)
 *   ?e=CODIGO presente → FICHA del equipo (estado + historial + reportar falla)
 *
 * Funciona en dos modos:
 *   - CONECTADO: hay anon key válida en config.js → lee/escribe en Supabase.
 *   - DEMO: la anon key sigue en placeholder → datos de ejemplo en memoria.
 */
(function () {
  "use strict";

  var cfg = window.LAB_CONFIG || {};
  var CONFIGURED =
    cfg.SUPABASE_URL &&
    cfg.SUPABASE_ANON_KEY &&
    cfg.SUPABASE_ANON_KEY.indexOf("REEMPLAZAR") === -1;

  var sb = null;
  if (CONFIGURED && window.supabase && window.supabase.createClient) {
    sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  }

  var ESTADOS = {
    OPERATIVO: "Operativo",
    CON_FALLAS: "Con fallas",
    EN_MANTENIMIENTO: "En mantenimiento",
    FUERA_DE_SERVICIO: "Fuera de servicio",
  };
  var TIPOS = ["HARDWARE", "RED", "SOFTWARE", "PERIFERICOS", "LIMPIEZA", "OTRO"];
  var TIPO_LABEL = {
    HARDWARE: "Hardware",
    RED: "Red / Internet",
    SOFTWARE: "Software",
    PERIFERICOS: "Periféricos",
    LIMPIEZA: "Limpieza",
    OTRO: "Otro",
  };

  // ---- utilidades ---------------------------------------------------------
  var app = document.getElementById("app");

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function fmtFecha(iso) {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleString("es-MX", {
        day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
      });
    } catch (e) { return iso; }
  }
  function qs(name) {
    return new URLSearchParams(window.location.search).get(name);
  }
  function fichaUrl(codigo) {
    return window.location.origin + window.location.pathname + "?e=" + encodeURIComponent(codigo);
  }
  function statusChip(estado) {
    return '<span class="status st-' + esc(estado) + '">' + esc(ESTADOS[estado] || estado) + "</span>";
  }
  function banner(kind, html) {
    return '<div class="banner ' + kind + '">' + html + "</div>";
  }
  function demoNotice() {
    if (CONFIGURED) return "";
    return banner(
      "demo",
      "⚠️ <strong>Modo demostración.</strong> Aún no se ha conectado la base de datos: " +
        "los datos son de ejemplo y los reportes no se guardan. Configura la anon key en " +
        "<code>app/config.js</code> para activar el guardado en la nube."
    );
  }

  // ---- datos demo (espejo de la semilla) ----------------------------------
  var DEMO_EQUIPOS = (function () {
    var arr = [];
    for (var n = 1; n <= 30; n++) {
      var codigo = "PC-" + (n < 10 ? "0" + n : "" + n);
      arr.push({
        id: "demo-" + codigo,
        codigo: codigo,
        etiqueta: "Estación " + (n < 10 ? "0" + n : "" + n),
        ubicacion: "Fila " + String.fromCharCode(65 + Math.floor((n - 1) / 10)),
        cpu: "Por inventariar",
        monitor: "Por inventariar",
        perifericos: ["teclado", "mouse"],
        estado: "OPERATIVO",
        incidencias_abiertas: 0,
      });
    }
    arr[6].estado = "CON_FALLAS"; arr[6].incidencias_abiertas = 1; // PC-07
    arr[12].estado = "FUERA_DE_SERVICIO"; // PC-13
    arr[21].estado = "EN_MANTENIMIENTO"; // PC-22
    return arr;
  })();
  var DEMO_INCIDENCIAS = {
    "PC-07": [
      {
        tipo: "HARDWARE", severidad: "ALTA", estado: "ABIERTA",
        descripcion: "El equipo enciende pero el monitor no recibe señal.",
        reporta_nombre: "Demo", reporta_rol: "docente",
        created_at: new Date(Date.now() - 86400000).toISOString(),
      },
    ],
  };

  // ---- acceso a datos (Supabase o demo) -----------------------------------
  function loadInventario() {
    if (!sb) return Promise.resolve(DEMO_EQUIPOS.slice());
    return sb
      .from("equipos_resumen")
      .select("id,codigo,etiqueta,ubicacion,estado,incidencias_abiertas")
      .order("codigo", { ascending: true })
      .then(function (r) {
        if (r.error) throw r.error;
        return r.data;
      });
  }
  function loadEquipo(codigo) {
    if (!sb) {
      var e = DEMO_EQUIPOS.filter(function (x) { return x.codigo === codigo; })[0];
      return Promise.resolve(e || null);
    }
    return sb
      .from("equipos")
      .select("id,codigo,etiqueta,ubicacion,cpu,monitor,perifericos,estado,notas,updated_at")
      .eq("codigo", codigo)
      .maybeSingle()
      .then(function (r) {
        if (r.error) throw r.error;
        return r.data;
      });
  }
  function loadIncidencias(equipo) {
    if (!sb) return Promise.resolve(DEMO_INCIDENCIAS[equipo.codigo] || []);
    return sb
      .from("incidencias")
      .select("tipo,severidad,estado,descripcion,reporta_nombre,reporta_rol,created_at")
      .eq("equipo_id", equipo.id)
      .order("created_at", { ascending: false })
      .then(function (r) {
        if (r.error) throw r.error;
        return r.data;
      });
  }
  function reportarFalla(equipo, payload) {
    if (!sb) {
      // Demo: simula éxito sin persistir.
      return new Promise(function (res) { setTimeout(res, 400); });
    }
    return sb
      .from("incidencias")
      .insert({
        equipo_id: equipo.id,
        tipo: payload.tipo,
        severidad: payload.severidad,
        descripcion: payload.descripcion,
        reporta_nombre: payload.reporta_nombre || null,
        reporta_rol: payload.reporta_rol || null,
      })
      .then(function (r) {
        if (r.error) throw r.error;
      });
  }

  // ---- vista: INVENTARIO --------------------------------------------------
  function renderInventario() {
    app.innerHTML = topbar(false) + demoNotice() +
      '<div class="panel"><h1 class="gradient">Laboratorio Digital 310</h1>' +
      '<p>Estado de los equipos de cómputo. Escanea el QR de una estación para ver su ficha y reportar una falla.</p>' +
      '<div id="metrics" class="metrics"></div></div>' +
      '<div class="panel"><h2>Inventario de equipos</h2><div id="grid" class="grid muted">Cargando…</div></div>' +
      '<div class="panel no-print"><h2>Etiquetas QR para imprimir</h2>' +
      '<p>Genera un QR por estación, imprímelos y pégalos en cada equipo. Al escanearlos abren la ficha correspondiente.</p>' +
      '<div class="actions"><button id="genqr" class="btn">Generar códigos QR</button>' +
      '<button id="printqr" class="btn secondary" disabled>Imprimir etiquetas</button></div>' +
      '<div id="qrs" class="qr-grid"></div></div>';

    bindTopbar();

    loadInventario().then(function (equipos) {
      renderMetrics(equipos);
      renderGrid(equipos);
      wireQr(equipos);
    }).catch(function (err) {
      document.getElementById("grid").innerHTML = banner("err", "No se pudo cargar el inventario: " + esc(err.message || err));
    });
  }

  function renderMetrics(equipos) {
    var by = { OPERATIVO: 0, CON_FALLAS: 0, EN_MANTENIMIENTO: 0, FUERA_DE_SERVICIO: 0 };
    equipos.forEach(function (e) { by[e.estado] = (by[e.estado] || 0) + 1; });
    var m = document.getElementById("metrics");
    m.innerHTML =
      metric(equipos.length, "Equipos", "#fff") +
      metric(by.OPERATIVO, "Operativos", "var(--green)") +
      metric(by.CON_FALLAS + by.FUERA_DE_SERVICIO, "Con fallas / fuera", "var(--red)") +
      metric(by.EN_MANTENIMIENTO, "En mantenimiento", "var(--cyan)");
  }
  function metric(n, l, color) {
    return '<div class="metric"><div class="n" style="color:' + color + '">' + n + '</div><div class="l">' + esc(l) + "</div></div>";
  }

  function renderGrid(equipos) {
    if (!equipos.length) {
      document.getElementById("grid").innerHTML = '<p class="muted">Aún no hay equipos registrados.</p>';
      return;
    }
    var html = equipos.map(function (e) {
      var abiertas = e.incidencias_abiertas || 0;
      return '<a class="card equipo-card" href="' + esc(fichaUrl(e.codigo)) + '">' +
        '<div class="codigo">' + esc(e.codigo) + "</div>" +
        '<div class="ubic">' + esc(e.etiqueta || "") + (e.ubicacion ? " · " + esc(e.ubicacion) : "") + "</div>" +
        '<div class="meta">' + statusChip(e.estado) +
        (abiertas ? '<span class="badge-count">' + abiertas + " abierta" + (abiertas > 1 ? "s" : "") + "</span>" : "") +
        "</div></a>";
    }).join("");
    document.getElementById("grid").innerHTML = html;
    document.getElementById("grid").classList.remove("muted");
  }

  function wireQr(equipos) {
    document.getElementById("genqr").addEventListener("click", function () {
      var box = document.getElementById("qrs");
      box.innerHTML = equipos.map(function (e) {
        var url = fichaUrl(e.codigo);
        var qr = window.qrcode(0, "M");
        qr.addData(url);
        qr.make();
        return '<div class="qr-item"><img alt="QR ' + esc(e.codigo) + '" src="' + qr.createDataURL(5, 8) + '">' +
          '<div class="qr-code">' + esc(e.codigo) + '</div><div class="qr-sub">' + esc(e.etiqueta || "") + "</div></div>";
      }).join("");
      document.getElementById("printqr").disabled = false;
    });
    document.getElementById("printqr").addEventListener("click", function () { window.print(); });
  }

  // ---- vista: FICHA -------------------------------------------------------
  function renderFicha(codigo) {
    app.innerHTML = topbar(true) + demoNotice() + '<div id="ficha" class="muted">Cargando equipo…</div>';
    bindTopbar();

    var equipoRef = null;
    loadEquipo(codigo).then(function (equipo) {
      if (!equipo) {
        document.getElementById("ficha").innerHTML =
          banner("err", "No se encontró el equipo con código <strong>" + esc(codigo) + "</strong>.");
        return null;
      }
      equipoRef = equipo;
      return loadIncidencias(equipo).then(function (incs) {
        drawFicha(equipo, incs);
      });
    }).catch(function (err) {
      document.getElementById("ficha").innerHTML = banner("err", "Error al cargar: " + esc(err.message || err));
    });

    function drawFicha(equipo, incs) {
      var perifericos = (equipo.perifericos || []).join(", ") || "—";
      document.getElementById("ficha").innerHTML =
        '<div class="panel"><div class="meta" style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">' +
          '<h1 style="margin:0">' + esc(equipo.codigo) + "</h1>" + statusChip(equipo.estado) + "</div>" +
          '<h2 style="margin-top:10px">' + esc(equipo.etiqueta || "") + "</h2>" +
          '<table style="width:100%;border-collapse:collapse;margin-top:8px">' +
          row("Ubicación", equipo.ubicacion) + row("CPU", equipo.cpu) + row("Monitor", equipo.monitor) +
          row("Periféricos", perifericos) + (equipo.notas ? row("Notas", equipo.notas) : "") +
          "</table></div>" +
        '<div class="panel"><h2>Reportar una falla</h2>' +
          '<p>Describe el problema que observaste en este equipo. No necesitas iniciar sesión.</p>' +
          reportForm() + '<div id="report-msg"></div></div>' +
        '<div class="panel"><h2>Historial de incidencias</h2><div id="hist"></div></div>';

      drawHistorial(incs);
      wireReportForm(equipo);
    }

    function drawHistorial(incs) {
      var box = document.getElementById("hist");
      if (!incs || !incs.length) {
        box.innerHTML = '<p class="muted">Sin incidencias registradas. 🎉</p>';
        return;
      }
      box.innerHTML = incs.map(function (i) {
        return '<div class="inc sev-' + esc(i.severidad) + '"><div class="head">' +
          '<span class="tipo">' + esc(TIPO_LABEL[i.tipo] || i.tipo) + " · " + esc(i.severidad) + "</span>" +
          '<span class="estado-tag">' + esc(i.estado) + "</span></div>" +
          "<p style=\"margin:4px 0\">" + esc(i.descripcion) + "</p>" +
          '<div class="when">' + fmtFecha(i.created_at) +
          (i.reporta_nombre ? " · reportó: " + esc(i.reporta_nombre) : "") + "</div></div>";
      }).join("");
    }

    function wireReportForm(equipo) {
      var form = document.getElementById("reportForm");
      form.addEventListener("submit", function (ev) {
        ev.preventDefault();
        var btn = form.querySelector("button[type=submit]");
        var msg = document.getElementById("report-msg");
        var payload = {
          tipo: form.tipo.value,
          severidad: form.severidad.value,
          descripcion: form.descripcion.value.trim(),
          reporta_nombre: form.reporta_nombre.value.trim(),
          reporta_rol: form.reporta_rol.value,
        };
        if (payload.descripcion.length < 3) {
          msg.innerHTML = banner("err", "Describe la falla (mínimo 3 caracteres).");
          return;
        }
        btn.disabled = true; btn.textContent = "Enviando…";
        reportarFalla(equipo, payload).then(function () {
          msg.innerHTML = banner("ok", CONFIGURED
            ? "✅ ¡Gracias! Tu reporte quedó registrado."
            : "✅ Reporte simulado (modo demo, no se guardó).");
          form.reset();
          if (CONFIGURED) {
            loadIncidencias(equipo).then(drawHistorial);
          }
        }).catch(function (err) {
          msg.innerHTML = banner("err", "No se pudo enviar: " + esc(err.message || err));
        }).then(function () {
          btn.disabled = false; btn.textContent = "Enviar reporte";
        });
      });
    }
  }

  function row(k, v) {
    return '<tr><td style="padding:10px 8px;border-bottom:1px solid var(--line);color:#fff;font-weight:800;width:40%">' +
      esc(k) + '</td><td style="padding:10px 8px;border-bottom:1px solid var(--line)">' + esc(v || "—") + "</td></tr>";
  }

  function reportForm() {
    var tipos = TIPOS.map(function (t) { return '<option value="' + t + '">' + esc(TIPO_LABEL[t]) + "</option>"; }).join("");
    return (
      '<form id="reportForm"><div class="formgrid">' +
        '<div class="field"><label>Tipo de falla</label><select name="tipo" required>' + tipos + "</select></div>" +
        '<div class="field"><label>Severidad</label><select name="severidad">' +
          '<option value="BAJA">Baja</option><option value="MEDIA" selected>Media</option><option value="ALTA">Alta</option>' +
        "</select></div>" +
        '<div class="field full"><label>¿Qué está fallando?</label>' +
          '<textarea name="descripcion" required placeholder="Ej.: el monitor no enciende, no hay internet, falta el mouse…"></textarea></div>' +
        '<div class="field"><label>Tu nombre (opcional)</label><input name="reporta_nombre" maxlength="120" placeholder="Nombre de quien reporta"></div>' +
        '<div class="field"><label>¿Quién reporta?</label><select name="reporta_rol">' +
          '<option value="">—</option><option value="docente">Docente</option><option value="alumno">Alumno</option><option value="administrativo">Administrativo</option><option value="otro">Otro</option>' +
        "</select></div>" +
      '</div><div class="actions"><button type="submit" class="btn">Enviar reporte</button></div></form>'
    );
  }

  // ---- barra superior -----------------------------------------------------
  function topbar(showBack) {
    return (
      '<div class="topbar"><div class="brand">Laboratorio Digital 310<small>Estado de equipos e incidencias</small></div>' +
      '<div class="spacer"></div>' +
      (showBack
        ? '<a class="btn secondary" href="' + esc(window.location.pathname) + '">← Inventario</a>'
        : "") +
      "</div>"
    );
  }
  function bindTopbar() { /* enlaces nativos, sin JS extra por ahora */ }

  // ---- arranque -----------------------------------------------------------
  function start() {
    var codigo = qs("e");
    if (codigo) renderFicha(codigo);
    else renderInventario();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
