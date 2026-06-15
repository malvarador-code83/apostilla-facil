# Datos y fuentes — trazabilidad

| Dato | Archivo en el repo | Fuente | Naturaleza |
|---|---|---|---|
| 25 cadenas de certificación | `data/cadenas.json` | `6570703-cadena-de-certificaciones.pdf` (gob.pe / MRE) | Oficial MRE |
| Esqueleto del wizard | `data/flujo.json` | Diseño propio | Diseño |
| Reglas por país | `data/paises.json` | Conocimiento de campo (reunión con tramitadora) | **Orientativo** |
| Atajos / tiempos reales | `data/tips.json` | Conocimiento de campo | **Orientativo** |
| Glosario ciudadano | `data/glosario.json` | Diseño propio | Diseño |
| Firmas (demo) | `data/firmas_demo.json` | Derivado del CSV (vigentes reales + sintéticos) | Mixto (declarado) |
| Firmas (completo) | `data/autoridades.json` *(gitignored)* | `Autoridades firmantes.csv` (Lab MRE) | **Privado** |

## Condición de uso del dataset de autoridades

El CSV **"Autoridades firmantes"** fue provisto por el Lab MRE **solo para el prototipado**. Por su
condición de uso:

- **No se publica ni se redistribuye.** Está excluido del repositorio en `.gitignore`
  (`data/autoridades.json`).
- En producción se carga a un **KV privado** de Cloudflare; la Function `/api/verificar-firma`
  responde **una sola consulta** sin exponer la lista completa.
- La **demo pública** usa `data/firmas_demo.json`: los registros **vigentes reales** (autoridades en
  ejercicio de la Junta de Decanos, información pública) + registros **sintéticos declarados** como
  tales (campo `"sintetico": true`).

## Hallazgo que vuelve real la demostración

Procesando el CSV con `scripts/csv_to_json.py` a la fecha de referencia **2026-06-12**:

- **167** registros de firmas; **113** autoridades distintas; **6** entidades.
- **Solo 4 de 167** estaban **vigentes** — todas de la **Junta de Decanos** (periodo 2025-02-27 →
  2027-02-26). El resto, **caducadas** (RENIEC venció en 2017-2018; Educación, en su mayoría, en
  2020-2021).

Esto **es** el problema en miniatura: una firma puede existir pero estar **fuera de vigencia**, y eso
provoca rechazo. Y evidencia una **recomendación al MRE**: publicar y mantener un directorio de firmas
vigentes, como ya existe para los Traductores Públicos Juramentados.

## Manejo honesto de la incertidumbre

- Las **reglas por país** (Milán, España, EE. UU., etc.) son de **campo**, no del PDF oficial. La
  interfaz las muestra como orientación y **siempre** recomienda confirmar con la entidad destinataria.
- Si una combinación tipo + emisor no está en `cadenas.json`, el asistente **no improvisa**: deriva a la
  entidad rectora o a la ventanilla de Informes.
- Toda pantalla cierra recordando que la guía **prepara** pero **no reemplaza** la ventanilla del MRE.
