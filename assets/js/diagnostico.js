/* ============================================================
   diagnostico.js — Flujo B: "ya tengo el documento, verifícalo".
   Convierte los 3 errores más frecuentes en preguntas que el ojo
   no entrenado SÍ puede responder, y emite un veredicto.
   ============================================================ */
(function () {
  "use strict";
  var App = window.App;

  function preguntasAplicables(categoria) {
    var d = (App.data.flujo.diagnostico && App.data.flujo.diagnostico.preguntas) || [];
    return d.filter(function (p) { return (p.aplica_categoria || []).indexOf(categoria) !== -1; });
  }

  App.steps.diagnostico = function (stage, state) {
    var cadena = App.getCadena(state.cadenaId);
    var preguntas = preguntasAplicables(state.categoria);
    var answers = {}; // id -> "si" | "no"

    var titulo = App.el("fieldset", { class: "q" }, [
      App.el("p", { class: "step-eyebrow", text: "Verificar mi documento" }),
      App.el("legend", { class: "q-legend", text: "Mira tu documento y responde" }),
      App.el("p", { class: "step-sub", text: "Comparamos lo que ves con los errores que más causan rechazo. No subes nada: solo respondes." })
    ]);
    stage.appendChild(titulo);

    var verBtn = App.el("button", { class: "btn btn--lg", type: "button", disabled: "disabled",
      onclick: function () { App.go("veredicto", { diag: snapshot() }); } }, ["Ver resultado →"]);

    function snapshot() {
      return preguntas.map(function (p) { return { id: p.id, faltante: p.si_no, detalle: p.detalle_faltante || null, paso: p.cadena_paso_faltante, ok: answers[p.id] === "si" }; });
    }
    function refresh() {
      var allAnswered = preguntas.every(function (p) { return answers[p.id]; });
      if (allAnswered) verBtn.removeAttribute("disabled"); else verBtn.setAttribute("disabled", "disabled");
    }

    if (preguntas.length === 0) {
      // Sin pregunta visual específica: diagnóstico genérico basado en la regla general.
      stage.appendChild(App.el("div", { class: "alert alert--note" }, [App.el("span", { class: "ico", "aria-hidden": "true", text: "🔎" }),
        "Para este tipo de documento, lo clave es que el ÚLTIMO firmante tenga su firma registrada y vigente en el Ministerio. Verifícalo abajo."]));
      stage.appendChild(App.el("div", { class: "actions-row" }, [
        App.el("button", { class: "btn", type: "button", onclick: function () { App.go("verificador"); } }, ["🔎 Buscar la firma del funcionario"]),
        App.el("button", { class: "btn btn--ghost", type: "button", onclick: function () { irAlPlan(state); } }, ["Ver mi plan completo"]),
        App.backButton()
      ]));
      return;
    }

    var lista = App.el("div", { class: "option-list" });
    preguntas.forEach(function (p) {
      var siBtn, noBtn;
      function mark(val) {
        answers[p.id] = val;
        [siBtn, noBtn].forEach(function (b) { b.setAttribute("aria-pressed", "false"); b.classList.remove("btn"); b.classList.add("btn--ghost"); b.textContent = b.getAttribute("data-label"); });
        var chosen = val === "si" ? siBtn : noBtn;
        chosen.setAttribute("aria-pressed", "true"); chosen.classList.remove("btn--ghost"); chosen.classList.add("btn");
        chosen.textContent = "✓ " + chosen.getAttribute("data-label"); // señal NO cromática del estado elegido (WCAG 1.4.1)
        refresh();
      }
      siBtn = App.el("button", { class: "btn--ghost", type: "button", style: "min-height:44px", "aria-pressed": "false", "data-label": "Sí", onclick: function () { mark("si"); } }, ["Sí"]);
      noBtn = App.el("button", { class: "btn--ghost", type: "button", style: "min-height:44px", "aria-pressed": "false", "data-label": "No", onclick: function () { mark("no"); } }, ["No"]);

      var card = App.el("div", { class: "step-card" }, [
        App.el("h3", { text: p.pregunta }),
        p.ayuda ? App.el("p", { class: "where", text: p.ayuda }) : null,
        App.el("div", { class: "actions-row", style: "margin-top:10px", role: "group", "aria-label": p.pregunta }, [siBtn, noBtn])
      ]);
      lista.appendChild(card);
    });
    stage.appendChild(lista);
    stage.appendChild(App.el("div", { class: "actions-row" }, [verBtn, App.backButton()]));
    App.announce("Verificación: responde " + preguntas.length + " preguntas sobre tu documento.");
  };

  function irAlPlan(state) {
    // Para ver el plan completo necesitamos saber el país. Si nunca se preguntó
    // (paisKey === undefined, p. ej. veníamos del Flujo B), lo pedimos.
    // paisKey === null es una elección válida ("Otro país"): muestra el plan general.
    if (state.paisKey === undefined) { App.go("pais"); return; }
    App.go("resultado", { urgente: !!state.urgente });
  }
  App._irAlPlan = irAlPlan;

  App.steps.veredicto = function (stage, state) {
    var faltantes = (state.diag || []).filter(function (d) { return !d.ok; });
    var ok = faltantes.length === 0;

    if (ok) {
      stage.appendChild(App.el("div", { class: "verdict ok" }, [
        App.el("p", { class: "big-ico", "aria-hidden": "true", text: "✅" }),
        App.el("h2", { text: "Tu documento se ve listo para ir al MRE" }),
        App.el("p", { text: "Según lo que respondiste, no detectamos los errores más frecuentes. Aun así, confirma en la ventanilla de Informes del MRE." })
      ]));
    } else {
      var ul = App.el("ul", {}, faltantes.map(function (d) {
        var children = [App.el("strong", { text: d.faltante })];
        if (d.detalle) {
          var info = App.el("div", { class: "where", style: "margin-top:6px" });
          if (d.detalle.donde) info.appendChild(App.el("p", { style: "margin:2px 0" }, [App.el("strong", { text: "📍 Dónde: " }), d.detalle.donde]));
          if (d.detalle.demora) info.appendChild(App.el("p", { style: "margin:2px 0" }, [App.el("strong", { text: "⏱️ Demora: " }), d.detalle.demora]));
          if (d.detalle.costo) info.appendChild(App.el("p", { style: "margin:2px 0" }, [App.el("strong", { text: "💰 Costo: " }), d.detalle.costo]));
          children.push(info);
        }
        return App.el("li", {}, children);
      }));
      stage.appendChild(App.el("div", { class: "verdict warn" }, [
        App.el("p", { class: "big-ico", "aria-hidden": "true", text: "⚠️" }),
        App.el("h2", { text: "Te falta " + (faltantes.length === 1 ? "un paso" : "algunos pasos") + " antes de ir al MRE" }),
        App.el("p", { text: "Resuelve esto primero para evitar el rechazo:" }),
        ul
      ]));
    }

    stage.appendChild(App.el("div", { class: "actions-row" }, [
      App.el("button", { class: "btn", type: "button", onclick: function () { App._irAlPlan(state); } }, ["Ver mi plan completo →"]),
      App.el("button", { class: "btn btn--ghost", type: "button", onclick: function () { App.go("verificador"); } }, ["🔎 Buscar una autoridad/firma"]),
      App.el("button", { class: "btn btn--ghost", type: "button", onclick: function () { App.restart(); } }, ["↺ Empezar de nuevo"]),
      App.backButton()
    ]));
    App.announce(ok ? "Tu documento se ve listo." : "Te faltan pasos antes de ir al MRE.");
  };
})();
