/* ============================================================
   wizard.js — pantallas del asistente guiado (modo desde_cero).
   Cada paso lee App.state y navega con App.go(...).
   ============================================================ */
(function () {
  "use strict";
  var App = window.App;

  /* Numeración de pasos del asistente: 4 (desde cero) o 3 (tutor de trámites). */
  App.totalSteps = function () { return 3; };
  App.stepN = function (n) { return "Paso " + n + " de " + App.totalSteps(); };

  var ICON = {
    acta: "📄", universidad: "🎓", instituto: "🏫", colegio: "📘", antecedentes: "🛂",
    medico: "🩺", trabajo: "💼", notarial: "✍️", colegio_profesional: "🏛️", migraciones: "🛃",
    judicial: "⚖️", iglesia: "⛪", traduccion: "🌐", estado: "🗂️", consular: "🌍",
    ruta: "🧭", check: "✅"
  };
  App.icon = function (key) { return ICON[key] || "📄"; };

  /* Tarjeta-escape: si el documento del ciudadano no encaja en las categorías,
     no dejarlo en un callejón sin salida — derivar a Informes del MRE y al verificador. */
  App.escapeCard = function () {
    return App.el("div", { class: "step-card" }, [
      App.el("h3", {}, [App.el("span", { "aria-hidden": "true", text: "🧭 " }), "¿No encuentras tu documento?"]),
      App.el("p", { class: "where", text: "Regla general: el ÚLTIMO firmante de tu documento debe tener su firma registrada y vigente ante el MRE. Si tu caso no aparece en la lista, confírmalo en la ventanilla de Informes del MRE antes de ir." }),
      App.el("p", { class: "where", html: "<span aria-hidden=\"true\">✉️</span> <strong>legalizacionyapostillatrc@rree.gob.pe</strong> &nbsp;·&nbsp; Cadena oficial: <strong>gob.pe/58518</strong>" }),
      App.el("div", { class: "actions-row", style: "margin-top:10px" }, [
        App.el("button", { class: "btn btn--ghost", type: "button", onclick: function () { App.go("verificador"); } }, ["🔎 Verificar una firma del documento"])
      ])
    ]);
  };

  /* Decide el siguiente paso una vez elegida la cadena (respeta ramificación y modo). */
  App.proceedFromCadena = function (cadenaId) {
    var cadena = App.getCadena(cadenaId);
    if (cadena && cadena.ramificacion) {
      App.go("ramificacion", { cadenaId: cadenaId, subtipo: null });
    } else {
      App.go("pais", { cadenaId: cadenaId, subtipo: null });
    }
  };

  App.afterRamificacion = function () {
    return "pais";
  };

  /* ---------------- LANDING ---------------- */
  App.steps.landing = function (stage) {
    function pathCard(icon, title, sub, fn) {
      return App.el("button", { class: "option mode-card", type: "button", onclick: fn }, [
        App.el("span", { class: "opt-icon", "aria-hidden": "true", text: icon }),
        App.el("span", { class: "opt-body" }, [
          App.el("span", { class: "opt-title", text: title }),
          App.el("span", { class: "opt-sub", text: sub })
        ])
      ]);
    }
    var costos = App.el("div", { class: "stat-panel", role: "note", "aria-label": "Costos del trámite" }, [
      App.el("p", { class: "stat-panel-title", text: "Costos del trámite (derecho del MRE)" }),
      App.el("div", { class: "stat-row" }, [
        App.el("div", { class: "stat" }, [App.el("b", { text: "S/ 31" }), App.el("span", { text: "presencial (en oficina)" })]),
        App.el("div", { class: "stat" }, [App.el("b", { text: "S/ 18" }), App.el("span", { text: "digital (documento electrónico)" })]),
        App.el("div", { class: "stat" }, [App.el("b", { text: "Gratis" }), App.el("span", { text: "estudios de peruanos" })])
      ]),
      App.el("div", { class: "actions-row", style: "justify-content:center; margin:2px 0 0" }, [
        App.el("button", { class: "btn btn--ghost btn--pagalo", type: "button", onclick: function () { window.open("https://www.pagalo.pe/", "_blank", "noopener"); } },
          ["💳 Pagar el derecho en Págalo.pe ", App.el("span", { "aria-hidden": "true", text: "↗" })])
      ]),
      App.el("p", { class: "stat-source", text: "El pago del derecho del MRE se realiza en Págalo.pe. Montos referenciales; obtener tu documento puede tener un costo aparte." })
    ]);

    var hero = App.el("section", { class: "hero" }, [
      App.el("h1", { text: "Descubre qué necesita tu documento antes de ir al Ministerio de Relaciones Exteriores" }),
      App.el("p", { class: "lead", text: "Te decimos, paso a paso, qué firmas y sellos necesita tu documento para apostillarlo o legalizarlo — con tiempos, costos y dónde ir. Sin confusión, sin intermediarios y sin pedirte tus datos." }),
      App.el("div", { class: "mode-grid landing-paths" }, [
        pathCard("🧭", "Empezar la guía", "No he empezado el trámite — te armo el plan paso a paso", function () { App.go("tipo", { modo: "desde_cero" }); }),
        pathCard("🧑‍🏫", "Tutor de trámites", "Ya empecé — checklist que marca lo hecho y te dice qué pasos te faltan", function () { App.go("tipo", { modo: "tutor" }); })
      ]),
      App.el("div", { class: "actions-row landing-tools" }, [
        App.el("button", { class: "btn btn--guia", type: "button", onclick: function () { App.go("comoFunciona"); } },
          ["📖 ¿Cómo funciona la Apostilla?"]),
        App.el("button", { class: "btn btn--guia", type: "button", onclick: function () { App.go("oficinas"); } },
          ["📍 ¿Dónde apostillar? Oficinas del MRE"]),
        App.el("button", { class: "btn btn--guia", type: "button", onclick: function () { App.go("verificador"); } },
          ["🔎 Buscar una autoridad o firma"])
      ]),
      costos,
      App.el("p", { class: "search-hint", style: "text-align:center", text: "🔒 No te pedimos nombre ni DNI. Tu documento no se sube a ningún servidor." })
    ]);
    stage.appendChild(hero);
    App.announce("Apostilla Fácil. Pantalla de inicio.");
  };

  /* ---------------- CÓMO FUNCIONA (explicación general, antes del wizard) ---------------- */
  App.steps.comoFunciona = function (stage) {
    var d = App.data.comoFunciona || {};
    var head = App.el("div", { class: "result-head" }, [
      App.el("p", { class: "step-eyebrow", style: "color:#ffd7dd", text: d.eyebrow || "Cómo funciona" }),
      App.el("h2", { text: d.titulo || "Cómo tu documento llega válido al exterior" }),
      App.el("div", { class: "route-meta" }, [
        App.el("span", { class: "chip" }, [App.el("span", { "aria-hidden": "true", text: "📄 " }), "Documento"]),
        App.el("span", { class: "flow-arrow", "aria-hidden": "true", text: "→" }),
        App.el("span", { class: "chip" }, [App.el("span", { "aria-hidden": "true", text: "✍️ " }), "Firma registrada en el MRE"]),
        App.el("span", { class: "flow-arrow", "aria-hidden": "true", text: "→" }),
        App.el("span", { class: "chip" }, [App.el("span", { "aria-hidden": "true", text: "🏛️ " }), "El MRE la certifica"]),
        App.el("span", { class: "flow-arrow", "aria-hidden": "true", text: "→" }),
        App.el("span", { class: "chip" }, [App.el("span", { "aria-hidden": "true", text: "🌎 " }), "Válido en el exterior"])
      ])
    ]);
    stage.appendChild(head);

    if (d.intro) stage.appendChild(App.el("p", { class: "step-sub", text: d.intro }));
    if (d.principio) {
      stage.appendChild(App.el("div", { class: "alert alert--tip" }, [App.el("span", { class: "ico", "aria-hidden": "true", text: "🔑" }),
        App.el("span", {}, [App.el("strong", { text: "La idea clave: " }), d.principio])]));
    }

    var pasos = d.pasos || [];
    if (pasos.length) {
      var ol = App.el("ol", { class: "timeline" });
      pasos.forEach(function (p, i) {
        var card = App.el("div", { class: "step-card" }, [
          App.el("h3", { text: p.titulo }),
          App.el("p", { class: "where", text: p.detalle })
        ]);
        ol.appendChild(App.el("li", {}, [App.el("span", { class: "step-num", "aria-hidden": "true", text: String(i + 1) }), card]));
      });
      stage.appendChild(ol);
    }

    var tr = d.traduccion;
    if (tr) {
      var box = App.el("div", { class: "step-card is-mre" }, [App.el("h3", { text: tr.titulo })]);
      if (tr.intro) box.appendChild(App.el("p", { class: "where", text: tr.intro }));
      (tr.opciones || []).forEach(function (o) {
        box.appendChild(App.el("div", { class: "alert alert--note" }, [App.el("span", { class: "ico", "aria-hidden": "true", text: "🌐" }),
          App.el("span", {}, [App.el("strong", { text: o.tipo + ": " }), o.detalle])]));
      });
      if (tr.aviso) box.appendChild(App.el("div", { class: "alert alert--warn" }, [App.el("span", { class: "ico", "aria-hidden": "true", text: "⚠️" }),
        App.el("span", {}, [App.el("strong", { text: "Ojo: " }), tr.aviso])]));
      stage.appendChild(box);
    }

    if (d.cierre) stage.appendChild(App.el("p", { class: "step-sub", style: "margin-top:18px", text: d.cierre }));

    stage.appendChild(App.el("div", { class: "actions-row" }, [
      App.el("button", { class: "btn btn--lg", type: "button", onclick: function () { App.go("tipo", { modo: "desde_cero" }); } },
        [(d.cta || "Empezar mi trámite") + " ", App.el("span", { "aria-hidden": "true", text: "→" })]),
      App.el("button", { class: "btn btn--ghost", type: "button", onclick: function () { App.restart(); } }, ["↺ Volver al inicio"])
    ]));
    App.announce((d.titulo || "Cómo funciona") + ". Explicación general de cómo tu documento sale al exterior.");
  };

  /* ---------------- OFICINAS DEL MRE (¿dónde apostillar?) ---------------- */
  App.steps.oficinas = function (stage) {
    var d = App.data.oficinas || {};
    var meta = d._meta || {};
    stage.appendChild(App.el("div", { class: "result-head" }, [
      App.el("p", { class: "step-eyebrow", style: "color:#ffd7dd", text: "Oficinas del MRE" }),
      App.el("h2", { text: meta.titulo || "¿Dónde apostillar o legalizar?" })
    ]));
    if (meta.intro) stage.appendChild(App.el("p", { class: "step-sub", text: meta.intro }));
    if (meta.digital) stage.appendChild(App.el("div", { class: "alert alert--tip" }, [
      App.el("span", { class: "ico", "aria-hidden": "true", text: "💻" }),
      App.el("span", {}, [App.el("strong", { text: "En línea: " }), meta.digital])]));

    (d.grupos || []).forEach(function (g) {
      stage.appendChild(App.el("p", { class: "group-label", text: g.grupo }));
      if (g.nota) stage.appendChild(App.el("p", { class: "search-hint", text: g.nota }));
      var cont = App.el("div", { class: "office-cards" });
      (g.oficinas || []).forEach(function (o) {
        var badge = o.apostilla
          ? App.el("span", { class: "tag tag--ok", text: "✓ Apostilla y legalización" })
          : App.el("span", { class: "tag", text: "Consultar disponibilidad" });
        var card = App.el("div", { class: "step-card" }, [
          App.el("h3", {}, [o.nombre, " ", badge])
        ]);
        if (o.ciudad) card.appendChild(App.el("p", { class: "where" }, [App.el("span", { "aria-hidden": "true", text: "🏙️ " }), o.ciudad]));
        if (o.direccion) card.appendChild(App.el("p", { class: "where" }, [App.el("span", { "aria-hidden": "true", text: "📍 " }), o.direccion]));
        if (o.horario) card.appendChild(App.el("p", { class: "where" }, [App.el("span", { "aria-hidden": "true", text: "🕒 " }), o.horario]));
        if (o.telefono) card.appendChild(App.el("p", { class: "where" }, [App.el("span", { "aria-hidden": "true", text: "📞 " }), o.telefono]));
        if (o.correo) card.appendChild(App.el("p", { class: "where" }, [App.el("span", { "aria-hidden": "true", text: "✉️ " }), o.correo]));
        cont.appendChild(card);
      });
      stage.appendChild(cont);
    });

    if (meta.aviso) stage.appendChild(App.el("div", { class: "alert alert--note" }, [
      App.el("span", { class: "ico", "aria-hidden": "true", text: "ℹ️" }), meta.aviso]));
    if (meta.fuente_texto) stage.appendChild(App.el("p", { class: "search-hint", text: "Fuente: " + meta.fuente_texto }));

    stage.appendChild(App.el("div", { class: "actions-row" }, [
      App.el("button", { class: "btn btn--lg", type: "button", onclick: function () { App.go("tipo", { modo: "desde_cero" }); } },
        ["Empezar mi trámite ", App.el("span", { "aria-hidden": "true", text: "→" })]),
      App.el("button", { class: "btn btn--ghost", type: "button", onclick: function () { App.restart(); } }, ["↺ Volver al inicio"])
    ]));
    App.announce("Oficinas del MRE donde se realiza la apostilla y legalización.");
  };

  /* (El antiguo Paso 1 "modo" se eliminó: ahora el landing ofrece directamente
     "Empezar la guía" (desde_cero) o "Tutor de trámites" (tutor). El tutor se va
     a App.steps.tutor tras elegir documento y país; ver resultado.js.) */

  /* ---------------- TIPO (grilla de categorías + buscador + NL) ---------------- */
  App.steps.tipo = function (stage, state) {
    var cats = App.data.flujo.categorias;

    var grid = App.el("div", { class: "cat-grid", id: "catGrid" });
    function renderCats(filter) {
      App.clear(grid);
      var f = (filter || "").trim().toLowerCase();
      var shown = 0;
      cats.forEach(function (c) {
        var hay = (c.label + " " + (c.sublabel || "")).toLowerCase();
        if (f && hay.indexOf(f) === -1) return;
        shown++;
        grid.appendChild(App.el("button", {
          class: "option", type: "button", dataset: { cat: c.id },
          onclick: function () { onPickCategoria(c); }
        }, [
          App.el("span", { class: "opt-icon", "aria-hidden": "true", text: App.icon(c.icono) }),
          App.el("span", { class: "opt-body" }, [
            App.el("span", { class: "opt-title", text: c.label }),
            App.el("span", { class: "opt-sub", text: c.sublabel || "" })
          ]),
          App.el("span", { class: "opt-arrow", "aria-hidden": "true", text: "›" })
        ]));
      });
      if (shown === 0) grid.appendChild(App.el("p", { class: "search-hint", text: "No encontramos ese documento. Prueba con otra palabra o elige una categoría." }));
    }

    function onPickCategoria(c) {
      if (c.cadena_id) { App.go_categoria(c, c.cadena_id); }
      else { App.go("desambiguacion", { categoria: c.id }); }
    }

    var search = App.el("div", { class: "search-box" }, [
      App.el("label", { class: "sr-only", for: "catSearch", text: "Buscar tu tipo de documento" }),
      App.el("input", { type: "text", id: "catSearch", placeholder: "Escribe tu documento (ej. partida, título, antecedentes)…",
        oninput: function (e) { renderCats(e.target.value); } })
    ]);

    var legendTxt = state.modo === "tutor" ? "¿Qué documento estás tramitando?" : "¿Qué documento quieres preparar?";
    stage.appendChild(App.el("fieldset", { class: "q" }, [
      App.el("p", { class: "step-eyebrow", text: App.stepN(1) }),
      App.el("legend", { class: "q-legend", text: legendTxt }),
      App.el("p", { class: "step-sub", text: "Elige la categoría que mejor describe tu documento. Si no la ves, usa el buscador." }),
      search,
      grid,
      App.clasificadorBox ? App.clasificadorBox(onPickCategoria) : null,
      App.escapeCard(),
      App.el("div", { class: "actions-row" }, [App.backButton()])
    ]));
    renderCats("");
    App.announce(legendTxt);
  };

  /* Atajo: elegir categoría con cadena única */
  App.go_categoria = function (cat, cadenaId) {
    App.state = Object.assign({}, App.state, { categoria: cat.id });
    App.proceedFromCadena(cadenaId);
  };

  /* ---------------- DESAMBIGUACIÓN ---------------- */
  App.steps.desambiguacion = function (stage, state) {
    var cat = App.getCategoria(state.categoria);
    var d = cat && cat.desambiguacion;
    if (!d) { App.back(); return; }

    var opciones = App.el("div", { class: "option-list" }, d.opciones.map(function (o) {
      return App.el("button", { class: "option", type: "button",
        onclick: function () { App.proceedFromCadena(o.cadena_id); } }, [
        App.el("span", { class: "opt-body" }, [App.el("span", { class: "opt-title", text: o.texto })]),
        App.el("span", { class: "opt-arrow", "aria-hidden": "true", text: "›" })
      ]);
    }));

    stage.appendChild(App.el("fieldset", { class: "q" }, [
      App.el("p", { class: "step-eyebrow", text: "Sobre tu documento" }),
      App.el("legend", { class: "q-legend", text: d.pregunta }),
      d.ayuda ? App.el("p", { class: "step-sub", text: d.ayuda }) : null,
      opciones,
      App.el("div", { class: "actions-row" }, [App.backButton()])
    ]));
    App.announce(d.pregunta);
  };

  /* ---------------- RAMIFICACIÓN (pregunta propia de la cadena) ---------------- */
  App.steps.ramificacion = function (stage, state) {
    var cadena = App.getCadena(state.cadenaId);
    var r = cadena && cadena.ramificacion;
    if (!r) { App.go(App.afterRamificacion(), {}); return; }

    var opciones = App.el("div", { class: "option-list" }, r.opciones.map(function (o) {
      return App.el("button", { class: "option", type: "button",
        onclick: function () {
          var patch = Object.assign({}, o.set || {});
          App.go(App.afterRamificacion(), patch);
        } }, [
        App.el("span", { class: "opt-body" }, [App.el("span", { class: "opt-title", text: o.texto })]),
        App.el("span", { class: "opt-arrow", "aria-hidden": "true", text: "›" })
      ]);
    }));

    stage.appendChild(App.el("fieldset", { class: "q" }, [
      App.el("p", { class: "step-eyebrow", text: cadena.nombre_ciudadano }),
      App.el("legend", { class: "q-legend", text: r.pregunta }),
      r.ayuda ? App.el("p", { class: "step-sub", text: r.ayuda }) : null,
      opciones,
      App.el("div", { class: "actions-row" }, [App.backButton()])
    ]));
    App.announce(r.pregunta);
  };

  /* ---------------- PAÍS ---------------- */
  App.steps.pais = function (stage, state) {
    var paises = App.data.paises.paises;
    var keys = Object.keys(paises);

    var list = App.el("div", { class: "option-list", id: "paisList" });
    function paisBtn(k) {
      return App.el("button", { class: "option", type: "button",
        onclick: function () { App.go(App.state.modo === "tutor" ? "tutor" : "resultado", { paisKey: k }); } }, [
        App.el("span", { class: "opt-body" }, [App.el("span", { class: "opt-title", text: paises[k].nombre })]),
        App.el("span", { class: "opt-arrow", "aria-hidden": "true", text: "›" })
      ]);
    }
    function render(filter) {
      App.clear(list);
      var f = (filter || "").trim().toLowerCase();
      var sinTrad = [], conTrad = [];
      keys.forEach(function (k) {
        if (f && paises[k].nombre.toLowerCase().indexOf(f) === -1) return;
        if (paises[k].traduccion === "no_requiere") sinTrad.push(k); else conTrad.push(k);
      });
      // Grupo 1: mismo idioma (sin traducción)
      if (sinTrad.length) {
        list.appendChild(App.el("p", { class: "group-label", text: "✅ Países con idioma oficial español — sin traducción" }));
        sinTrad.forEach(function (k) { list.appendChild(paisBtn(k)); });
      }
      // Grupo 2: otro idioma (con traducción)
      if (conTrad.length) {
        list.appendChild(App.el("p", { class: "group-label", text: "🌐 Países con otro idioma oficial — con traducción (TPJ/TC)" }));
        conTrad.forEach(function (k) { list.appendChild(paisBtn(k)); });
      }
      // siempre ofrecer "otro país"
      list.appendChild(App.el("button", { class: "option", type: "button",
        onclick: function () { App.go(App.state.modo === "tutor" ? "tutor" : "resultado", { paisKey: null }); } }, [
        App.el("span", { class: "opt-body" }, [
          App.el("span", { class: "opt-title", text: "Otro país / no estoy seguro" }),
          App.el("span", { class: "opt-sub", text: "Te damos la guía general (apostilla vs legalización)." })
        ]),
        App.el("span", { class: "opt-arrow", "aria-hidden": "true", text: "›" })
      ]));
    }

    var search = App.el("div", { class: "search-box" }, [
      App.el("label", { class: "sr-only", for: "paisSearch", text: "Buscar país de destino" }),
      App.el("input", { type: "text", id: "paisSearch", placeholder: "Escribe el país (ej. Italia, España, Estados Unidos)…",
        oninput: function (e) { render(e.target.value); } })
    ]);

    stage.appendChild(App.el("fieldset", { class: "q" }, [
      App.el("p", { class: "step-eyebrow", text: App.stepN(2) }),
      App.el("legend", { class: "q-legend", text: "¿A qué país va tu documento?" }),
      App.el("p", { class: "step-sub", text: "Lo dividimos en dos grupos: destinos que hablan español (sin traducción) y destinos de otro idioma (con traducción). Esto define si necesitas apostilla o legalización y si habrá pasos de traducción." }),
      search, list,
      App.el("div", { class: "actions-row" }, [App.backButton()])
    ]));
    render("");
    App.announce("¿A qué país va tu documento?");
  };

  /* ---------------- URGENCIA ---------------- */
  App.steps.urgencia = function (stage) {
    var opciones = App.el("div", { class: "option-list" }, [
      App.el("button", { class: "option", type: "button",
        onclick: function () { App.go("resultado", { urgente: true }); } }, [
        App.el("span", { class: "opt-icon", "aria-hidden": "true", text: "⏱️" }),
        App.el("span", { class: "opt-body" }, [
          App.el("span", { class: "opt-title", text: "Sí, tengo una fecha límite" }),
          App.el("span", { class: "opt-sub", text: "Te mostramos atajos legítimos para ganar tiempo." })
        ])
      ]),
      App.el("button", { class: "option", type: "button",
        onclick: function () { App.go("resultado", { urgente: false }); } }, [
        App.el("span", { class: "opt-icon", "aria-hidden": "true", text: "🗓️" }),
        App.el("span", { class: "opt-body" }, [
          App.el("span", { class: "opt-title", text: "Sin apuro" }),
          App.el("span", { class: "opt-sub", text: "Ruta estándar, con todos los pasos." })
        ])
      ])
    ]);

    stage.appendChild(App.el("fieldset", { class: "q" }, [
      App.el("p", { class: "step-eyebrow", text: App.stepN(3) }),
      App.el("legend", { class: "q-legend", text: "¿Tienes una fecha límite?" }),
      opciones,
      App.el("div", { class: "actions-row" }, [App.backButton()])
    ]));
    App.announce("¿Tienes una fecha límite?");
  };

})();
