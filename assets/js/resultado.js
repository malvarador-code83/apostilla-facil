/* ============================================================
   resultado.js — el plan paso a paso (la pantalla que gana).
   Cruza cadena + subtipo + país + urgencia con la base de datos.
   ============================================================ */
(function () {
  "use strict";
  var App = window.App;

  function money(n) { return "S/ " + Number(n).toFixed(2); }

  /* Lógica de país: acción final (apostilla/legalización) + notas de traducción */
  function reglaPais(cadena, rule) {
    var out = { accion: "Apostilla o legalización", banner: null, traduccion: null, excepciones: [] };
    if (!cadena.depende_pais) { out.accion = "Legalización"; }
    if (!rule) return out;

    if (cadena.depende_pais) {
      if (rule.apostilla === true) out.accion = "Apostilla";
      else if (rule.apostilla === false) {
        out.accion = "Apostilla (quizá no necesaria)";
        out.banner = "Según el destino, para " + (rule.nombre || "este país") + " a menudo NO se exige apostilla, pero DEBES confirmarlo con la entidad o el empleador antes de decidir (puede variar por institución y, en EE.UU., por estado). Te mostramos igual la ruta completa. " + (rule.nota || "");
      } else {
        out.accion = "Apostilla o legalización (según el país)";
      }
    }
    // Traducción
    var leyenda = (App.data.paises._meta && App.data.paises._meta.leyenda_traduccion) || {};
    if (rule.traduccion && rule.traduccion !== "no_requiere" && cadena.categoria !== "traduccion") {
      out.traduccion = leyenda[rule.traduccion] || rule.traduccion;
    }
    if (rule.excepciones) {
      rule.excepciones.forEach(function (e) { out.excepciones.push(e.mensaje || (e.region + ": " + e.regla)); });
    }
    if (rule.orientativo) out.orientativo = true;
    out.grupo = rule.grupo || null;
    return out;
  }

  /* Tips de urgencia aplicables a esta cadena */
  function tipsUrgencia(cadena) {
    var tips = (App.data.tips && App.data.tips.tips_urgencia) || [];
    return tips.filter(function (t) {
      return t.aplica_a.indexOf("todos") !== -1 ||
             t.aplica_a.indexOf(cadena.id) !== -1 ||
             t.aplica_a.indexOf(cadena.categoria) !== -1;
    });
  }

  /* Pasos de una vía de traducción (TPJ o TC), con el MISMO formato que la línea de tiempo
     del documento (círculo numerado + tarjeta), continuando la numeración desde startNum. */
  function viaCostoFijo(via) {
    return (via.pasos || []).reduce(function (s, p) { return s + (typeof p.costo === "number" ? p.costo : 0); }, 0);
  }
  // Rango de días por paso: el MRE va de 1 (presencial) a 3 (digital); otros usan dias_min/dias_max o dias_estimados.
  function rangoDiasPaso(p) {
    var mn = (typeof p.dias_min === "number") ? p.dias_min : (p.dias_estimados || 0);
    var mx = (typeof p.dias_max === "number") ? p.dias_max : (p.dias_estimados || 0);
    if (p.entidad === "MRE") { mn = 1; mx = 3; }
    return [mn, mx];
  }
  function viaRango(via) {
    var mn = 0, mx = 0;
    (via.pasos || []).forEach(function (p) { var r = rangoDiasPaso(p); mn += r[0]; mx += r[1]; });
    return [mn, mx];
  }
  function diasTxtPaso(p) {
    var r = rangoDiasPaso(p);
    if (!r[0] && !r[1]) return "el mismo día";
    return (r[0] === r[1]) ? ("a lo mucho " + r[0] + (r[0] === 1 ? " día" : " días")) : (r[0] + " a " + r[1] + " días");
  }

  function viaTimeline(via, startNum) {
    var ol = App.el("ol", { class: "timeline" });
    (via.pasos || []).forEach(function (p, i) {
      var esMre = (p.entidad === "MRE");
      var card = App.el("div", { class: "step-card" + (esMre ? " is-mre" : "") }, [App.el("h3", { text: p.que })]);
      if (p.entidad) card.appendChild(App.el("p", { class: "where", html: "<span aria-hidden=\"true\">🏛️</span> <strong>" + escapeHtml(p.entidad) + "</strong>" }));
      if (p.donde) card.appendChild(App.el("p", { class: "where" }, [App.el("span", { "aria-hidden": "true", text: "📍 " }), p.donde]));
      var meta = App.el("div", { class: "meta" }, [App.el("span", { class: "tag", text: "⏱️ " + diasTxtPaso(p) })]);
      if (typeof p.costo === "number") meta.appendChild(App.el("span", { class: "tag", text: "💰 " + money(p.costo) + (esMre ? " (S/ 18 digital)" : "") }));
      else if (p.costo_ref) meta.appendChild(App.el("span", { class: "tag", text: "💰 " + p.costo_ref }));
      card.appendChild(meta);
      if (p.pago) card.appendChild(App.el("p", { class: "where", text: "Pago: " + p.pago }));
      if (p.costo_nota) card.appendChild(App.el("div", { class: "alert alert--note" }, [App.el("span", { class: "ico", "aria-hidden": "true", text: "💰" }), p.costo_nota]));
      if (p.enlace && p.enlace.url) card.appendChild(App.el("p", { class: "where" }, [App.el("span", { "aria-hidden": "true", text: "🔗 " }),
        App.el("a", { href: p.enlace.url, target: "_blank", rel: "noopener noreferrer", class: "ext-link" }, [(p.enlace.texto || "Ver enlace oficial") + " ↗"])]));
      ol.appendChild(App.el("li", {}, [App.el("span", { class: "step-num", "aria-hidden": "true", text: String(startNum + i + 1) }), card]));
    });
    return ol;
  }

  /* Paso 1 "Prepara tu documento": requisitos/condiciones + costo y días de OBTENCIÓN + tip. */
  function prepCard(req) {
    var card = App.el("div", { class: "step-card step-card--prep" }, [App.el("h3", { text: "Prepara tu documento (requisitos)" })]);
    if (req.condiciones && req.condiciones.length) {
      card.appendChild(App.el("ul", { class: "req-list" }, req.condiciones.map(function (c) { return App.el("li", { text: c }); })));
    }
    var meta = App.el("div", { class: "meta" });
    if (req.dias_obtencion) meta.appendChild(App.el("span", { class: "tag", text: "⏱️ " + req.dias_obtencion }));
    if (req.costo_obtencion != null) meta.appendChild(App.el("span", { class: "tag", text: req.costo_obtencion === 0 ? "💰 Gratis (obtención)" : "💰 aprox. " + money(req.costo_obtencion) + " (obtención)" }));
    if (meta.childNodes.length) card.appendChild(meta);
    if (req.costo_nota) card.appendChild(App.el("div", { class: "alert alert--note" }, [App.el("span", { class: "ico", "aria-hidden": "true", text: "💰" }), req.costo_nota]));
    if (req.comprobante) card.appendChild(App.el("p", { class: "where" }, [App.el("span", { "aria-hidden": "true", text: "🧾 " }), "Ten listo el comprobante de pago del derecho del MRE (págalo.pe)."]));
    if (req.tip) card.appendChild(App.el("div", { class: "alert alert--tip" }, [App.el("span", { class: "ico", "aria-hidden": "true", text: "💡" }), req.tip]));
    return card;
  }

  App.steps.resultado = function (stage, state) {
    var cadena = App.getCadena(state.cadenaId);
    if (!cadena) { App.restart(); return; }
    var rule = App.getPais(state.paisKey);
    var pasos = App.pasosEfectivos(cadena, state.subtipo);
    var pinfo = reglaPais(cadena, rule);
    var reqDoc = (App.data.requisitos && App.data.requisitos.requisitos && App.data.requisitos.requisitos[state.cadenaId]) || null;
    var stepOffset = reqDoc ? 1 : 0;

    // TOTAL = obtención (Paso 1) + cada paso (MRE: 1 a 3 días, S/31 presencial) + traducción (si aplica).
    var totalCosto = 0, costoVariable = false, obtencionVariable = false;
    var baseMin = 0, baseMax = 0;
    if (reqDoc) {
      var od = (typeof reqDoc.dias_obtencion_num === "number") ? reqDoc.dias_obtencion_num : 0;
      baseMin += od; baseMax += od;
      if (typeof reqDoc.costo_obtencion === "number") totalCosto += reqDoc.costo_obtencion;
      else { costoVariable = true; obtencionVariable = true; } // la obtención varía
    }
    pasos.forEach(function (p) { var r = rangoDiasPaso(p); baseMin += r[0]; baseMax += r[1]; totalCosto += (p.costo || 0); });

    // Traducción (si el destino no usa español): suma sus días (rango) y el 2.º trámite del MRE (S/31).
    var tp = (App.data.paises && App.data.paises._meta && App.data.paises._meta.traduccion_pasos) || null;
    var soloTpj = !!(rule && rule.traduccion === "tpj_obligatorio");
    var hayTrad = !!(pinfo.traduccion && tp);
    var rTpj = hayTrad ? viaRango(tp.tpj) : [0, 0];
    var rTc = hayTrad ? viaRango(tp.tc) : [0, 0];
    var cFijoTrad = hayTrad ? viaCostoFijo(tp.tpj) : 0; // = S/31 (2.ª legalización del MRE)
    if (hayTrad) costoVariable = true; // honorario del traductor (variable, aparte)

    var diasMin = baseMin + (hayTrad ? (soloTpj ? rTpj[0] : Math.min(rTpj[0], rTc[0])) : 0);
    var diasMax = baseMax + (hayTrad ? (soloTpj ? rTpj[1] : Math.max(rTpj[1], rTc[1])) : 0);
    var diasRange = (diasMin === diasMax) ? String(diasMin) : (diasMin + " a " + diasMax);
    var costoFull = totalCosto + (hayTrad ? cFijoTrad : 0); // tasas oficiales (obtención + MRE + 2.º MRE); honorario aparte
    var costoTxt = costoFull === 0 ? "Gratis" : (costoVariable ? "desde " + money(costoFull) : money(costoFull));

    var destino = rule && rule.nombre ? (" → " + rule.nombre) : "";

    /* ----- Cabecera ----- */
    var head = App.el("div", { class: "result-head" }, [
      App.el("p", { class: "step-eyebrow", style: "color:#ffd7dd", text: "Tu plan, paso a paso" }),
      App.el("h2", { text: cadena.nombre_ciudadano + destino }),
      App.el("div", { class: "route-meta" }, [
        App.el("span", { class: "chip" }, ["🏁 ", App.el("b", { text: pinfo.accion })]),
        App.el("span", { class: "chip" }, ["⏱️ aprox. ", App.el("b", { text: diasRange + " días" }), " hábiles"]),
        App.el("span", { class: "chip" }, ["💰 ", App.el("b", { text: costoTxt })])
      ])
    ]);
    stage.appendChild(head);

    /* ----- "Detalles de cada paso" (acordeón al INICIO): se llena más abajo con la línea de tiempo + traducción ----- */
    var detalles = App.el("details", { class: "detalles-paso detalles-paso--top" }, [
      App.el("summary", { class: "detalles-summary" }, [
        App.el("span", { class: "detalles-summary-title" }, [App.el("span", { "aria-hidden": "true", text: "🔎 " }), "Detalles de cada paso",
          App.el("span", { class: "detalles-cta" }, [App.el("span", { "aria-hidden": "true", text: "👉 " }), "Haz clic aquí"])]),
        App.el("span", { class: "detalles-summary-hint", text: "Requisitos, dónde ir, teléfonos, tips y errores frecuentes — toca para desplegar" })
      ])
    ]);
    stage.appendChild(detalles);

    /* ----- Banner de grupo: ¿necesita traducción? (según el idioma del destino) ----- */
    if (rule && rule.nombre && cadena.depende_pais && cadena.categoria !== "traduccion") {
      if (pinfo.traduccion) {
        stage.appendChild(App.el("div", { class: "alert alert--note" }, [App.el("span", { class: "ico", "aria-hidden": "true", text: "🌐" }),
          App.el("span", {}, [App.el("strong", { text: "Necesita traducción. " }), rule.nombre + " usa otro idioma: además de apostillar/legalizar deberás traducir el documento (el detalle de las dos vías está en \"Detalles de cada paso\")."])]));
      } else {
        stage.appendChild(App.el("div", { class: "alert alert--success" }, [App.el("span", { class: "ico", "aria-hidden": "true", text: "✅" }),
          App.el("span", {}, [App.el("strong", { text: "No necesita traducción. " }), rule.nombre + " usa el mismo idioma (español): tu trámite es más directo, sin pasos de traducción."])]));
      }
    }

    /* ----- Aviso de plan compartido ----- */
    if (state._shared) {
      stage.appendChild(App.el("div", { class: "alert alert--note" }, [App.el("span", { class: "ico", "aria-hidden": "true", text: "🔗" }),
        "Este plan te lo compartieron. Revísalo y, si el trámite es para ti, confirma los pasos en la ventanilla de Informes del MRE."]));
    }

    /* ----- Banner país (anglófono, etc.) ----- */
    if (pinfo.banner) {
      stage.appendChild(App.el("div", { class: "alert alert--tip" }, [App.el("span", { class: "ico", "aria-hidden": "true", text: "🌎" }), pinfo.banner]));
    }

    /* ----- Resumen visual: stepper vertical de fases (diagrama de flujo amigable) ----- */
    (function () {
      var TIPO = { normal: "Normal", mre: "MRE", dec: "Decisión" };

      function pill(kind, val) {
        return App.el("span", { class: "rf-pill " + (kind === "dias" ? "p-dias" : "p-costo") }, [
          App.el("span", { class: "rf-sr", text: kind === "dias" ? "Días: " : "Costo: " }),
          (kind === "dias" ? "⏱️ " : "💵 ") + val
        ]);
      }
      function ebrow(fase, tipo) {
        return App.el("div", { class: "rf-ebrow" }, [
          App.el("span", { class: "rf-fase", text: fase }),
          App.el("span", { class: "rf-tag-type", text: TIPO[tipo] || "Normal" })
        ]);
      }
      function stepLi(dot, tipo, fase, titulo, dias, costo, opts) {
        opts = opts || {};
        var props = { class: "rf-step t-" + tipo + (opts.last ? " is-last" : "") };
        if (opts.role) props.role = opts.role;
        if (opts.ariaLabel) props["aria-label"] = opts.ariaLabel;
        return App.el("li", props, [
          App.el("span", { class: "rf-dot", "aria-hidden": "true", text: dot }),
          App.el("div", { class: "rf-card" }, [
            ebrow(fase, tipo),
            App.el("p", { class: "rf-h", text: titulo }),
            App.el("div", { class: "rf-meta" }, [pill("dias", dias), pill("costo", costo)])
          ])
        ]);
      }
      function subStep(tipo, subnum, fase, badge, titulo, dias, costo) {
        return App.el("div", { class: "rf-substep s-" + tipo }, [
          App.el("div", { class: "rf-ebrow" }, [
            App.el("span", { class: "rf-subnum", "aria-hidden": "true", text: subnum }),
            App.el("span", { class: "rf-fase", text: fase }),
            App.el("span", { class: "rf-tag-type", text: badge })
          ]),
          App.el("p", { class: "rf-sub-h", text: titulo }),
          App.el("div", { class: "rf-meta" }, [pill("dias", dias), pill("costo", costo)])
        ]);
      }
      function totalCard(conTrad) {
        return App.el("div", { class: "rf-total", role: "group", "aria-label": "Total aproximado del trámite" + (conTrad ? " con traducción" : "") }, [
          App.el("div", { class: "rf-total-top" }, [
            App.el("span", { class: "rf-total-flag", "aria-hidden": "true", text: "🏁" }),
            App.el("span", { class: "rf-total-title", text: "TOTAL aprox." + (conTrad ? " (con traducción)" : "") })
          ]),
          App.el("div", { class: "rf-total-stats" }, [
            App.el("div", { class: "rf-stat s-dias" }, [
              App.el("span", { class: "rf-stat-k", text: "⏱️ Tiempo" }),
              App.el("span", { class: "rf-stat-v", text: (diasMin === diasMax ? "a lo mucho " + diasMin : diasRange) + " días" })
            ]),
            App.el("div", { class: "rf-stat s-costo" }, [
              App.el("span", { class: "rf-stat-k", text: "💵 Costo" + (conTrad ? " (tasas oficiales)" : "") }),
              App.el("span", { class: "rf-stat-v", text: costoTxt + (conTrad ? " + honorario*" : "") })
            ])
          ]),
          App.el("p", { class: "rf-total-note", html: conTrad
            ? "<b>* El honorario del traductor va aparte</b> (referencial): TPJ aprox. S/ 150-300 / TC aprox. S/ 100-150 según el documento. El \"desde\" cubre las tasas oficiales (obtención + apostillas del MRE). Abajo, cada paso en detalle."
            : "Resumen de todo el trámite. Abajo, cada paso en detalle." })
        ]);
      }

      stage.appendChild(App.el("p", { class: "rf-eyebrow-map", text: "Tu ruta, paso a paso" }));
      stage.appendChild(App.el("h3", { class: "rf-title", text: "Resumen: pasos, días y costo" }));

      var stepper = App.el("ol", { class: "rf-stepper" });
      var sc = 0; // contador de etapas (encabezados)
      var n = 0;  // número de fase visible
      var lastLi = null;

      var hayPreparar = !!reqDoc || (pasos[0] && pasos[0].entidad !== "MRE");
      if (hayPreparar) stepper.appendChild(stageHead(++sc, "Preparar", "Reúne y certifica tu documento"));

      if (reqDoc) {
        n++;
        var oc = (typeof reqDoc.costo_obtencion === "number")
          ? (reqDoc.costo_obtencion === 0 ? "sin costo" : "aprox. " + money(reqDoc.costo_obtencion) + " · Págalo.pe")
          : "Págalo.pe (varía)";
        lastLi = stepLi(String(n), "normal", "Paso " + n, "Paga el derecho de trámite en el Banco de la Nación o Págalo.pe",
          reqDoc.dias_obtencion ? "el mismo día" : "—", oc, {});
        stepper.appendChild(lastLi);
      }

      var apostillaPuesta = false;
      pasos.forEach(function (p) {
        n++;
        var esMre = p.entidad === "MRE";
        if (esMre && !apostillaPuesta) {
          stepper.appendChild(stageHead(++sc, "Apostillar", "Trámite en el MRE / oficina autorizada"));
          apostillaPuesta = true;
        }
        if (esMre) {
          lastLi = stepLi(String(n), "mre", "Paso " + n, "Apostillar (MRE / oficina autorizada)",
            "1 a 3 días", "S/ 31 presencial · S/ 18 digital", {});
        } else {
          lastLi = stepLi(String(n), "normal", "Paso " + n, p.que,
            diasTxtPaso(p), p.costo ? money(p.costo) : "sin costo", {});
        }
        stepper.appendChild(lastLi);
      });

      var nDec = n + 1;
      if (hayTrad) {
        stepper.appendChild(stageHead(++sc, "Traducir y re-apostillar", "La ruta se divide en dos vías"));
        var decTitulo = soloTpj
          ? "Traducción: este destino exige Traductor Público Juramentado (TPJ)."
          : "Traducción: el documento debe traducirse. Elige UNA de dos vías:";
        stepper.appendChild(stepLi(String(nDec), "dec", "Paso " + nDec, decTitulo,
          "3 días a 1 semana", "honorario del traductor (aparte)",
          { last: true, role: "group", ariaLabel: "Paso " + nDec + ", decisión: traducción" }));
      } else if (lastLi) {
        lastLi.className = lastLi.className + " is-last"; // sin traducción: cierra la espina
      }

      stage.appendChild(stepper);

      if (hayTrad) {
        var circuit = App.el("div", { class: "rf-circuit" });
        circuit.appendChild(App.el("span", { class: "rf-fork-tag",
          text: soloTpj ? "⑂ Vía única: Traductor Público Juramentado" : "⑂ Elige una vía — la espina se divide" }));

        var tpjUrl = (tp && tp.tpj && tp.tpj.pasos && tp.tpj.pasos[0] && tp.tpj.pasos[0].enlace) ? tp.tpj.pasos[0].enlace.url : null;
        var tcUrl = (tp && tp.tc && tp.tc.pasos && tp.tc.pasos[1] && tp.tc.pasos[1].enlace) ? tp.tc.pasos[1].enlace.url : null;
        var rfLink = function (url, text) { return url ? App.el("a", { class: "rf-link ext-link", href: url, target: "_blank", rel: "noopener noreferrer" }, ["🔗 " + text + " ↗"]) : null; };
        var branches = App.el("div", { class: "rf-branches" + (soloTpj ? " one-lane" : "") });
        branches.appendChild(App.el("section", { class: "rf-lane lane-a", "aria-label": "Opción A, con Traductor Público Juramentado" }, [
          App.el("div", { class: "rf-lane-head" }, [
            App.el("span", { class: "rf-lane-badge", "aria-hidden": "true", text: "A" }),
            App.el("span", { class: "rf-lane-title", text: "Opción A — con Traductor Público Juramentado (TPJ)" })
          ]),
          App.el("span", { class: "rf-honorario", text: "💼 TPJ aprox. S/ 150-300*" }),
          rfLink(tpjUrl, "Directorio de TPJ del MRE"),
          subStep("mre", "5A", "Paso " + nDec + "A", "MRE", "Nueva apostilla del MRE: valida la firma del TPJ", "1 a 3 días", "S/ 31 · Págalo.pe / Banco de la Nación")
        ]));
        if (!soloTpj) {
          branches.appendChild(App.el("section", { class: "rf-lane lane-b", "aria-label": "Opción B, con Traductor Colegiado" }, [
            App.el("div", { class: "rf-lane-head" }, [
              App.el("span", { class: "rf-lane-badge", "aria-hidden": "true", text: "B" }),
              App.el("span", { class: "rf-lane-title", text: "Opción B — con Traductor Colegiado (Colegio de Traductores)" })
            ]),
            App.el("span", { class: "rf-honorario", text: "💼 TC aprox. S/ 100-150*" }),
            rfLink(tcUrl, "Tarifa de legalización del Colegio"),
            subStep("normal", "B1", "Paso " + nDec + "B.1", "Normal", "El Colegio de Traductores legaliza la firma del traductor", "1 a 2 días", "aprox. S/ 10"),
            subStep("mre", "B2", "Paso " + nDec + "B.2", "MRE", "Nueva apostilla del MRE: valida la firma del Decano(a) del Colegio", "1 a 3 días", "S/ 31 · Págalo.pe / Banco de la Nación")
          ]));
        }
        circuit.appendChild(branches);

        if (!soloTpj) {
          circuit.appendChild(App.el("div", { class: "rf-merge" }, [
            App.el("span", { class: "rf-merge-label", text: "▼ Las dos vías se reúnen y llegan al mismo total" })
          ]));
        }
        circuit.appendChild(totalCard(true));
        stage.appendChild(circuit);
      } else {
        stage.appendChild(totalCard(false));
      }

      function stageHead(num, titulo, sub) {
        return App.el("li", { class: "rf-stage-head", role: "presentation" }, [
          App.el("span", { class: "rf-stage-n", "aria-hidden": "true", text: String(num) }),
          App.el("span", { class: "rf-stage-tt", text: titulo }),
          sub ? App.el("span", { class: "rf-stage-sub", text: sub }) : null
        ]);
      }
    })();

    /* ----- Línea de tiempo (va dentro del acordeón "Detalles de cada paso" de arriba) ----- */
    var ol = App.el("ol", { class: "timeline" });
    if (reqDoc) {
      ol.appendChild(App.el("li", {}, [App.el("span", { class: "step-num", "aria-hidden": "true", text: "1" }), prepCard(reqDoc)]));
    }
    pasos.forEach(function (p, idx) {
      var esMre = (p.entidad === "MRE");
      var card = App.el("div", { class: "step-card" + (esMre ? " is-mre" : "") });
      // título: en el paso MRE, usa la acción calculada por país
      var titulo = esMre && cadena.depende_pais ? (pinfo.accion + " del documento") : p.que;
      card.appendChild(App.el("h3", { text: titulo }));
      if (p.entidad) card.appendChild(App.el("p", { class: "where", html: "<span aria-hidden=\"true\">🏛️</span> <strong>" + escapeHtml(p.entidad) + "</strong>" }));
      if (p.donde) card.appendChild(App.el("p", { class: "where" }, [App.el("span", { "aria-hidden": "true", text: "📍 " }), p.donde]));
      if (p.telefono) card.appendChild(App.el("p", { class: "where" }, [App.el("span", { "aria-hidden": "true", text: "📞 " }), p.telefono]));

      var meta = App.el("div", { class: "meta" }, [App.el("span", { class: "tag", text: "⏱️ " + (esMre ? "1 a 3 días" : diasTxtPaso(p)) })]);
      if (esMre) meta.appendChild(App.el("span", { class: "tag", text: "💰 " + (p.costo ? money(p.costo) + " presencial · S/ 18.00 digital" : "Gratis para peruanos") }));
      else meta.appendChild(App.el("span", { class: "tag", text: "💰 " + (p.costo ? money(p.costo) : "sin costo") }));
      card.appendChild(meta);

      if (p.error_frecuente) card.appendChild(App.el("div", { class: "alert alert--warn" }, [App.el("span", { class: "ico", "aria-hidden": "true", text: "⚠️" }), App.el("span", {}, [App.el("strong", { text: "Error frecuente: " }), p.error_frecuente])]));
      if (p.tip) card.appendChild(App.el("div", { class: "alert alert--tip" }, [App.el("span", { class: "ico", "aria-hidden": "true", text: "💡" }), p.tip]));
      if (p.nota) card.appendChild(App.el("div", { class: "alert alert--note" }, [App.el("span", { class: "ico", "aria-hidden": "true", text: "ℹ️" }), p.nota]));
      if (esMre) card.appendChild(App.el("div", { class: "alert alert--note" }, [App.el("span", { class: "ico", "aria-hidden": "true", text: "📅" }),
        App.el("span", {}, [App.el("strong", { text: "Plazo oficial del MRE: " }), "hasta 5 días hábiles (el estimado de arriba es referencial; la vía digital o el Centro MAC pueden ser más rápidos, sin garantía)."])]));
      if (esMre && pinfo.traduccion) card.appendChild(App.el("div", { class: "alert alert--warn" }, [App.el("span", { class: "ico", "aria-hidden": "true", text: "➡️" }),
        App.el("span", {}, [App.el("strong", { text: "Este no es el último paso: " }), "como tu destino no usa el español, continúa con los pasos de traducción que aparecen más abajo."])]));

      ol.appendChild(App.el("li", {}, [App.el("span", { class: "step-num", "aria-hidden": "true", text: String(idx + 1 + stepOffset) }), card]));
    });
    detalles.appendChild(ol);

    /* ----- Totales (suma de obtención + pasos + tasa del MRE) ----- */
    stage.appendChild(App.el("div", { class: "totals" }, [
      App.el("div", { class: "total-card" }, [App.el("b", { text: (diasMin === diasMax ? "a lo mucho " + diasMin : diasRange) }), App.el("span", { text: "días hábiles en total (estimado)" })]),
      App.el("div", { class: "total-card" }, [App.el("b", { text: costoTxt }), App.el("span", { text: costoFull === 0 ? "costo (este trámite es gratuito)" : "costo total aproximado del trámite" })])
    ]));

    /* ----- Notas honestas del estimado (costo y tiempo) ----- */
    stage.appendChild(App.el("div", { class: "alert alert--note" }, [App.el("span", { class: "ico", "aria-hidden": "true", text: "💰" }),
      App.el("span", {}, [App.el("strong", { text: "Sobre el costo: " }), "suma el costo de obtener tu documento (referencial) y la tasa del MRE. Si dice \"desde\", hay costos que varían y no se pueden sumar aquí: honorarios de traducción (TPJ/TC), legalización notarial o el reintegro consular. Confírmalos en Págalo.pe o en cada entidad."])]));
    stage.appendChild(App.el("div", { class: "alert alert--note" }, [App.el("span", { class: "ico", "aria-hidden": "true", text: "⏳" }),
      App.el("span", {}, [App.el("strong", { text: "Sobre el tiempo: " }), "es un estimado del trámite; no incluye colas, citas ni traslados. Planifica un margen."])]));

    /* ----- Alternativa digital (S/18) cuando el trámite tiene costo en el MRE ----- */
    var tipDigital = ((App.data.tips && App.data.tips.tips_urgencia) || []).filter(function (t) { return t.id === "apostilla_digital"; })[0];
    if (tipDigital && tipDigital.costo != null && totalCosto > 0) {
      stage.appendChild(App.el("div", { class: "alert alert--tip" }, [App.el("span", { class: "ico", "aria-hidden": "true", text: "💻" }),
        App.el("span", {}, [App.el("strong", { text: "¿Tu documento es digital? " }),
          "Si es íntegramente digital y con firma válida, puedes apostillarlo/legalizarlo en línea: el derecho del MRE baja de S/ 31 (presencial) a " + money(tipDigital.costo) + " (digital), en 2-3 días. Tarifa orientativa: confírmala en Págalo.pe."])]));
    }

    /* ----- Traducción: PASOS ADICIONALES si el país no usa el español ----- */
    if (pinfo.traduccion) {
      var tp = (App.data.paises && App.data.paises._meta && App.data.paises._meta.traduccion_pasos) || null;
      var soloTpj = !!(rule && rule.traduccion === "tpj_obligatorio");
      var baseN = pasos.length + stepOffset;
      detalles.appendChild(App.el("div", { class: "fork-head" }, [
        App.el("h3", {}, [App.el("span", { "aria-hidden": "true", text: "🌐 " }), (tp && tp.titulo) || "Falta traducir el documento"]),
        App.el("p", { class: "step-sub", style: "margin:4px 0 0" }, [App.el("strong", { text: "Para este destino: " }), pinfo.traduccion]),
        tp ? App.el("p", { class: "step-sub", style: "margin:4px 0 0", text: tp.intro }) : null
      ]));
      if (tp) {
        var tpjEnlace2 = tp.tpj && tp.tpj.pasos && tp.tpj.pasos[0] && tp.tpj.pasos[0].enlace;
        var tcEnlace2 = tp.tc && tp.tc.pasos && tp.tc.pasos[1] && tp.tc.pasos[1].enlace;
        if (tpjEnlace2 || (tcEnlace2 && !soloTpj)) {
          var kids = [App.el("strong", { text: "Enlaces oficiales: " })];
          if (tpjEnlace2) { kids.push("Vía A — ", App.el("a", { class: "ext-link", href: tpjEnlace2.url, target: "_blank", rel: "noopener noreferrer" }, ["directorio de TPJ del MRE ↗"])); }
          if (tpjEnlace2 && tcEnlace2 && !soloTpj) { kids.push(" · "); }
          if (tcEnlace2 && !soloTpj) { kids.push("Vía B — ", App.el("a", { class: "ext-link", href: tcEnlace2.url, target: "_blank", rel: "noopener noreferrer" }, ["tarifa de legalización del Colegio ↗"])); }
          detalles.appendChild(App.el("div", { class: "alert alert--note" }, [App.el("span", { class: "ico", "aria-hidden": "true", text: "🔗" }), App.el("span", {}, kids)]));
        }
        var rA = viaRango(tp.tpj), rB = viaRango(tp.tc);
        var fmtR = function (r) { return (r[0] === r[1]) ? ("a lo mucho " + r[0] + (r[0] === 1 ? " día" : " días")) : (r[0] + " a " + r[1] + " días"); };
        detalles.appendChild(App.el("p", { class: "via-label", text: "Vía A · " + tp.tpj.via + " (suma " + fmtR(rA) + " y S/ 31 del 2.º MRE + honorario del TPJ)" }));
        detalles.appendChild(viaTimeline(tp.tpj, baseN));
        if (soloTpj) {
          detalles.appendChild(App.el("div", { class: "alert alert--warn" }, [App.el("span", { class: "ico", "aria-hidden": "true", text: "⚠️" }),
            App.el("span", {}, [App.el("strong", { text: "Ojo: " }), tp.aviso_solo_tpj])]));
        } else {
          detalles.appendChild(App.el("p", { class: "via-label", text: "Vía B · " + tp.tc.via + " (suma " + fmtR(rB) + " y S/ 31 del 2.º MRE + honorarios)" }));
          detalles.appendChild(viaTimeline(tp.tc, baseN));
          if (tp.tc && tp.tc.recordatorio) detalles.appendChild(App.el("div", { class: "alert alert--warn" }, [App.el("span", { class: "ico", "aria-hidden": "true", text: "⚠️" }),
            App.el("span", {}, [App.el("strong", { text: "Recuerda: " }), tp.tc.recordatorio])]));
        }
        var conTrad = "Vía A (TPJ): " + (baseMin + rA[0]) + " a " + (baseMax + rA[1]) + " días, desde " + money(totalCosto + viaCostoFijo(tp.tpj)) +
          (soloTpj ? "" : ". · Vía B (TC): " + (baseMin + rB[0]) + " a " + (baseMax + rB[1]) + " días, desde " + money(totalCosto + viaCostoFijo(tp.tc)));
        detalles.appendChild(App.el("div", { class: "alert alert--note" }, [App.el("span", { class: "ico", "aria-hidden": "true", text: "🧮" }),
          App.el("span", {}, [App.el("strong", { text: "El total estimado ya incluye la traducción. " }), conTrad + ". El honorario del traductor va aparte (referencial); el 2.º trámite del MRE de S/ 31 ya está sumado."])]));
        if (tp.nota_tiempo) detalles.appendChild(App.el("p", { class: "search-hint", text: tp.nota_tiempo }));
        if (tp.nota_costo) detalles.appendChild(App.el("p", { class: "search-hint", text: tp.nota_costo }));
      }
    }
    pinfo.excepciones.forEach(function (m) {
      stage.appendChild(App.el("div", { class: "alert alert--warn" }, [App.el("span", { class: "ico", "aria-hidden": "true", text: "📍" }), App.el("span", {}, [App.el("strong", { text: "Atención: " }), m])]));
    });

    /* ----- Vigencia ----- */
    if (cadena.vigencia_sugerida_meses) {
      stage.appendChild(App.el("div", { class: "alert alert--note" }, [App.el("span", { class: "ico", "aria-hidden": "true", text: "📅" }),
        "Vigencia sugerida: usa el documento dentro de los " + cadena.vigencia_sugerida_meses + " meses de emitido."]));
    }
    /* ----- Gratuidad ----- */
    if (cadena.gratuidad && typeof cadena.gratuidad === "string") {
      stage.appendChild(App.el("div", { class: "alert alert--success" }, [App.el("span", { class: "ico", "aria-hidden": "true", text: "🎓" }),
        App.el("span", {}, [App.el("strong", { text: "Gratuidad: " }), cadena.gratuidad])]));
    }

    /* ----- Con prisa ----- */
    if (state.urgente) {
      var tips = tipsUrgencia(cadena);
      if (tips.length) {
        var ahorroTotal = 0;
        var ul = App.el("ul", {}, tips.map(function (t) {
          var li = App.el("li", {}, [App.el("strong", { text: t.titulo + ": " }), t.detalle]);
          if (t.ahorro) li.appendChild(App.el("span", { text: " Ahorro estimado: " + t.ahorro + "." }));
          if (t.ahorro_dias) ahorroTotal += t.ahorro_dias;
          if (t.costo != null) li.appendChild(App.el("span", { text: " Costo del derecho: " + money(t.costo) + " (orientativo)." }));
          if (t.advertencia) li.appendChild(App.el("em", { text: " (" + t.advertencia + ")" }));
          return li;
        }));
        var rush = [App.el("h3", { text: "⚡ Tienes prisa: atajos legítimos" }), ul];
        if (ahorroTotal > 0) {
          var conPrisa = Math.max(1, baseMax - ahorroTotal);
          rush.push(App.el("p", { class: "via-label", text: "Estándar a lo mucho " + baseMax + " días · Con estos atajos a lo mucho " + conPrisa + " días (orientativo)" }));
        }
        stage.appendChild(App.el("div", { class: "rush-box" }, rush));
      }
    }

    /* ----- Reglas de oro (conocimiento de campo) ----- */
    var reglasOro = (App.data.tips && App.data.tips.reglas_de_oro) || [];
    if (reglasOro.length) {
      stage.appendChild(App.el("details", { class: "reglas-oro" }, [
        App.el("summary", {}, [App.el("span", { "aria-hidden": "true", text: "📌 " }), "Reglas de oro (lo que ya saben quienes hicieron el trámite)"]),
        App.el("ul", {}, reglasOro.map(function (r) { return App.el("li", { text: r }); }))
      ]));
    }

    /* ----- Glosario rápido (jerga → lenguaje ciudadano) ----- */
    var terminos = (App.data.glosario && App.data.glosario.terminos) || {};
    var clavesGlos = Object.keys(terminos);
    if (clavesGlos.length) {
      var dl = App.el("dl", {});
      clavesGlos.forEach(function (k) {
        dl.appendChild(App.el("dt", { text: k.charAt(0).toUpperCase() + k.slice(1) }));
        dl.appendChild(App.el("dd", { text: terminos[k] }));
      });
      stage.appendChild(App.el("details", { class: "glosario-rapido" }, [
        App.el("summary", {}, [App.el("span", { "aria-hidden": "true", text: "📖 " }), "Glosario: ¿qué significan estas palabras?"]),
        dl
      ]));
    }

    /* ----- Cierre obligatorio ----- */
    var notaFinal = (App.data.cadenas && App.data.cadenas._meta && App.data.cadenas._meta.nota_final_obligatoria) ||
      "Esta guía te prepara; confirma los requisitos finales en la ventanilla de Informes del MRE. No reemplaza la atención presencial.";
    stage.appendChild(App.el("div", { class: "alert alert--note" }, [App.el("span", { class: "ico", "aria-hidden": "true", text: "✅" }), notaFinal]));
    if (pinfo.orientativo) {
      var avisoPais = (App.data.paises && App.data.paises._meta && App.data.paises._meta.aviso_global) ||
        "Las reglas por país son orientativas (conocimiento de campo). Confirma siempre con la entidad destinataria o la embajada.";
      stage.appendChild(App.el("p", { class: "search-hint", text: avisoPais }));
    }

    /* ----- Acciones ----- */
    stage.appendChild(App.el("div", { class: "actions-row" }, [
      App.el("button", { class: "btn", type: "button", onclick: function () { window.print(); } }, ["🖨️ Imprimir / Guardar PDF"]),
      App.el("button", { class: "btn btn--ghost", type: "button", onclick: function () { compartir(); } }, ["🔗 Compartir este plan"]),
      App.el("button", { class: "btn btn--ghost", type: "button", onclick: function () { App.go("diagnostico", { categoria: (App.getCadena(state.cadenaId) || {}).categoria }); } }, ["✓ Verificar mi documento"]),
      App.el("button", { class: "btn btn--ghost", type: "button", onclick: function () { App.restart(); } }, ["↺ Empezar de nuevo"])
    ]));
    var shareMsg = App.el("p", { class: "nl-status", id: "shareMsg" });
    stage.appendChild(shareMsg);

    function compartir() {
      var url = App.shareUrl();
      var done = function () { shareMsg.textContent = "Enlace copiado. Envíalo a quien hará el trámite por ti."; };
      if (navigator.share) {
        navigator.share({ title: "Mi plan de apostilla", text: "Pasos para apostillar: " + cadena.nombre_ciudadano, url: url }).catch(function () {});
        return;
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(done, function () { prompt("Copia este enlace:", url); });
      } else { prompt("Copia este enlace:", url); }
    }

    App.announce("Tu plan paso a paso está listo. " + pasos.length + " pasos, aproximadamente " + diasRange + " días.");
  };

  /* ============================================================
     Tutor de trámites: para quien YA empezó. Checklist con casillas
     por paso; resalta el siguiente pendiente y cuánto falta (días/costo).
     Conserva el acceso a "Verificar errores frecuentes" (diagnóstico).
     ============================================================ */
  App.steps.tutor = function (stage, state) {
    var cadena = App.getCadena(state.cadenaId);
    if (!cadena) { App.restart(); return; }
    var rule = App.getPais(state.paisKey);
    var pasos = App.pasosEfectivos(cadena, state.subtipo);
    var pinfo = reglaPais(cadena, rule);
    var reqDoc = (App.data.requisitos && App.data.requisitos.requisitos && App.data.requisitos.requisitos[state.cadenaId]) || null;
    var hayTrad = !!pinfo.traduccion;

    // Lista de pasos rastreables: { titulo, dias:[min,max], costo:number|null, ref, mre }
    var items = [];
    if (reqDoc) {
      var odN = (typeof reqDoc.dias_obtencion_num === "number") ? reqDoc.dias_obtencion_num : 0;
      items.push({ titulo: "Paga el derecho de trámite en el Banco de la Nación o Págalo.pe", dias: [odN, odN],
        costo: (typeof reqDoc.costo_obtencion === "number") ? reqDoc.costo_obtencion : null, ref: (typeof reqDoc.costo_obtencion !== "number") });
    }
    pasos.forEach(function (p) {
      var esMre = p.entidad === "MRE";
      items.push({ titulo: esMre ? "Apostillar o legalizar en el MRE (u oficina autorizada)" : p.que,
        dias: rangoDiasPaso(p), costo: (typeof p.costo === "number") ? p.costo : null, ref: false, mre: esMre });
    });
    if (hayTrad) {
      items.push({ titulo: "Traduce tu documento (Traductor Público Juramentado o Colegio de Traductores)", dias: [3, 5], costo: null, ref: true });
      items.push({ titulo: "Nueva apostilla del MRE sobre la firma del traductor", dias: [1, 3], costo: 31, ref: false, mre: true });
    }

    function fmtDias(r) {
      if (!r[0] && !r[1]) return "el mismo día";
      return (r[0] === r[1]) ? ("a lo mucho " + r[0] + (r[0] === 1 ? " día" : " días")) : (r[0] + " a " + r[1] + " días");
    }
    function fmtCosto(it) {
      if (it.costo === 0) return "sin costo";
      if (typeof it.costo === "number") return (it.ref ? "aprox. " : "") + money(it.costo) + (it.mre ? " (S/ 18 digital)" : "");
      return "costo variable";
    }

    var done = {}; // índice -> true

    stage.appendChild(App.el("div", { class: "result-head" }, [
      App.el("p", { class: "step-eyebrow", style: "color:#ffd7dd", text: "🧑‍🏫 Tutor de trámites" }),
      App.el("h2", { text: "Tu avance: " + cadena.nombre_ciudadano + (rule && rule.nombre ? (" → " + rule.nombre) : "") }),
      App.el("p", { class: "step-sub", style: "color:#ffe9ec; margin-top:6px", text: "Marca los pasos que ya hiciste. Te decimos cuál sigue y cuánto te falta." })
    ]));

    var resumen = App.el("div", { class: "tutor-summary", role: "status", "aria-live": "polite" });
    stage.appendChild(resumen);

    var ol = App.el("ol", { class: "tutor-list" });
    var rows = items.map(function (it, i) {
      var cb = App.el("input", { type: "checkbox", id: "tt" + i, class: "tutor-cb",
        onchange: function (e) { if (e.target.checked) done[i] = true; else delete done[i]; refresh(); } });
      var meta = App.el("div", { class: "rf-meta", style: "margin-top:6px" }, [
        App.el("span", { class: "rf-pill p-dias", text: "⏱️ " + fmtDias(it.dias) }),
        App.el("span", { class: "rf-pill p-costo", text: "💵 " + fmtCosto(it) })
      ]);
      var label = App.el("label", { class: "tutor-row-body", for: "tt" + i }, [
        App.el("span", { class: "tutor-step-n", "aria-hidden": "true", text: String(i + 1) }),
        App.el("span", { class: "tutor-step-main" }, [App.el("span", { class: "tutor-step-title", text: it.titulo }), meta])
      ]);
      var li = App.el("li", { class: "tutor-row" + (it.mre ? " is-mre" : "") }, [cb, label]);
      return { li: li, it: it };
    });
    rows.forEach(function (r) { ol.appendChild(r.li); });
    stage.appendChild(ol);

    function refresh() {
      var firstPending = -1;
      rows.forEach(function (r, i) {
        var hecho = !!done[i];
        r.li.classList.toggle("is-done", hecho);
        r.li.classList.remove("is-next");
        if (!hecho && firstPending === -1) firstPending = i;
      });
      if (firstPending !== -1) rows[firstPending].li.classList.add("is-next");

      var pend = 0, dMin = 0, dMax = 0, cTot = 0, cVar = false;
      items.forEach(function (it, i) {
        if (done[i]) return;
        pend++; dMin += it.dias[0]; dMax += it.dias[1];
        if (typeof it.costo === "number") cTot += it.costo; else cVar = true;
        if (it.ref) cVar = true;
      });
      App.clear(resumen);
      var hechos = items.length - pend;
      if (pend === 0) {
        resumen.appendChild(App.el("div", { class: "verdict ok", style: "margin:0 0 10px" }, [
          App.el("p", { class: "big-ico", "aria-hidden": "true", text: "✅" }),
          App.el("h2", { text: "¡Completaste todos los pasos!" }),
          App.el("p", { text: "Según lo que marcaste, ya hiciste los " + items.length + " pasos. Confirma el resultado final en la ventanilla de Informes del MRE." })
        ]));
      } else {
        var dTxt = (dMin === dMax) ? ("a lo mucho " + dMin + (dMin === 1 ? " día" : " días")) : (dMin + " a " + dMax + " días");
        var cTxt = cTot === 0 ? (cVar ? "costo variable" : "sin costo") : ((cVar ? "desde " : "") + money(cTot));
        var next = rows[firstPending] ? rows[firstPending].it.titulo : "";
        resumen.appendChild(App.el("div", { class: "tutor-progress" }, [
          App.el("p", { class: "tutor-count", html: "Llevas <b>" + hechos + " de " + items.length + "</b> pasos. Te faltan <b>" + pend + "</b>." }),
          App.el("p", { class: "tutor-next" }, [App.el("span", { "aria-hidden": "true", text: "👉 " }), App.el("strong", { text: "Sigue: " }), next]),
          App.el("p", { class: "tutor-remain", html: "Para terminar te falta aprox. <b>" + dTxt + "</b> y <b>" + cTxt + "</b> en tasas (sin contar honorarios de traducción)." })
        ]));
      }
    }
    refresh();

    stage.appendChild(App.el("div", { class: "actions-row", style: "margin-top:16px" }, [
      App.el("button", { class: "btn", type: "button", onclick: function () { App.go("diagnostico", { categoria: state.categoria || cadena.categoria }); } }, ["✓ Verificar errores frecuentes de mi documento"]),
      App.el("button", { class: "btn btn--ghost", type: "button", onclick: function () { App.go("resultado", { urgente: !!state.urgente }); } }, ["📋 Ver el plan completo"]),
      App.el("button", { class: "btn btn--ghost", type: "button", onclick: function () { App.restart(); } }, ["↺ Empezar de nuevo"]),
      App.backButton()
    ]));
    App.announce("Tutor de trámites. " + items.length + " pasos. Marca los que ya hiciste para ver lo que falta.");
  };

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
})();
