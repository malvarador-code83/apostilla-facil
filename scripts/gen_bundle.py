#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
gen_bundle.py — Genera assets/js/data-bundle.js a partir de los JSON públicos de data/.

Por qué: permite abrir index.html con doble clic (protocolo file://) sin servidor,
ya que fetch() de archivos locales está bloqueado por CORS en muchos navegadores.
El bundle NO incluye el dataset completo de autoridades (privado); solo firmas_demo.json.

Fuente de verdad = los .json de data/. Este bundle es un derivado generado.

Uso:
  set PYTHONIOENCODING=utf-8
  py -3.14 scripts\\gen_bundle.py
"""
import json
import os

PUBLIC = {
    "cadenas": "cadenas.json",
    "paises": "paises.json",
    "glosario": "glosario.json",
    "tips": "tips.json",
    "flujo": "flujo.json",
    "firmasDemo": "firmas_demo.json",
    "comoFunciona": "como_funciona.json",
    "oficinas": "oficinas.json",
    "requisitos": "requisitos.json",
}


def validar_coherencia(bundle):
    """Coherencia gratuidad <-> costo del paso MRE en cada cadena.
    Falla la generación si una cadena declara gratuidad (texto) pero su paso MRE
    cobra > 0 (eso produciría una pantalla contradictoria 'Gratuidad' + 'S/ 31').
    Avisa (sin abortar) si el MRE va en 0 pero la cadena no declara la gratuidad."""
    problemas, avisos = [], []
    for c in bundle["cadenas"].get("cadenas", []):
        cid = c.get("id", "?")
        gratu = c.get("gratuidad")
        es_gratis_str = isinstance(gratu, str) and gratu.strip() != ""
        mre_costos = [(p.get("costo") or 0) for p in c.get("pasos", []) if p.get("entidad") == "MRE"]
        if not mre_costos:
            continue
        if es_gratis_str and any(x > 0 for x in mre_costos):
            problemas.append(f"{cid}: declara gratuidad ('{gratu}') pero el paso MRE cobra {mre_costos}")
        if (not es_gratis_str) and all(x == 0 for x in mre_costos):
            avisos.append(f"{cid}: paso MRE en costo 0 (saldría 'Gratis') pero la cadena no declara 'gratuidad' (texto)")
    for a in avisos:
        print("  [aviso coherencia]", a)
    if problemas:
        for p in problemas:
            print("  [ERROR coherencia]", p)
        raise SystemExit("Abortado: incoherencia gratuidad <-> costo del MRE (corrige cadenas.json).")
    print("Coherencia gratuidad/costo MRE: OK")


def main():
    here = os.path.dirname(__file__)
    data_dir = os.path.join(here, "..", "data")
    out_path = os.path.join(here, "..", "assets", "js", "data-bundle.js")

    bundle = {}
    for key, fname in PUBLIC.items():
        path = os.path.join(data_dir, fname)
        with open(path, "r", encoding="utf-8") as f:
            bundle[key] = json.load(f)

    validar_coherencia(bundle)

    js = (
        "/* GENERADO por scripts/gen_bundle.py — NO editar a mano.\n"
        "   Fuente de verdad: los .json de /data. Permite abrir index.html en local (file://).\n"
        "   No incluye el dataset completo de autoridades (privado). */\n"
        "window.APOSTILLA_DATA = " + json.dumps(bundle, ensure_ascii=False) + ";\n"
    )
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(js)

    print("Bundle generado:", os.path.abspath(out_path))
    print("Claves:", ", ".join(bundle.keys()))
    print("Cadenas:", len(bundle["cadenas"]["cadenas"]),
          "| Categorías:", len(bundle["flujo"]["categorias"]),
          "| Demo firmas:", len(bundle["firmasDemo"]["registros"]))


if __name__ == "__main__":
    main()
