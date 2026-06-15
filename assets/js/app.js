/* ============================================================
   app.js — núcleo: carga de datos, navegación, accesibilidad.
   El estado del wizard es un objeto plano SIN datos personales:
   { modo, categoria, cadenaId, subtipo, paisKey, urgente }
   ============================================================ */
(function () {
  "use strict";

  var App = {
    data: {},
    state: {},
    stack: [],            // historial para "Atrás": [{step, state}]
    current: { step: null, state: {} },
    steps: {},            // registro de renderers (lo llenan los otros módulos)
    progressMap: {        // step -> % de avance
      tipo: 28, desambiguacion: 42, ramificacion: 55,
      pais: 70, urgencia: 85, resultado: 100, tutor: 100,
      diagnostico: 60, veredicto: 100, landing: 0
    }
  };
  window.App = App;

  /* ---------- Helpers DOM ---------- */
  App.el = function (tag, props, children) {
    var n = document.createElement(tag);
    if (props) {
      Object.keys(props).forEach(function (k) {
        if (k === "class") n.className = props[k];
        else if (k === "html") n.innerHTML = props[k];
        else if (k === "text") n.textContent = props[k];
        else if (k.slice(0, 2) === "on" && typeof props[k] === "function") {
          n.addEventListener(k.slice(2).toLowerCase(), props[k]);
        } else if (k === "dataset") {
          Object.keys(props[k]).forEach(function (d) { n.dataset[d] = props[k][d]; });
        } else if (props[k] !== null && props[k] !== undefined && props[k] !== false) {
          n.setAttribute(k, props[k]);
        }
      });
    }
    (children || []).forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return n;
  };

  App.clear = function (node) { while (node.firstChild) node.removeChild(node.firstChild); };

  App.announce = function (text) {
    var live = document.getElementById("srAnnounce");
    if (!live) return;
    // Adjunta el % de avance para que el lector de pantalla lo escuche al cambiar de pantalla (A11Y).
    var pct = App.current && App.progressMap[App.current.step];
    var msg = (pct !== undefined && App.current.step !== "landing") ? (text + " (avance " + pct + "%)") : text;
    // Limpiar y re-asignar fuerza el re-anuncio aunque el texto sea idéntico (p. ej. al volver Atrás).
    live.textContent = "";
    setTimeout(function () { live.textContent = msg; }, 60);
  };

  App.setProgress = function (step) {
    var wrap = document.getElementById("progressWrap");
    var pct = App.progressMap[step];
    if (pct === undefined || step === "landing") { if (wrap) wrap.hidden = true; return; }
    if (wrap) wrap.hidden = false;
    var fill = document.getElementById("progressFill");
    var bar = document.getElementById("progressBar");
    var label = document.getElementById("progressLabel");
    if (fill) fill.style.width = pct + "%";
    if (bar) bar.setAttribute("aria-valuenow", String(pct));
    if (label) label.textContent = "Avance: " + pct + "%";
  };

  /* ---------- Navegación ---------- */
  App.go = function (step, patch) {
    App.stack.push({ step: App.current.step, state: Object.assign({}, App.state) });
    App.state = Object.assign({}, App.state, patch || {});
    App.current = { step: step, state: App.state };
    App.renderCurrent();
  };

  App.back = function () {
    var prev = App.stack.pop();
    if (!prev || !prev.step) { App.restart(); return; }
    App.state = prev.state;
    App.current = { step: prev.step, state: App.state };
    App.renderCurrent();
  };

  App.restart = function () {
    App.stack = [];
    App.state = {};
    App.current = { step: "landing", state: App.state };
    if (history.replaceState) history.replaceState(null, "", location.pathname);
    App.renderCurrent();
  };

  App.renderCurrent = function () {
    var stage = document.getElementById("app");
    App.clear(stage);
    var fn = App.steps[App.current.step];
    if (!fn) { stage.appendChild(App.el("p", { text: "Pantalla no encontrada: " + App.current.step })); return; }
    // Navegación Atrás/Inicio también ARRIBA (no solo al final): evita tener que
    // bajar hasta el fondo en pantallas largas. En el inicio no aplica.
    if (App.current.step !== "landing" && App.backButton) {
      var topNav = App.backButton();
      topNav.className = "nav-row nav-row--top";
      stage.appendChild(topNav);
    }
    fn(stage, App.state);
    App.setProgress(App.current.step);
    // foco al encabezado de la nueva pantalla
    var h = stage.querySelector("h1, h2, legend, .step-title");
    if (h) { h.setAttribute("tabindex", "-1"); h.focus(); }
    var main = document.getElementById("contenido");
    if (main) main.scrollIntoView({ block: "start", behavior: "smooth" });
  };

  /* ---------- Navegación reutilizable: Atrás + Inicio (botones-rectángulo) ---------- */
  App.backButton = function () {
    return App.el("div", { class: "nav-row" }, [
      App.el("button", { class: "btn btn--ghost btn--nav", type: "button", onclick: function () { App.back(); } },
        [App.el("span", { "aria-hidden": "true", text: "← " }), "Atrás"]),
      App.el("button", { class: "btn btn--ghost btn--nav", type: "button", onclick: function () { App.restart(); } },
        [App.el("span", { "aria-hidden": "true", text: "🏠 " }), "Inicio"])
    ]);
  };

  /* ---------- Utilidades de datos ---------- */
  App.getCadena = function (id) {
    var arr = (App.data.cadenas && App.data.cadenas.cadenas) || [];
    for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i];
    return null;
  };
  App.getCategoria = function (id) {
    var arr = (App.data.flujo && App.data.flujo.categorias) || [];
    for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i];
    return null;
  };
  App.getPais = function (key) {
    var p = App.data.paises && App.data.paises.paises;
    if (p && key && p[key]) return p[key];
    return App.data.paises ? App.data.paises.default : null;
  };

  /* Pasos efectivos de una cadena según el subtipo elegido (filtra solo_subtipo y renumera) */
  App.pasosEfectivos = function (cadena, subtipo) {
    if (!cadena) return [];
    var pasos = (cadena.pasos || []).filter(function (p) {
      return !p.solo_subtipo || p.solo_subtipo === subtipo;
    });
    return pasos.map(function (p, i) { return Object.assign({}, p, { _n: i + 1 }); });
  };

  /* ---------- Carga de datos (bundle local o fetch) ---------- */
  function loadData() {
    if (window.APOSTILLA_DATA) {
      App.data = window.APOSTILLA_DATA;
      return Promise.resolve();
    }
    var files = {
      cadenas: "data/cadenas.json",
      paises: "data/paises.json",
      glosario: "data/glosario.json",
      tips: "data/tips.json",
      flujo: "data/flujo.json",
      firmasDemo: "data/firmas_demo.json",
      comoFunciona: "data/como_funciona.json"
    };
    var keys = Object.keys(files);
    return Promise.all(keys.map(function (k) {
      return fetch(files[k]).then(function (r) { if (!r.ok) throw new Error(files[k]); return r.json(); });
    })).then(function (results) {
      keys.forEach(function (k, i) { App.data[k] = results[i]; });
    });
  }

  /* ---------- Plan compartido por URL (#plan=base64) ---------- */
  App.encodePlan = function () {
    var s = App.state;
    var payload = { c: s.cadenaId, t: s.subtipo || "", p: s.paisKey || "", u: s.urgente ? 1 : 0 };
    try { return btoa(unescape(encodeURIComponent(JSON.stringify(payload)))); }
    catch (e) { return ""; }
  };
  App.shareUrl = function () {
    return location.origin + location.pathname + "#plan=" + App.encodePlan();
  };
  function tryLoadSharedPlan() {
    var m = (location.hash || "").match(/plan=([^&]+)/);
    if (!m) return false;
    try {
      var obj = JSON.parse(decodeURIComponent(escape(atob(m[1]))));
      if (!obj.c || !App.getCadena(obj.c)) return false;
      App.state = { modo: "desde_cero", cadenaId: obj.c, subtipo: obj.t || null,
                    paisKey: obj.p || null, urgente: !!obj.u, _shared: true };
      App.current = { step: "resultado", state: App.state };
      App.renderCurrent();
      return true;
    } catch (e) { return false; }
  }

  /* ---------- Init ---------- */
  function init() {
    var loadState = document.getElementById("loadState");
    loadData().then(function () {
      if (loadState) loadState.style.display = "none";
      if (!tryLoadSharedPlan()) App.restart();
    }).catch(function (err) {
      if (loadState) {
        loadState.innerHTML = "";
        loadState.appendChild(App.el("div", { class: "alert alert--warn" }, [
          "No se pudieron cargar los datos. Si abriste el archivo directamente, ejecuta " +
          "primero scripts\\gen_bundle.py o sirve la carpeta con un servidor local " +
          "(por ejemplo: py -3.14 -m http.server)."
        ]));
      }
      // eslint-disable-next-line no-console
      console.error("Error cargando datos:", err);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
