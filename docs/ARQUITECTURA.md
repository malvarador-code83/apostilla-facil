# Arquitectura — Apostilla sin adivinar

## Principio rector: *el dato manda sobre el modelo*

En un dominio legal, una respuesta inventada hace daño. Por eso la **inteligencia vive en los datos y
reglas**, no en una conversación. El wizard es una **máquina de estados determinista** que recorre un
árbol de decisión; la IA es una capa **opcional** que solo clasifica texto libre.

```
┌──────────────────────────────────────────────────────────────┐
│  FRONTEND ciudadano (HTML/CSS/JS vanilla, WCAG 2.1)           │
│  · Wizard determinista (modo → tipo → país → urgencia → plan) │
│  · Flujo B: diagnóstico de 3 errores → veredicto             │
│  · Verificador de firma vigente                              │
│  · Compartir el plan por URL (estado en base64, sin servidor)│
│  · Campo de lenguaje natural OPCIONAL (degradación elegante) │
└───────────────┬──────────────────────────────────────────────┘
                │  (sin datos personales)
                ▼
┌──────────────────────────────────────────────────────────────┐
│  DATOS abiertos (JSON) — la fuente de verdad                  │
│  cadenas.json · flujo.json · paises.json · tips.json ·        │
│  glosario.json · firmas_demo.json                            │
└───────────────┬──────────────────────────────────────────────┘
                │  (solo verificador / clasificador)
                ▼
┌──────────────────────────────────────────────────────────────┐
│  Cloudflare Pages Functions (functions/api/*) — opcional      │
│  · /api/verificar-firma → KV privado (o demo); 1 resultado    │
│  · /api/clasificar      → Workers AI (binding AI)             │
└──────────────────────────────────────────────────────────────┘
```

## Decisiones clave

### 1. Wizard, no chatbot
El dominio **es** un árbol de decisión legal. Un wizard de preguntas cerradas: (a) no alucina, (b) es
accesible por diseño (radios/botones), (c) no invita a pegar datos personales, (d) es **determinista**
en la demo. La capa conversacional queda como acelerador opcional (`clasificador.js` + `/api/clasificar`).

### 2. Dirigido por datos
`wizard.js` no tiene pantallas hardcodeadas para cada documento: lee `flujo.json` (categorías y
desambiguación) y `cadenas.json` (pasos y ramificación). Agregar un tipo de documento = editar JSON.

`App.pasosEfectivos(cadena, subtipo)` filtra los pasos por `solo_subtipo` y los renumera, de modo que
una misma cadena sirve para todas sus variantes (p. ej. notarial vía Junta de Decanos vs Colegio).

### 3. Sin lock-in (criterio de apertura)
El núcleo (wizard + datos) es **100% portable**: funciona abriendo el HTML, en cualquier servidor
estático (GitHub Pages, Netlify) o en Cloudflare Pages. Las Functions de Cloudflare **solo añaden**
automatización; sin ellas, el frontend degrada con gracia:
- `verificarFirma()` → si el endpoint falla, usa `firmas_demo.json` local.
- `clasificarTexto()` → si no hay IA, usa el clasificador local por palabras clave.

### 4. Privacidad por diseño
- Estado del wizard = `{ modo, categoria, cadenaId, subtipo, paisKey, urgente }`. Cero datos personales.
- Compartir = `btoa(JSON.stringify(estado))` en el hash de la URL. No hay backend de almacenamiento.
- El verificador se sirve por Function (consulta → 1 resultado) para **no exponer la lista** de firmas.

## Navegación y estado (`app.js`)

- `App.go(step, patch)` apila el estado actual (para "Atrás") y aplica un *patch* inmutable.
- `App.back()` restaura el estado anterior desde la pila.
- `App.steps` es un registro `{ nombrePaso: render(stage, state) }` que llenan los módulos.
- Carga de datos: usa `window.APOSTILLA_DATA` (bundle) si existe; si no, `fetch` de los `.json`.
- Accesibilidad: al cambiar de paso, mueve el foco al encabezado y anuncia por `aria-live`.

## Rendimiento y costo

Sitio estático + JSON (pocos KB). Sin base de datos. Las Functions son *serverless* y solo se invocan
en el verificador/clasificador. Encaja con "sin infraestructura de alto costo".
