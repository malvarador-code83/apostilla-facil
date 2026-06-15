# Plan de versiones en varios idiomas — Apostilla Fácil

> **Estado: PLANEADO, NO implementado.** Documento para retomar en otra sesión.
> Creado el 2026-06-14. El MVP que se presentó está **solo en español**.

## Objetivo

Ofrecer la página en **6 idiomas**: **español** (base) + **quechua, inglés, francés, alemán e italiano**.
(Perú es plurilingüe y el público objetivo del trámite incluye destinos en esos idiomas.)

## ¿Se puede? Sí — pero es un trabajo de varias sesiones

El app es **HTML/CSS/JS vanilla sin build** (sin framework). Ventaja: sin lock-in. Desventaja: **no hay capa de
internacionalización (i18n) todavía** — hay que añadirla. El texto a traducir vive en **dos lugares**.

## Inventario del texto a traducir (medido el 2026-06-14)

| Origen | Volumen |
|---|---|
| **Datos** (`data/*.json`, excluye `autoridades.json` privado) | **~10 650 palabras** en ~1 123 cadenas |
|   · `cadenas.json` (las 25 cadenas — el grueso) | ~5 705 palabras |
|   · `requisitos.json` | ~1 799 |
|   · `paises.json` | ~1 012 |
|   · `flujo.json`, `oficinas.json`, `como_funciona.json`, `tips.json`, `glosario.json`, `firmas_demo.json` | ~2 130 |
| **UI hardcodeada en JS** | **~202 frases** (`resultado.js` ~97, `wizard.js` ~56, `diagnostico.js` ~18, `verificador.js` ~18, `clasificador.js` ~9, `app.js` ~4) |
| **`index.html`** | título, header, footer (pocas) |

**Total por idioma ≈ 10 650 palabras + ~202 frases de UI.** Para los 5 idiomas nuevos ≈ **~53 000 palabras** a traducir + revisar.

**NO se traduce:** nombres propios y siglas (RENIEC, MRE, TPJ, TC, Apostilla, Convenio de La Haya, Págalo.pe, Banco de la
Nación), direcciones/teléfonos/correos de oficinas, y el dataset privado de autoridades (`autoridades.json`, gitignored).

## Arquitectura propuesta (i18n)

1. **Capa i18n:** función `t(clave)` + catálogos por idioma. Idioma actual en estado + `localStorage` + (opcional) en la
   URL (`?lang=en` o rutas `/en/`). Atributo `<html lang>` dinámico.
2. **Selector de idioma** en el header (junto al logo "Apostilla Fácil").
3. **UI:** extraer las ~202 frases hardcodeadas de los `.js` a catálogos `data/i18n/{lang}.json` (`es`, `qu`, `en`, `fr`,
   `de`, `it`) y refactorizar los JS para que usen `t("clave")` en vez del string literal.
4. **Datos:** dos opciones —
   - **(A) Archivos por idioma** → `data/{lang}/cadenas.json`, etc. **(Recomendado:** separa responsabilidades; se traduce
     y revisa por idioma; `gen_bundle.py` genera un bundle por idioma.)
   - (B) Campos por idioma en cada nodo → `"que": {"es": "…", "en": "…"}` (más compacto, pero infla los archivos y mezcla idiomas).
5. **`gen_bundle.py`:** generar `data-bundle.{lang}.js` (o un bundle con todos); el app carga el del idioma elegido.

## Fases sugeridas

- **Fase 0 — Decisiones** (ver abajo). Hacer ANTES de codificar.
- **Fase 1 — Infra i18n:** selector + `t()` + carga por idioma + `<html lang>`. (~1 sesión.) Probar con `es` + `en`.
- **Fase 2 — Extracción:** sacar las ~202 frases de UI al catálogo base `es` y refactor de los JS. (~1 sesión.)
- **Fase 3 — Traducción (primer pase MT):** UI + datos por idioma con un buen modelo (Claude / DeepL). Automatizable por script.
- **Fase 4 — Revisión humana / legal por idioma.** El paso más importante (ver caveats). Cuello de botella real.
- **Fase 5 — QA por idioma:** render, textos que rompen el layout (alemán es largo), totales, accesibilidad, `<title>`/meta.

## Caveats críticos

1. **Quechua:** no existe un solo "quechua". En Perú el más usado para uso oficial es el **quechua sureño (Chanka / Collao)**.
   La **traducción automática de quechua es débil y poco fiable** → necesita **traductor humano** (idealmente certificado).
   Para v1 podría cubrirse solo la UI + landing en quechua y dejar las 25 cadenas para una fase posterior.
2. **Exactitud legal:** es un servicio de trámites; los pasos deben ser correctos en cada idioma. **Revisión por alguien que
   conozca el trámite (idealmente el MRE)** antes de publicar. Las siglas y nombres propios NO se traducen.
3. **Mantenimiento:** cada cambio de contenido se multiplica × 6 idiomas. Conviene **congelar el contenido en español** antes
   de traducir y definir un proceso para sincronizar cambios (marcar entradas "desactualizadas" cuando cambia el `es`).
4. **Calidad MT:** inglés / francés / alemán / italiano salen bien con un primer pase MT + revisión ligera. **Quechua NO.**

## Decisiones abiertas (Fase 0)

- [ ] **Variante de quechua** (Chanka / Collao / otra) y fuente de traducción/revisión.
- [ ] **Alcance v1:** ¿los 6 idiomas completos, o UI + landing primero y las cadenas después? ¿Quechua solo UI al inicio?
- [ ] **Herramienta de traducción** (Claude API / DeepL) y presupuesto.
- [ ] **Quién revisa** la exactitud legal/lingüística por idioma.
- [ ] **Estructura de datos:** archivos por idioma (recomendado) vs campos por idioma.
- [ ] **URL/SEO:** `?lang=en` vs rutas `/en/` (afecta SEO y cómo se sirve en GitHub Pages).

## Estimación de esfuerzo (orientativa)

- Infra + extracción (Fases 1-2): **~2 sesiones** de desarrollo.
- Traducción MT (Fase 3): automatizable, **horas** (no días) con un script + modelo.
- Revisión humana (Fase 4): **el cuello de botella**; depende de revisores (quechua y legal), no de código.
- QA (Fase 5): ~1 sesión.

## Cómo empezar la próxima sesión

1. Leer este documento.
2. Resolver las decisiones de **Fase 0** (sobre todo: variante de quechua y alcance de v1).
3. Empezar por **Fase 1** con `es` + `en` como par de prueba (el inglés es fácil de validar), y luego escalar al resto.
4. Mantener `es` como **fuente de verdad**; los demás idiomas derivan de él.
