/* ============================================================
   verificador.js — BUSCADOR de autoridades/firmas registradas ante el MRE.
   Filtros en cascada: Entidad → Nombre/Cargo → Fecha. Conforme se filtra,
   abajo aparecen las autoridades con una columna de estado (✓ Vigente /
   ⚠️ No vigente) según la fecha indicada.

   Datos:
   - Intenta cargar el dataset COMPLETO (data/autoridades.json) cuando está
     disponible (servidor local / despliegue con el archivo). Ese archivo es
     PRIVADO (gitignored): no se publica en el repo abierto.
   - Si no está disponible (GitHub Pages "pelado" / file://), cae al
     subconjunto público de demostración (firmas_demo) y lo señala.
   ============================================================ */
(function () {
  "use strict";
  var App = window.App;

  function norm(s) {
    s = (s || "").toString().toLowerCase();
    if (s.normalize) s = s.normalize("NFKD").replace(/[̀-ͯ]/g, "");
    return s.replace(/\s+/g, " ").trim();
  }
  function fechaCompacta(f) { return (f || "").replace(/-/g, ""); }
  function fmtFecha(s) { s = (s || "").trim(); return /^\d{8}$/.test(s) ? (s.slice(6, 8) + "/" + s.slice(4, 6) + "/" + s.slice(0, 4)) : (s || "?"); }

  var _cache = null;

  // Carga el dataset de autoridades para el buscador (completo si se puede; si no, demo).
  App.cargarAutoridades = function () {
    if (_cache) return Promise.resolve(_cache);
    var demo = (App.data.firmasDemo && App.data.firmasDemo.registros) || [];
    var puedeFetch = (location.protocol === "http:" || location.protocol === "https:");
    if (!puedeFetch) { _cache = { registros: demo, completo: false, meta: null }; return Promise.resolve(_cache); }
    return fetch("data/autoridades.json", { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error("no full"); return r.json(); })
      .then(function (j) { _cache = { registros: (j.registros || []), completo: true, meta: j._meta || null }; return _cache; })
      .catch(function () { _cache = { registros: demo, completo: false, meta: null }; return _cache; });
  };

  // Estado de una firma: si hay fecha, ¿estaba vigente esa fecha? Si no, usa vigente_ref del dataset.
  function estado(r, fc) {
    if (fc) return (r.inicio && r.fin && r.inicio <= fc && fc <= r.fin) ? "vigente" : "no_vigente";
    return r.vigente_ref ? "vigente" : "no_vigente";
  }

  App.steps.verificador = function (stage) {
    var data = { registros: [], completo: false, meta: null };

    var selEnt = App.el("select", { id: "bEnt" }, [App.el("option", { value: "", text: "Todas las entidades" })]);
    var inpTexto = App.el("input", { type: "text", id: "bTexto", placeholder: "Nombre o cargo (ej.: Presidente, Decano, Certificador)" });
    var inpFecha = App.el("input", { type: "date", id: "bFecha", value: "2026-06-12" });
    var resumen = App.el("p", { class: "results-summary", "aria-live": "polite" });
    var lista = App.el("div", { class: "results", "aria-live": "polite" });

    function render() {
      var e = selEnt.value, q = norm(inpTexto.value), fc = fechaCompacta(inpFecha.value);
      var rows = data.registros.filter(function (r) {
        var okE = !e || r.entidad === e;
        var okQ = !q || norm(r.nombre).indexOf(q) !== -1 || norm(r.cargo).indexOf(q) !== -1;
        return okE && okQ;
      });
      rows.sort(function (a, b) {
        var va = estado(a, fc) === "vigente" ? 0 : 1, vb = estado(b, fc) === "vigente" ? 0 : 1;
        if (va !== vb) return va - vb;
        return a.nombre > b.nombre ? 1 : (a.nombre < b.nombre ? -1 : 0);
      });

      App.clear(resumen); App.clear(lista);
      var tot = rows.length;
      var vig = rows.filter(function (r) { return estado(r, fc) === "vigente"; }).length;
      var refTxt = (data.meta && data.meta.fecha_referencia) || "2026-06-12";
      resumen.textContent = tot + " resultado" + (tot === 1 ? "" : "s") + " · " + vig + " vigente" + (vig === 1 ? "" : "s") +
        (fc ? " a la fecha indicada" : " (al " + refTxt + ")") + (data.completo ? "" : " · muestra de demostración");

      if (!tot) { lista.appendChild(App.el("p", { class: "search-hint", text: "No hay autoridades que coincidan con esos filtros." })); return; }
      var MAX = 150;
      rows.slice(0, MAX).forEach(function (r) {
        var est = estado(r, fc);
        var badge = est === "vigente"
          ? App.el("span", { class: "tag tag--ok", text: "✓ Vigente" })
          : App.el("span", { class: "tag tag--warn", text: "⚠️ No vigente" });
        lista.appendChild(App.el("div", { class: "result-row" }, [
          App.el("div", { class: "result-main" }, [
            App.el("strong", { text: r.nombre + (r.sintetico ? " (demo)" : "") }),
            App.el("span", { class: "result-sub", text: (r.cargo || "") + " · " + r.entidad }),
            App.el("span", { class: "result-sub", text: "Firma válida desde " + fmtFecha(r.inicio) + " hasta " + fmtFecha(r.fin) })
          ]),
          badge
        ]));
      });
      if (rows.length > MAX) lista.appendChild(App.el("p", { class: "search-hint", text: "Mostrando " + MAX + " de " + rows.length + ". Afina los filtros (entidad o nombre) para ver menos." }));
    }

    stage.appendChild(App.el("section", {}, [
      App.el("p", { class: "step-eyebrow", text: "Buscador de autoridades del MRE" }),
      App.el("h2", { class: "step-title", text: "Busca una autoridad o firma registrada ante el MRE" }),
      App.el("p", { class: "step-sub", text: "Filtra por entidad, por nombre o cargo, y por la fecha de tu documento. Abajo aparecen las autoridades y si su firma estaba vigente (apta para apostilla/legalización) en esa fecha." }),
      App.el("div", { class: "alert alert--warn" }, [App.el("span", { class: "ico", "aria-hidden": "true", text: "⚠️" }),
        App.el("span", {}, [App.el("strong", { text: "Importante: " }), "muchas firmas figuran como NO vigentes porque caducaron. Que una autoridad aparezca aquí no garantiza que su firma siga válida hoy: confírmalo en la entidad y en el MRE antes de ir."])]),
      App.el("div", { class: "alert alert--warn" }, [App.el("span", { class: "ico", "aria-hidden": "true", text: "📌" }),
        App.el("span", {}, [App.el("strong", { text: "Lo que vale es la fecha de tu documento. " }),
          "Si la firma de la autoridad estaba vigente el día en que se firmó tu documento, este SÍ puede apostillarse o legalizarse, aunque hoy esa firma ya esté caducada. La firma solo se observa (se rechaza) si tu documento se firmó DESPUÉS del último día en que estaba registrada. Por eso, en el filtro «3. Fecha del documento» ingresa la fecha real en que lo firmaron y revisa el estado."])]),
      App.el("div", { class: "filters" }, [
        App.el("div", { class: "field-row" }, [App.el("label", { for: "bEnt", text: "1. Entidad que firmó" }), selEnt]),
        App.el("div", { class: "field-row" }, [App.el("label", { for: "bTexto", text: "2. Nombre o cargo (opcional)" }), inpTexto]),
        App.el("div", { class: "field-row" }, [App.el("label", { for: "bFecha", text: "3. Fecha del documento (opcional)" }), inpFecha])
      ]),
      resumen,
      lista,
      App.el("div", { class: "actions-row" }, [App.backButton()]),
      App.el("p", { class: "search-hint", text: "🔒 Datos del registro de autoridades provisto por el Lab MRE (uso exclusivo de prototipado). Vigencias a la fecha de referencia; confirma siempre en la entidad y en la ventanilla de Informes del MRE." })
    ]));

    selEnt.addEventListener("change", render);
    inpTexto.addEventListener("input", render);
    inpFecha.addEventListener("change", render);

    App.cargarAutoridades().then(function (d) {
      data = d;
      var ents = [];
      d.registros.forEach(function (r) { if (ents.indexOf(r.entidad) === -1) ents.push(r.entidad); });
      ents.sort();
      ents.forEach(function (e) { selEnt.appendChild(App.el("option", { value: e, text: e })); });
      render();
    });

    App.announce("Buscador de autoridades registradas ante el MRE. Filtra por entidad, nombre o cargo y fecha.");
  };
})();
