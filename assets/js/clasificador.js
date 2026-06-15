/* ============================================================
   clasificador.js — capa de lenguaje natural OPCIONAL.
   No es la columna vertebral: solo mapea texto libre a una
   categoría del Paso 1 y deposita al usuario ahí.
   Degradación elegante:
     · Siempre hay un clasificador LOCAL por palabras clave (sin IA, offline).
     · Si hay un Worker con IA disponible, lo usa para mejorar la comprensión.
   ============================================================ */
(function () {
  "use strict";
  var App = window.App;

  // Config del Worker (opcional). "" => mismo origen (/api/...). null => desactivado.
  App.config = App.config || { workerBase: "", aiEnabled: true };

  // Mapa de palabras clave -> categoría (ordenado: lo más específico primero)
  var KEYWORDS = [
    { cat: "registro_civil", kw: ["partida", "acta", "nacimiento", "matrimonio", "defuncion", "defunción", "solteria", "soltería", "reniec"] },
    { cat: "universidad", kw: ["universidad", "universitario", "bachiller", "licenciatura", "grado academico", "grado académico", "sunedu", "titulo profesional", "título profesional"] },
    { cat: "instituto", kw: ["instituto", "tecnologico", "tecnológico", "pedagogico", "pedagógico", "senati", "no universitaria", "tecnico", "técnico"] },
    { cat: "colegio", kw: ["colegio", "secundaria", "primaria", "escolar", "certificado de estudios", "certificado del colegio"] },
    { cat: "antecedentes", kw: ["antecedentes", "penales", "judiciales", "policiales", "policial"] },
    { cat: "medico", kw: ["medico", "médico", "salud", "minsa", "essalud", "certificado medico", "certificado médico"] },
    { cat: "trabajo", kw: ["trabajo", "laboral", "constancia de trabajo", "practicas", "prácticas", "empleador"] },
    { cat: "notarial", kw: ["notarial", "notaria", "notaría", "escritura", "poder", "minuta", "notario"] },
    { cat: "colegio_profesional", kw: ["colegio profesional", "colegiatura", "habilidad profesional"] },
    { cat: "migraciones", kw: ["migraciones", "migratorio", "movimiento migratorio", "extranjeria", "extranjería", "carne"] },
    { cat: "judicial", kw: ["judicial", "sentencia", "expediente", "juzgado", "corte"] },
    { cat: "iglesia", kw: ["iglesia", "bautismo", "bautizo", "confirmacion", "confirmación", "parroquia", "eclesiastic"] },
    { cat: "traduccion", kw: ["traduccion", "traducción", "traducir", "traductor"] },
    { cat: "estado", kw: ["sunat", "ruc", "ficha ruc", "declaracion jurada de rentas", "declaracion de renta", "impuesto a la renta", "renta", "rentas", "tributario", "tributaria", "impuesto", "ingresos", "aduanas", "no adeudo", "sunarp", "ministerio", "resolucion", "resolución", "municipalidad", "estado"] },
    { cat: "extranjero_consular", kw: ["consulado", "consular", "extranjero", "embajada"] }
  ];

  function normaliza(s) {
    s = (s || "").toLowerCase();
    if (s.normalize) s = s.normalize("NFKD").replace(/[̀-ͯ]/g, "");
    return s;
  }

  App.clasificarLocal = function (texto) {
    var t = normaliza(texto);
    if (!t.trim()) return null;
    for (var i = 0; i < KEYWORDS.length; i++) {
      var entry = KEYWORDS[i];
      for (var j = 0; j < entry.kw.length; j++) {
        if (t.indexOf(normaliza(entry.kw[j])) !== -1) return { categoria: entry.cat, fuente: "local" };
      }
    }
    return null;
  };

  // Intenta el Worker AI; si falla o no hay, cae al clasificador local.
  App.clasificarTexto = function (texto) {
    var local = App.clasificarLocal(texto);
    var usaWorker = App.config && App.config.aiEnabled && App.config.workerBase !== null &&
                    (location.protocol === "http:" || location.protocol === "https:");
    if (!usaWorker) return Promise.resolve(local);

    var base = App.config.workerBase || "";
    var cats = (App.data.flujo && App.data.flujo.categorias) || [];
    if (!cats.length) return Promise.resolve(local); // sin catálogo no hay nada que enviar: degrada a local
    var categorias = cats.map(function (c) { return { id: c.id, label: c.label }; });
    var ctrl = new AbortController();
    var to = setTimeout(function () { ctrl.abort(); }, 4000);

    return fetch(base + "/api/clasificar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texto: texto, categorias: categorias }),
      signal: ctrl.signal
    }).then(function (r) {
      clearTimeout(to);
      if (!r.ok) throw new Error("worker " + r.status);
      return r.json();
    }).then(function (data) {
      if (data && data.categoria && App.getCategoria(data.categoria)) {
        return { categoria: data.categoria, fuente: "ia" };
      }
      return local;
    }).catch(function () { clearTimeout(to); return local; });
  };

  /* Devuelve el bloque de UI "descríbelo en tus palabras".
     onPick(categoriaObj) se llama cuando el usuario confirma la sugerencia. */
  App.clasificadorBox = function (onPick) {
    var status = App.el("p", { class: "nl-status", id: "nlStatus", "aria-live": "polite" });
    var input = App.el("input", { type: "text", id: "nlInput",
      placeholder: "Ej.: necesito apostillar mi partida de nacimiento para Italia",
      "aria-label": "Describe tu documento en tus palabras" });

    function go() {
      var val = input.value.trim();
      if (!val) { status.textContent = ""; return; }
      status.textContent = "Buscando la categoría…";
      App.clasificarTexto(val).then(function (res) {
        if (!res) { status.textContent = "No identificamos el documento. Elige una categoría de la lista de arriba o usa la tarjeta \"¿No encuentras tu documento?\" de más abajo para que te orientemos."; return; }
        var cat = App.getCategoria(res.categoria);
        if (!cat) { status.textContent = "No identificamos el documento. Elige una categoría arriba o usa la tarjeta \"¿No encuentras tu documento?\" de más abajo."; return; }
        App.clear(status);
        status.appendChild(document.createTextNode((res.fuente === "ia" ? "Sugerencia (IA): " : "¿Quisiste decir? ")));
        status.appendChild(App.el("button", { class: "btn btn--ghost", type: "button",
          style: "min-height:44px;padding:8px 14px;margin-left:6px",
          onclick: function () { onPick(cat); } }, [App.icon(cat.icono) + " " + cat.label + " →"]));
      });
    }

    input.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); go(); } });

    return App.el("div", { class: "nl-box" }, [
      App.el("label", { for: "nlInput", text: "¿No encuentras tu documento? Descríbelo en tus palabras (opcional)" }),
      App.el("div", { class: "nl-row" }, [
        input,
        App.el("button", { class: "btn", type: "button", onclick: go }, ["Buscar"])
      ]),
      status
    ]);
  };
})();
