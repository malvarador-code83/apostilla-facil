#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
csv_to_json.py — Convierte "Autoridades firmantes.csv" (privado, condicion del Lab MRE)
en JSON para el verificador de firmas.

Produce DOS salidas:
  1) data/autoridades.json    -> dataset COMPLETO (gitignored). Se carga al KV privado del Worker.
                                  NUNCA se publica ni se commitea (condicion del Lab MRE).
  2) data/firmas_demo.json     -> dataset PUBLICO de demostracion: los registros vigentes REALES
                                  (publicos: autoridades en ejercicio de la Junta de Decanos) +
                                  registros SINTETICOS declarados, para que el verificador
                                  funcione en local/offline sin exponer la lista completa.

Uso (PC trabajo o casa):
  set PYTHONIOENCODING=utf-8
  py -3.14 scripts\\csv_to_json.py [ruta_csv] [--fecha AAAA-MM-DD]

Por defecto:
  - CSV de entrada: "..\\..\\_insumos\\3-investigacion-campo\\Autoridades firmantes.csv"
    (reorganizado 2026-06-13). Fallback: antigua raiz "..\\.." y "Autoridades firmantes.csv" en el cwd.
  - Fecha de referencia para "vigente": 2026-06-12 (fecha de la hackaton, reproducible).
"""
import csv
import json
import sys
import os
import unicodedata
from datetime import date

REFERENCE_DATE = "2026-06-12"  # reproducible para la demo (hallazgo 4/167)


def normaliza(texto: str) -> str:
    """NFKD + quita tildes + minusculas + colapsa espacios."""
    if texto is None:
        return ""
    t = unicodedata.normalize("NFKD", texto)
    t = "".join(c for c in t if not unicodedata.combining(c))
    t = " ".join(t.split())
    return t.lower()


def parse_aaaammdd(s: str):
    s = (s or "").strip()
    if len(s) != 8 or not s.isdigit():
        return None
    try:
        return date(int(s[0:4]), int(s[4:6]), int(s[6:8]))
    except ValueError:
        return None


def buscar_csv(arg_path):
    if arg_path and os.path.isfile(arg_path):
        return arg_path
    candidatos = [
        # Ubicacion nueva tras reorganizar la carpeta (2026-06-13): _insumos/3-investigacion-campo/
        os.path.join(os.path.dirname(__file__), "..", "..", "_insumos", "3-investigacion-campo", "Autoridades firmantes.csv"),
        os.path.join(os.path.dirname(__file__), "..", "..", "Autoridades firmantes.csv"),
        os.path.join(os.path.dirname(__file__), "..", "Autoridades firmantes.csv"),
        "Autoridades firmantes.csv",
    ]
    for c in candidatos:
        if os.path.isfile(c):
            return os.path.abspath(c)
    return None


def main():
    args = [a for a in sys.argv[1:]]
    fecha_ref = REFERENCE_DATE
    csv_arg = None
    i = 0
    while i < len(args):
        if args[i] == "--fecha" and i + 1 < len(args):
            fecha_ref = args[i + 1]
            i += 2
        else:
            csv_arg = args[i]
            i += 1

    ref = parse_aaaammdd(fecha_ref.replace("-", ""))
    if ref is None:
        print(f"Fecha de referencia invalida: {fecha_ref}")
        sys.exit(1)

    csv_path = buscar_csv(csv_arg)
    if not csv_path:
        print("No se encontro 'Autoridades firmantes.csv'. Pasa la ruta como argumento.")
        sys.exit(1)

    registros = []
    with open(csv_path, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f, delimiter=";")
        for row in reader:
            inicio = parse_aaaammdd(row.get("INICIO", ""))
            fin = parse_aaaammdd(row.get("FIN", ""))
            vigente = bool(inicio and fin and inicio <= ref <= fin)
            registros.append({
                "id_entidad": (row.get("ID_ENTIDAD") or "").strip(),
                "entidad": (row.get("ENTIDAD_FIRMANTE") or "").strip(),
                "entidad_norm": normaliza(row.get("ENTIDAD_FIRMANTE")),
                "id_autoridad": (row.get("ID_AUTORIDAD") or "").strip(),
                "nombre": " ".join((row.get("AUTORIDAD_FIRMANTE") or "").split()),
                "nombre_norm": normaliza(row.get("AUTORIDAD_FIRMANTE")),
                "cargo": (row.get("CARGO") or "").strip(),
                "inicio": (row.get("INICIO") or "").strip(),
                "fin": (row.get("FIN") or "").strip(),
                "vigente_ref": vigente,
            })

    autoridades_unicas = {r["id_autoridad"] for r in registros}
    vigentes = [r for r in registros if r["vigente_ref"]]
    entidades = sorted({r["entidad"] for r in registros})

    meta = {
        "descripcion": "Dataset COMPLETO de autoridades firmantes. USO EXCLUSIVO DE PROTOTIPADO (condicion del Lab MRE). NO PUBLICAR.",
        "fecha_referencia": fecha_ref,
        "total_registros": len(registros),
        "total_autoridades": len(autoridades_unicas),
        "vigentes_en_referencia": len(vigentes),
        "entidades": entidades,
    }

    out_dir = os.path.join(os.path.dirname(__file__), "..", "data")
    os.makedirs(out_dir, exist_ok=True)

    # 1) Dataset completo (gitignored)
    full_path = os.path.join(out_dir, "autoridades.json")
    with open(full_path, "w", encoding="utf-8") as f:
        json.dump({"_meta": meta, "registros": registros}, f, ensure_ascii=False, indent=2)

    # 2) Demo publico: vigentes reales (autoridades publicas en ejercicio) + sinteticos declarados
    sinteticos = [
        {"id_entidad": "882", "entidad": "RENIEC", "entidad_norm": "reniec",
         "id_autoridad": "S001", "nombre": "DEMO PEREZ GARCIA MARIA (SINTETICO)", "nombre_norm": "demo perez garcia maria (sintetico)",
         "cargo": "CERTIFICADOR", "inicio": "20250101", "fin": "20271231", "vigente_ref": True, "sintetico": True},
        {"id_entidad": "461", "entidad": "MINISTERIO DE EDUCACION", "entidad_norm": "ministerio de educacion",
         "id_autoridad": "S002", "nombre": "DEMO QUISPE TORRES JOSE (SINTETICO)", "nombre_norm": "demo quispe torres jose (sintetico)",
         "cargo": "LEGALIZADOR", "inicio": "20250101", "fin": "20271231", "vigente_ref": True, "sintetico": True},
        {"id_entidad": "882", "entidad": "RENIEC", "entidad_norm": "reniec",
         "id_autoridad": "S003", "nombre": "DEMO RAMIREZ SOTO ANA (SINTETICO)", "nombre_norm": "demo ramirez soto ana (sintetico)",
         "cargo": "CERTIFICADOR", "inicio": "20161020", "fin": "20171020", "vigente_ref": False, "sintetico": True},
    ]
    # Solo exponemos los campos que el verificador realmente usa
    # (minimizacion de datos / privacidad por diseno): sin IDs internos ni columnas *_norm.
    DEMO_FIELDS = ("entidad", "nombre", "cargo", "inicio", "fin", "vigente_ref")

    def _demo(r, es_sintetico):
        d = {k: r.get(k) for k in DEMO_FIELDS}
        d["sintetico"] = bool(es_sintetico)
        return d

    demo_registros = [_demo(r, False) for r in vigentes] + [_demo(s, True) for s in sinteticos]
    demo_meta = {
        "descripcion": "Dataset PUBLICO de demostracion del verificador. Contiene autoridades vigentes REALES (publicas, en ejercicio) y registros SINTETICOS declarados. NO es la lista completa.",
        "fecha_referencia": fecha_ref,
        "registros_reales_vigentes": len(vigentes),
        "registros_sinteticos": len(sinteticos),
        "aviso": "Los registros marcados 'sintetico' son ficticios y solo sirven para la demo.",
    }
    demo_path = os.path.join(out_dir, "firmas_demo.json")
    with open(demo_path, "w", encoding="utf-8") as f:
        json.dump({"_meta": demo_meta, "registros": demo_registros}, f, ensure_ascii=False, indent=2)

    print("=== csv_to_json.py ===")
    print(f"CSV de entrada : {csv_path}")
    print(f"Fecha referencia: {fecha_ref}")
    print(f"Total registros : {len(registros)}")
    print(f"Autoridades     : {len(autoridades_unicas)}")
    print(f"VIGENTES        : {len(vigentes)}  -> {full_path}")
    for r in vigentes:
        print(f"   * {r['nombre']} ({r['cargo']}) [{r['entidad']}] {r['inicio']}-{r['fin']}")
    print(f"Demo publico    : {len(demo_registros)} registros -> {demo_path}")


if __name__ == "__main__":
    main()
